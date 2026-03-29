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

    // 1. Create or find Customer
    let customer = await this.customerRepo.findByEmail(contact.email);
    if (!customer) {
      customer = await this.customerRepo.create({
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        source: contact.source,
      });
    }

    // 2. Create Property
    const property = await this.propertyRepo.create({
      customerId: customer.id,
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

    // 3. Find default pipeline
    const pipeline = await this.prisma.pipeline.findFirst({ where: { isDefault: true } });
    if (!pipeline) {
      throw new Error('No default pipeline found. Please create a pipeline first.');
    }

    // 4. Resolve lead owner — external users get their lead assigned to their referrer
    const creatorUser = await this.prisma.user.findUnique({ where: { id: userId } });
    let ownerId = userId;

    if (creatorUser && !creatorUser.email.endsWith('@ecoloop.us')) {
      const referral = await this.prisma.referral.findFirst({
        where: { inviteeId: userId },
        orderBy: { createdAt: 'desc' },
      });
      if (referral) {
        ownerId = referral.inviterId;
        this.logger.log(`External creator ${creatorUser.email} — assigning to referrer ${ownerId}`);
      }
    }

    // 5. Create Lead — AI_DESIGN starts at DESIGN_READY
    const initialStage = design.designType === 'AI_DESIGN' ? 'DESIGN_READY' : 'NEW_LEAD';

    const lead = await this.leadRepo.create({
      customerId: customer.id,
      propertyId: property.id,
      pipelineId: pipeline.id,
      source: contact.source,
      currentStage: initialStage,
      createdById: userId,
    });

    // 6. Calculate and persist score
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

    await this.prisma.leadScore.create({
      data: {
        leadId: lead.id,
        totalScore: scoreBreakdown.totalScore,
        roofScore: scoreBreakdown.roofScore,
        energyScore: scoreBreakdown.energyScore,
        contactScore: scoreBreakdown.contactScore,
        propertyScore: scoreBreakdown.propertyScore,
      },
    });

    // 7. Create primary assignment (owner = creator or referrer)
    await this.prisma.leadAssignment.create({
      data: { leadId: lead.id, userId: ownerId, splitPct: 100, isPrimary: true },
    });

    if (ownerId !== userId) {
      await this.prisma.leadAssignment.create({
        data: { leadId: lead.id, userId, splitPct: 0, isPrimary: false },
      });
    }

    // 8. Create design request if applicable
    if (design.designType) {
      const isAiDesign = design.designType === 'AI_DESIGN';
      const address = `${home.streetAddress}, ${home.city}, ${home.state} ${home.zip}`;

      const designRequest = await this.prisma.designRequest.create({
        data: {
          leadId: lead.id,
          designType: design.designType,
          notes: design.designNotes,
          status: isAiDesign ? 'COMPLETED' : 'PENDING',
          completedAt: isAiDesign ? new Date() : null,
        },
      });

      if (isAiDesign) {
        const aiPayload: AiDesignRequestedPayload = {
          designRequestId: designRequest.id,
          leadId: lead.id,
          propertyAddress: address,
          customerName: `${contact.firstName} ${contact.lastName}`,
          monthlyBill: energy.monthlyBill,
          annualKwhUsage: energy.annualKwhUsage,
          roofCondition: home.roofCondition,
          propertyType: home.propertyType,
          userId,
        };
        this.emitter.emit('design.requested.ai', aiPayload);
        this.logger.log(`AI Design: lead ${lead.id} → DESIGN_READY, Aurora triggered in background`);
      }
    }

    // 9. Log activity
    await this.prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId,
        type: 'STAGE_CHANGE',
        description: `Lead created via wizard${design.designType === 'AI_DESIGN' ? ' (AI Design → Design Ready)' : ''}`,
        metadata: { stage: initialStage, source: contact.source, designType: design.designType },
      },
    });

    // 10. Emit notification event (EventEmitter2 — cross-module, per CLAUDE.md)
    const createdPayload: LeadCreatedPayload = {
      leadId: lead.id,
      assignedTo: ownerId,
      customerName: `${contact.firstName} ${contact.lastName}`,
    };
    this.emitter.emit('lead.created', createdPayload);

    this.logger.log(`Lead ${lead.id} created successfully`);

    return this.leadRepo.findByIdWithRelations(lead.id);
  }
}
