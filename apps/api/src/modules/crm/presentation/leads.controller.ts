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
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole, LeadStage } from '@loop/shared';
import { CreateLeadDto } from '../application/dto/create-lead.dto';
import { LeadFilterDto } from '../application/dto/lead-filter.dto';
import { LeadResponseDto } from '../application/dto/lead-response.dto';
import { CreateLeadCommand } from '../application/commands/create-lead.command';
import { ChangeLeadStageCommand } from '../application/commands/change-lead-stage.command';
import { MarkLeadLostCommand } from '../application/commands/mark-lead-lost.command';
import { MarkLeadCancelledCommand } from '../application/commands/mark-lead-cancelled.command';
import { UpdateLeadMetadataCommand } from '../application/commands/update-lead-metadata.command';
import { ListLeadsQuery } from '../application/queries/list-leads.handler';
import { LEAD_REPOSITORY, LeadRepositoryPort } from '../application/ports/lead.repository.port';
import { LeadScoringAppService } from '../application/services/lead-scoring-app.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LeadUpdatedPayload } from '../application/events/lead-events.types';
import { UpdateLeadData } from '../application/dto/lead-data.types';

@ApiTags('Leads')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Controller('leads')
export class LeadsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    @Inject(LEAD_REPOSITORY) private readonly leadRepo: LeadRepositoryPort,
    private readonly leadScoringAppService: LeadScoringAppService,
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
    @Body() data: UpdateLeadData,
    @CurrentUser('id') userId: string,
  ): Promise<unknown> {
    const existing = await this.leadRepo.findById(id);
    if (!existing) throw new NotFoundException('Lead not found');

    const updated = await this.leadRepo.update(id, data);

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
    return this.commandBus.execute(new UpdateLeadMetadataCommand(id, data, userId));
  }

  @Patch(':id/stage')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Change lead stage' })
  async changeStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('stage') stage: LeadStage,
    @CurrentUser('id') userId: string,
  ): Promise<unknown> {
    return this.commandBus.execute(new ChangeLeadStageCommand(id, stage, userId));
  }

  @Patch(':id/lost')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Mark lead as lost' })
  async markAsLost(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @CurrentUser('id') userId: string,
  ): Promise<unknown> {
    return this.commandBus.execute(new MarkLeadLostCommand(id, reason, userId));
  }

  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Mark lead as cancelled' })
  async markAsCancelled(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @CurrentUser('id') userId: string,
  ): Promise<unknown> {
    return this.commandBus.execute(new MarkLeadCancelledCommand(id, reason, userId));
  }

  @Post(':id/score/recalculate')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Recalculate lead score' })
  async recalculateScore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<unknown> {
    return this.leadScoringAppService.recalculateScore(id, userId);
  }

  @Get(':id/timeline')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Get lead activity timeline' })
  async getTimeline(@Param('id', ParseUUIDPipe) id: string): Promise<unknown> {
    return this.leadScoringAppService.getTimeline(id);
  }
}
