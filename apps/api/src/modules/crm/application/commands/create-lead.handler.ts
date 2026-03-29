import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateLeadCommand } from './create-lead.command';
import { LeadScoringDomainService } from '../../domain/services/lead-scoring.domain-service';
import { LEAD_REPOSITORY, LeadRepositoryPort } from '../ports/lead.repository.port';
import { CUSTOMER_REPOSITORY, CustomerRepositoryPort } from '../ports/customer.repository.port';
import { PROPERTY_REPOSITORY, PropertyRepositoryPort } from '../ports/property.repository.port';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { LeadCreatedPayload, AiDesignRequestedPayload } from '../events/lead-events.types';
import { LeadDetail } from '../dto/lead-data.types';

export { CreateLeadCommand };

@CommandHandler(CreateLeadCommand)
export class CreateLeadHandler implements ICommandHandler<CreateLeadCommand> {
  private readonly logger = new Logger(CreateLeadHandler.name);

  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leadRepo: LeadRepositoryPort,
    @Inject(CUSTOMER_REPOSITORY) private readonly customerRepo: CustomerRepositoryPort,
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepo: PropertyRepositoryPort,
    private readonly prisma: PrismaService,
    private readonly scoringService: LeadScoringDomainService,
    private readonly emitter: EventEmitter2,
  ) {}

  async execute(command: CreateLeadCommand): Promise<LeadDetail | null> {
    const { dto, userId } = command;
    const { contact, home, energy, design } = dto;

    this.logger.log(`Creating lead for ${contact.firstName} ${contact.lastName}`);

    const customer = await this.resolveCustomer(contact);
    const property = await this.createProperty(home, energy, customer.id);
    const pipeline = await this.findDefaultPipeline();
    const ownerId = await this.resolveOwner(userId);
    const initialStage = design.designType === 'AI_DESIGN' ? 'DESIGN_READY' : 'NEW_LEAD';

    const lead = await this.leadRepo.create({
      customerId: customer.id,
      propertyId: property.id,
      pipelineId: pipeline.id,
      source: contact.source,
      currentStage: initialStage,
      createdById: userId,
    });

    const scoreBreakdown = this.scoringService.calculate({
      email: contact.email,
      phone: contact.phone,
      firstName: contact.firstName,
      lastName: contact.lastName,
      source: contact.source,
      streetAddress: home.streetAddress,
      latitude: home.latitude,
      longitude: home.longitude,
      electricalService: home.electricalService,
      hasPool: home.hasPool,
      hasEV: home.hasEV,
      propertyType: home.propertyType,
      roofCondition: home.roofCondition,
      monthlyBill: energy.monthlyBill,
      annualKwhUsage: energy.annualKwhUsage,
      utilityProvider: energy.utilityProvider,
    });

    const txResult = await this.executeTransaction(
      lead.id, scoreBreakdown, ownerId, userId, design, initialStage, contact.source,
    );

    this.emitEvents(lead.id, dto, txResult.designRequest, ownerId, userId);

    this.logger.log(`Lead ${lead.id} created successfully`);
    return this.leadRepo.findByIdWithRelations(lead.id);
  }

  private async resolveCustomer(contact: {
    firstName: string; lastName: string; email: string; phone?: string; source?: string;
  }): Promise<{ id: string }> {
    const existing = await this.customerRepo.findByEmail(contact.email);
    if (existing) return existing;

    return this.customerRepo.create({
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      source: contact.source,
    });
  }

  private async createProperty(
    home: Record<string, any>,
    energy: Record<string, any>,
    customerId: string,
  ): Promise<{ id: string }> {
    return this.propertyRepo.create({
      customerId,
      propertyType: home.propertyType,
      streetAddress: home.streetAddress,
      city: home.city,
      state: home.state,
      zip: home.zip,
      latitude: home.latitude,
      longitude: home.longitude,
      roofCondition: home.roofCondition,
      electricalService: home.electricalService,
      hasPool: home.hasPool,
      hasEV: home.hasEV,
      monthlyBill: energy.monthlyBill,
      annualKwhUsage: energy.annualKwhUsage,
      utilityProvider: energy.utilityProvider,
    });
  }

  private async findDefaultPipeline(): Promise<{ id: string }> {
    const pipeline = await this.prisma.pipeline.findFirst({ where: { isDefault: true } });
    if (!pipeline) {
      throw new Error('No default pipeline found. Please create a pipeline first.');
    }
    return pipeline;
  }

  private async resolveOwner(userId: string): Promise<string> {
    const creatorUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!creatorUser || creatorUser.email.endsWith('@ecoloop.us')) {
      return userId;
    }

    const referral = await this.prisma.referral.findFirst({
      where: { inviteeId: userId },
      orderBy: { createdAt: 'desc' },
    });

    if (referral) {
      this.logger.log(`External creator ${creatorUser.email} — assigning to referrer ${referral.inviterId}`);
      return referral.inviterId;
    }

    return userId;
  }

  private async executeTransaction(
    leadId: string,
    scoreBreakdown: { totalScore: number; roofScore: number; energyScore: number; contactScore: number; propertyScore: number },
    ownerId: string,
    userId: string,
    design: { designType?: string; designNotes?: string },
    initialStage: string,
    source: string,
  ): Promise<{ designRequest: { id: string } | null }> {
    return this.prisma.$transaction(async (tx) => {
      await tx.leadScore.create({
        data: {
          leadId,
          totalScore: scoreBreakdown.totalScore,
          roofScore: scoreBreakdown.roofScore,
          energyScore: scoreBreakdown.energyScore,
          contactScore: scoreBreakdown.contactScore,
          propertyScore: scoreBreakdown.propertyScore,
        },
      });

      await tx.leadAssignment.create({
        data: { leadId, userId: ownerId, splitPct: 100, isPrimary: true },
      });

      if (ownerId !== userId) {
        await tx.leadAssignment.create({
          data: { leadId, userId, splitPct: 0, isPrimary: false },
        });
      }

      let designRequest: { id: string } | null = null;
      if (design.designType) {
        const isAiDesign = design.designType === 'AI_DESIGN';
        designRequest = await tx.designRequest.create({
          data: {
            leadId,
            designType: design.designType as any,
            notes: design.designNotes,
            status: isAiDesign ? 'COMPLETED' : 'PENDING',
            completedAt: isAiDesign ? new Date() : null,
          },
        });
      }

      await tx.leadActivity.create({
        data: {
          leadId,
          userId,
          type: 'STAGE_CHANGE',
          description: `Lead created via wizard${design.designType === 'AI_DESIGN' ? ' (AI Design → Design Ready)' : ''}`,
          metadata: { stage: initialStage, source, designType: design.designType },
        },
      });

      return { designRequest };
    });
  }

  private emitEvents(
    leadId: string,
    dto: { contact: any; home: any; energy: any; design: any },
    designRequest: { id: string } | null,
    ownerId: string,
    userId: string,
  ): void {
    const { contact, home, energy, design } = dto;

    if (design.designType === 'AI_DESIGN' && designRequest) {
      const address = `${home.streetAddress}, ${home.city}, ${home.state} ${home.zip}`;
      const aiPayload: AiDesignRequestedPayload = {
        designRequestId: designRequest.id,
        leadId,
        propertyAddress: address,
        customerName: `${contact.firstName} ${contact.lastName}`,
        monthlyBill: energy.monthlyBill,
        annualKwhUsage: energy.annualKwhUsage,
        roofCondition: home.roofCondition,
        propertyType: home.propertyType,
        userId,
      };
      this.emitter.emit('design.requested.ai', aiPayload);
      this.logger.log(`AI Design: lead ${leadId} → DESIGN_READY, Aurora triggered in background`);
    }

    const createdPayload: LeadCreatedPayload = {
      leadId,
      assignedTo: ownerId,
      customerName: `${contact.firstName} ${contact.lastName}`,
    };
    this.emitter.emit('lead.created', createdPayload);
  }
}
