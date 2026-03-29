import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Inject,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole, LeadStage } from '@loop/shared';
import { CreateLeadDto } from '../application/dto/create-lead.dto';
import { LeadFilterDto } from '../application/dto/lead-filter.dto';
import { LeadResponseDto } from '../application/dto/lead-response.dto';
import { CreateLeadCommand } from '../application/commands/create-lead.command';
import { ListLeadsQuery } from '../application/queries/list-leads.handler';
import { LEAD_REPOSITORY, LeadRepositoryPort } from '../application/ports/lead.repository.port';
import { LeadScoringDomainService } from '../domain/services/lead-scoring.domain-service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  LeadUpdatedPayload,
  LeadStageChangedPayload,
  LeadStatusChangedPayload,
} from '../application/events/lead-events.types';

@ApiTags('Leads')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Controller('leads')
export class LeadsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    @Inject(LEAD_REPOSITORY) private readonly leadRepo: LeadRepositoryPort,
    private readonly scoringService: LeadScoringDomainService,
    private readonly prisma: PrismaService,
    private readonly emitter: EventEmitter2,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Create a new lead from wizard' })
  @ApiResponse({ status: 201, type: LeadResponseDto })
  async create(
    @Body() dto: CreateLeadDto,
    @CurrentUser('id') userId: string,
  ): Promise<unknown> {
    return this.commandBus.execute(new CreateLeadCommand(dto, userId));
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'List leads with filters and pagination' })
  async list(@Query() filter: LeadFilterDto): Promise<unknown> {
    return this.queryBus.execute(new ListLeadsQuery(filter));
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Get lead detail with score, assignments, and activities' })
  @ApiResponse({ status: 200, type: LeadResponseDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<unknown> {
    const lead = await this.leadRepo.findByIdWithRelations(id);
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Update a lead' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: Record<string, unknown>,
    @CurrentUser('id') userId: string,
  ): Promise<unknown> {
    const existing = await this.leadRepo.findById(id);
    if (!existing) throw new NotFoundException('Lead not found');

    const updated = await this.leadRepo.update(id, data as any);

    const [lead, currentUser] = await Promise.all([
      this.prisma.lead.findUnique({
        where: { id },
        include: { customer: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      }),
    ]);

    if (lead && currentUser) {
      const payload: LeadUpdatedPayload = {
        leadId: id,
        customerName: `${lead.customer.firstName} ${lead.customer.lastName}`,
        updatedByName: `${currentUser.firstName} ${currentUser.lastName}`,
        changes: Object.keys(data).join(', '),
      };
      this.emitter.emit('lead.updated', payload);
    }

    return updated;
  }

  @Patch(':id/metadata')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Update lead metadata fields (merge)' })
  async updateMetadata(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: Record<string, unknown>,
    @CurrentUser('id') userId: string,
  ): Promise<unknown> {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');

    const currentMeta = (lead.metadata as Record<string, unknown>) ?? {};
    const merged = { ...currentMeta, ...data };

    const updated = await this.prisma.lead.update({
      where: { id },
      data: { metadata: merged },
    });

    await this.prisma.leadActivity.create({
      data: {
        leadId: id,
        userId,
        type: 'STAGE_CHANGE',
        description: `Updated fields: ${Object.keys(data).join(', ')}`,
        metadata: { fields: Object.keys(data), values: data },
      },
    }).catch(() => {});

    return updated;
  }

  @Patch(':id/stage')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Change lead stage' })
  async changeStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('stage') stage: LeadStage,
    @CurrentUser('id') userId: string,
  ): Promise<unknown> {
    const existing = await this.leadRepo.findById(id);
    if (!existing) throw new NotFoundException('Lead not found');

    const fromStage = existing.currentStage;
    const updated = await this.leadRepo.updateStage(id, stage);

    await this.prisma.leadActivity.create({
      data: {
        leadId: id,
        userId,
        type: 'STAGE_CHANGE',
        description: `Stage changed from ${fromStage} to ${stage}`,
        metadata: { fromStage, toStage: stage },
      },
    });

    const leadWithCustomer = await this.prisma.lead.findUnique({
      where: { id },
      include: { customer: { select: { firstName: true, lastName: true } } },
    });

    if (leadWithCustomer) {
      const payload: LeadStageChangedPayload = {
        leadId: id,
        customerName: `${leadWithCustomer.customer.firstName} ${leadWithCustomer.customer.lastName}`,
        previousStage: fromStage,
        newStage: stage,
      };
      this.emitter.emit('lead.stageChanged', payload);
    }

    return updated;
  }

  @Patch(':id/lost')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Mark lead as lost' })
  async markAsLost(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @CurrentUser('id') userId: string,
  ): Promise<unknown> {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: { customer: { select: { firstName: true, lastName: true } } },
    });
    if (!lead) throw new NotFoundException('Lead not found');

    const updated = await this.prisma.lead.update({
      where: { id },
      data: { status: 'LOST', lostAt: new Date(), lostReason: reason ?? null },
    });

    await this.prisma.leadActivity.create({
      data: {
        leadId: id,
        userId,
        type: 'STAGE_CHANGE',
        description: `Lead marked as LOST${reason ? `: ${reason}` : ''}`,
        metadata: { status: 'LOST', stage: lead.currentStage, reason },
      },
    });

    const payload: LeadStatusChangedPayload = {
      leadId: id,
      customerName: `${lead.customer.firstName} ${lead.customer.lastName}`,
      newStatus: 'LOST',
      previousStage: lead.currentStage,
    };
    this.emitter.emit('lead.statusChanged', payload);

    return updated;
  }

  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Mark lead as cancelled' })
  async markAsCancelled(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @CurrentUser('id') userId: string,
  ): Promise<unknown> {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: { customer: { select: { firstName: true, lastName: true } } },
    });
    if (!lead) throw new NotFoundException('Lead not found');

    const updated = await this.prisma.lead.update({
      where: { id },
      data: { status: 'CANCELLED', lostAt: new Date(), lostReason: reason ?? null },
    });

    await this.prisma.leadActivity.create({
      data: {
        leadId: id,
        userId,
        type: 'STAGE_CHANGE',
        description: `Lead cancelled${reason ? `: ${reason}` : ''}`,
        metadata: { status: 'CANCELLED', stage: lead.currentStage, reason },
      },
    });

    const payload: LeadStatusChangedPayload = {
      leadId: id,
      customerName: `${lead.customer.firstName} ${lead.customer.lastName}`,
      newStatus: 'CANCELLED',
      previousStage: lead.currentStage,
    };
    this.emitter.emit('lead.statusChanged', payload);

    return updated;
  }

  @Post(':id/score/recalculate')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Recalculate lead score' })
  async recalculateScore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<unknown> {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: { customer: true, property: true },
    });
    if (!lead) throw new NotFoundException('Lead not found');

    const scoreBreakdown = this.scoringService.calculate({
      email: lead.customer.email,
      phone: lead.customer.phone,
      firstName: lead.customer.firstName,
      lastName: lead.customer.lastName,
      source: lead.source,
      streetAddress: lead.property.streetAddress,
      latitude: lead.property.latitude,
      longitude: lead.property.longitude,
      electricalService: lead.property.electricalService,
      hasPool: lead.property.hasPool,
      hasEV: lead.property.hasEV,
      propertyType: lead.property.propertyType,
      roofCondition: lead.property.roofCondition,
      monthlyBill: lead.property.monthlyBill ? Number(lead.property.monthlyBill) : null,
      annualKwhUsage: lead.property.annualKwhUsage ? Number(lead.property.annualKwhUsage) : null,
      utilityProvider: lead.property.utilityProvider,
    });

    const score = await this.prisma.leadScore.upsert({
      where: { leadId: id },
      update: {
        totalScore: scoreBreakdown.totalScore,
        roofScore: scoreBreakdown.roofScore,
        energyScore: scoreBreakdown.energyScore,
        contactScore: scoreBreakdown.contactScore,
        propertyScore: scoreBreakdown.propertyScore,
        calculatedAt: new Date(),
      },
      create: {
        leadId: id,
        totalScore: scoreBreakdown.totalScore,
        roofScore: scoreBreakdown.roofScore,
        energyScore: scoreBreakdown.energyScore,
        contactScore: scoreBreakdown.contactScore,
        propertyScore: scoreBreakdown.propertyScore,
      },
    });

    await this.prisma.leadActivity.create({
      data: {
        leadId: id,
        userId,
        type: 'SCORE_UPDATED',
        description: `Score recalculated: ${scoreBreakdown.totalScore}`,
        metadata: { ...scoreBreakdown },
      },
    });

    return score;
  }

  @Get(':id/timeline')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Get lead activity timeline' })
  async getTimeline(@Param('id', ParseUUIDPipe) id: string): Promise<unknown> {
    const lead = await this.leadRepo.findById(id);
    if (!lead) throw new NotFoundException('Lead not found');

    return this.prisma.leadActivity.findMany({
      where: { leadId: id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, profileImage: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
