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
import { CommandBus, QueryBus, EventBus } from '@nestjs/cqrs';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole, LeadStage } from '@loop/shared';
import { CreateLeadDto } from '../application/dto/create-lead.dto';
import { LeadFilterDto } from '../application/dto/lead-filter.dto';
import { LeadResponseDto } from '../application/dto/lead-response.dto';
import { CreateLeadCommand } from '../application/commands/create-lead.handler';
import { ListLeadsQuery } from '../application/queries/list-leads.handler';
import { LEAD_REPOSITORY, LeadRepositoryPort } from '../application/ports/lead.repository.port';
import { LeadScoringDomainService } from '../domain/services/lead-scoring.domain-service';
import { LeadStageChangedEvent } from '../domain/events/lead-stage-changed.event';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@ApiTags('Leads')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Controller('leads')
export class LeadsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly eventBus: EventBus,
    @Inject(LEAD_REPOSITORY) private readonly leadRepo: LeadRepositoryPort,
    private readonly scoringService: LeadScoringDomainService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Create a new lead from wizard' })
  @ApiResponse({ status: 201, type: LeadResponseDto })
  async create(
    @Body() dto: CreateLeadDto,
    @CurrentUser('id') userId: string,
  ): Promise<any> {
    return this.commandBus.execute(new CreateLeadCommand(dto, userId));
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'List leads with filters and pagination' })
  async list(@Query() filter: LeadFilterDto): Promise<any> {
    return this.queryBus.execute(new ListLeadsQuery(filter));
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Get lead detail with score, assignments, and activities' })
  @ApiResponse({ status: 200, type: LeadResponseDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<any> {
    const lead = await this.leadRepo.findByIdWithRelations(id);
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Update a lead' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: any,
  ): Promise<any> {
    const existing = await this.leadRepo.findById(id);
    if (!existing) throw new NotFoundException('Lead not found');
    return this.leadRepo.update(id, data);
  }

  @Patch(':id/stage')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Change lead stage' })
  async changeStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('stage') stage: LeadStage,
    @CurrentUser('id') userId: string,
  ): Promise<any> {
    const existing = await this.leadRepo.findById(id);
    if (!existing) throw new NotFoundException('Lead not found');

    const fromStage = existing.currentStage;
    const updated = await this.leadRepo.updateStage(id, stage);

    // Log activity
    await this.prisma.leadActivity.create({
      data: {
        leadId: id,
        userId,
        type: 'STAGE_CHANGE',
        description: `Stage changed from ${fromStage} to ${stage}`,
        metadata: { fromStage, toStage: stage },
      },
    });

    this.eventBus.publish(new LeadStageChangedEvent(id, fromStage, stage, userId));

    return updated;
  }

  @Post(':id/score/recalculate')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Recalculate lead score' })
  async recalculateScore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<any> {
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
      monthlyBill: lead.property.monthlyBill
        ? Number(lead.property.monthlyBill)
        : null,
      annualKwhUsage: lead.property.annualKwhUsage
        ? Number(lead.property.annualKwhUsage)
        : null,
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

    // Log activity
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
  async getTimeline(@Param('id', ParseUUIDPipe) id: string): Promise<any> {
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

  @Post(':id/notes')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Add a note to lead' })
  async addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('content') content: string,
    @CurrentUser('id') userId: string,
  ): Promise<any> {
    const lead = await this.leadRepo.findById(id);
    if (!lead) throw new NotFoundException('Lead not found');

    return this.prisma.leadActivity.create({
      data: {
        leadId: id,
        userId,
        type: 'NOTE_ADDED',
        description: content,
      },
    });
  }

  @Post(':id/assign')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Assign a user to a lead' })
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('userId', ParseUUIDPipe) assigneeId: string,
    @Body('splitPct') splitPct: number,
    @Body('isPrimary') isPrimary: boolean,
    @CurrentUser('id') userId: string,
  ): Promise<any> {
    const lead = await this.leadRepo.findById(id);
    if (!lead) throw new NotFoundException('Lead not found');

    const assignment = await this.prisma.leadAssignment.upsert({
      where: {
        leadId_userId: { leadId: id, userId: assigneeId },
      },
      update: {
        splitPct: splitPct ?? 100,
        isPrimary: isPrimary ?? false,
      },
      create: {
        leadId: id,
        userId: assigneeId,
        splitPct: splitPct ?? 100,
        isPrimary: isPrimary ?? false,
      },
    });

    // Log activity
    await this.prisma.leadActivity.create({
      data: {
        leadId: id,
        userId,
        type: 'ASSIGNMENT_CHANGED',
        description: `User ${assigneeId} assigned to lead`,
        metadata: { assigneeId, splitPct, isPrimary },
      },
    });

    return assignment;
  }
}
