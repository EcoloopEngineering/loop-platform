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
import { EventEmitter2 } from '@nestjs/event-emitter';

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
    private readonly emitter: EventEmitter2,
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
    @CurrentUser('id') userId: string,
  ): Promise<any> {
    const existing = await this.leadRepo.findById(id);
    if (!existing) throw new NotFoundException('Lead not found');

    const updated = await this.leadRepo.update(id, data);

    // Emit notification event
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: { customer: { select: { firstName: true, lastName: true } } },
    });
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    if (lead && currentUser) {
      const changedFields = Object.keys(data).join(', ');
      this.emitter.emit('lead.updated', {
        leadId: id,
        customerName: `${lead.customer.firstName} ${lead.customer.lastName}`,
        updatedByName: `${currentUser.firstName} ${currentUser.lastName}`,
        changes: changedFields,
      });
    }

    return updated;
  }

  @Patch(':id/metadata')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Update lead metadata fields (merge)' })
  async updateMetadata(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: Record<string, any>,
    @CurrentUser('id') userId: string,
  ): Promise<any> {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');

    const currentMeta = (lead.metadata as Record<string, any>) ?? {};
    const merged = { ...currentMeta, ...data };

    const updated = await this.prisma.lead.update({
      where: { id },
      data: { metadata: merged },
    });

    // Log activity
    const changedFields = Object.keys(data).join(', ');
    await this.prisma.leadActivity.create({
      data: {
        leadId: id,
        userId,
        type: 'STAGE_CHANGE',
        description: `Updated fields: ${changedFields}`,
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

    // Emit event for notifications (notifies all stakeholders)
    const leadWithCustomer = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        customer: { select: { firstName: true, lastName: true } },
      },
    });

    if (leadWithCustomer) {
      this.emitter.emit('lead.stageChanged', {
        leadId: id,
        customerName: `${leadWithCustomer.customer.firstName} ${leadWithCustomer.customer.lastName}`,
        previousStage: fromStage,
        newStage: stage,
      });
    }

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

    const activity = await this.prisma.leadActivity.create({
      data: {
        leadId: id,
        userId,
        type: 'NOTE_ADDED',
        description: content,
      },
    });

    // Emit notification event
    const leadWithCustomer = await this.prisma.lead.findUnique({
      where: { id },
      include: { customer: { select: { firstName: true, lastName: true } } },
    });
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    if (leadWithCustomer && currentUser) {
      const preview = content.length > 80 ? content.substring(0, 80) + '...' : content;
      this.emitter.emit('lead.noteAdded', {
        leadId: id,
        customerName: `${leadWithCustomer.customer.firstName} ${leadWithCustomer.customer.lastName}`,
        addedByName: `${currentUser.firstName} ${currentUser.lastName}`,
        notePreview: preview,
      });
    }

    return activity;
  }

  @Put(':id/notes/:noteId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Edit a note on lead' })
  async editNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @Body('content') content: string,
    @CurrentUser('id') userId: string,
  ): Promise<any> {
    const existing = await this.prisma.leadActivity.findFirst({
      where: { id: noteId, leadId: id, type: 'NOTE_ADDED' },
    });
    if (!existing) throw new NotFoundException('Note not found');

    const oldContent = existing.description;
    const updated = await this.prisma.leadActivity.update({
      where: { id: noteId },
      data: { description: content, metadata: { editedAt: new Date().toISOString(), previousContent: oldContent } },
    });

    // Log the edit as activity
    await this.prisma.leadActivity.create({
      data: {
        leadId: id,
        userId,
        type: 'NOTE_ADDED',
        description: `Note edited (was: "${oldContent?.substring(0, 50)}...")`,
        metadata: { action: 'note_edited', noteId, oldContent, newContent: content },
      },
    });

    return updated;
  }

  @Patch(':id/notes/:noteId/delete')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Delete a note from lead (soft — logged in activity)' })
  async deleteNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @CurrentUser('id') userId: string,
  ): Promise<any> {
    const existing = await this.prisma.leadActivity.findFirst({
      where: { id: noteId, leadId: id, type: 'NOTE_ADDED' },
    });
    if (!existing) throw new NotFoundException('Note not found');

    // Soft delete: clear description and mark as deleted in metadata
    await this.prisma.leadActivity.update({
      where: { id: noteId },
      data: { description: '[deleted]', metadata: { deleted: true, deletedContent: existing.description, deletedAt: new Date().toISOString() } },
    });

    // Log deletion in activity
    await this.prisma.leadActivity.create({
      data: {
        leadId: id,
        userId,
        type: 'NOTE_ADDED',
        description: `Note deleted (was: "${existing.description?.substring(0, 50)}...")`,
        metadata: { action: 'note_deleted', noteId, deletedContent: existing.description },
      },
    });

    return { success: true };
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

    // Emit notification event
    const leadWithCustomer = await this.prisma.lead.findUnique({
      where: { id },
      include: { customer: { select: { firstName: true, lastName: true } } },
    });
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    if (leadWithCustomer && currentUser) {
      this.emitter.emit('lead.assigned', {
        leadId: id,
        assigneeId,
        customerName: `${leadWithCustomer.customer.firstName} ${leadWithCustomer.customer.lastName}`,
        assignedByName: `${currentUser.firstName} ${currentUser.lastName}`,
        isPrimary: isPrimary ?? false,
      });
    }

    return assignment;
  }

  @Post(':id/assign-pm')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Assign or remove a Project Manager from a lead' })
  async assignPM(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('projectManagerId') pmId: string | null,
    @CurrentUser('id') userId: string,
  ): Promise<any> {
    // Get previous PM before updating
    const previousLead = await this.prisma.lead.findUnique({
      where: { id },
      select: { projectManagerId: true },
    });

    const lead = await this.prisma.lead.update({
      where: { id },
      data: { projectManagerId: pmId || null },
      include: {
        projectManager: true,
        customer: { select: { firstName: true, lastName: true } },
      },
    });

    const desc = pmId
      ? `Project Manager assigned: ${lead.projectManager?.firstName} ${lead.projectManager?.lastName}`
      : 'Project Manager removed';

    await this.prisma.leadActivity.create({
      data: {
        leadId: id,
        userId,
        type: 'ASSIGNMENT_CHANGED',
        description: desc,
        metadata: { projectManagerId: pmId },
      },
    });

    // Emit notification events
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    const customerName = `${lead.customer.firstName} ${lead.customer.lastName}`;

    if (currentUser) {
      if (pmId) {
        // PM was assigned
        this.emitter.emit('lead.pmAssigned', {
          leadId: id,
          pmId,
          pmName: `${lead.projectManager?.firstName} ${lead.projectManager?.lastName}`,
          customerName,
          assignedByName: `${currentUser.firstName} ${currentUser.lastName}`,
        });
      } else if (previousLead?.projectManagerId) {
        // PM was removed
        this.emitter.emit('lead.pmRemoved', {
          leadId: id,
          pmId: previousLead.projectManagerId,
          customerName,
          removedByName: `${currentUser.firstName} ${currentUser.lastName}`,
        });
      }
    }

    return lead;
  }
}
