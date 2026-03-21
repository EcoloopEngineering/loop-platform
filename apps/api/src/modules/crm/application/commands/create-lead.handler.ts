import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { CreateLeadDto } from '../dto/create-lead.dto';
import { LeadCreatedEvent } from '../../domain/events/lead-created.event';
import { LeadScoringDomainService } from '../../domain/services/lead-scoring.domain-service';
import { LEAD_REPOSITORY, LeadRepositoryPort } from '../ports/lead.repository.port';
import { CUSTOMER_REPOSITORY, CustomerRepositoryPort } from '../ports/customer.repository.port';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

export class CreateLeadCommand {
  constructor(
    public readonly dto: CreateLeadDto,
    public readonly userId: string,
  ) {}
}

@CommandHandler(CreateLeadCommand)
export class CreateLeadHandler implements ICommandHandler<CreateLeadCommand> {
  private readonly logger = new Logger(CreateLeadHandler.name);

  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leadRepo: LeadRepositoryPort,
    @Inject(CUSTOMER_REPOSITORY) private readonly customerRepo: CustomerRepositoryPort,
    private readonly prisma: PrismaService,
    private readonly scoringService: LeadScoringDomainService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateLeadCommand): Promise<any> {
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
    const property = await this.prisma.property.create({
      data: {
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
      },
    });

    // 3. Find default pipeline
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { isDefault: true },
    });

    if (!pipeline) {
      throw new Error('No default pipeline found. Please create a pipeline first.');
    }

    // 4. Create Lead
    const lead = await this.leadRepo.create({
      customerId: customer.id,
      propertyId: property.id,
      pipelineId: pipeline.id,
      source: contact.source,
      currentStage: 'NEW_LEAD',
    });

    // 5. Calculate score
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

    // 6. Create LeadAssignment
    await this.prisma.leadAssignment.create({
      data: {
        leadId: lead.id,
        userId,
        splitPct: 100,
        isPrimary: true,
      },
    });

    // 7. Create design request if applicable
    if (design.designType) {
      await this.prisma.designRequest.create({
        data: {
          leadId: lead.id,
          designType: design.designType,
          notes: design.designNotes,
        },
      });
    }

    // 8. Log activity
    await this.prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId,
        type: 'STAGE_CHANGE',
        description: 'Lead created via wizard',
        metadata: { stage: 'NEW_LEAD', source: contact.source },
      },
    });

    // 9. Publish domain event
    this.eventBus.publish(new LeadCreatedEvent(lead.id, customer.id, userId));

    this.logger.log(`Lead ${lead.id} created successfully`);

    return this.leadRepo.findByIdWithRelations(lead.id);
  }
}
