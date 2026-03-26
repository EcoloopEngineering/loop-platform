import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '@loop/shared';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CreateTaskDto, UpdateTaskDto } from '../application/dto/create-task.dto';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Controller('tasks')
export class TaskController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emitter: EventEmitter2,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'List tasks with filters' })
  @ApiQuery({ name: 'leadId', required: false })
  @ApiQuery({ name: 'assigneeId', required: false })
  @ApiQuery({ name: 'status', required: false })
  async list(
    @Query('leadId') leadId?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('status') status?: string,
  ) {
    const where: any = {};
    if (leadId) where.leadId = leadId;
    if (assigneeId) where.assigneeId = assigneeId;
    if (status) where.status = status;

    return this.prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        lead: { select: { id: true, currentStage: true, customer: { select: { firstName: true, lastName: true } } } },
        subtasks: true,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Get task with subtasks' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        lead: { select: { id: true, currentStage: true, customer: { select: { firstName: true, lastName: true } } } },
        subtasks: {
          include: {
            assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
          orderBy: { priority: 'desc' },
        },
        parentTask: { select: { id: true, title: true } },
      },
    });

    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Create a task manually' })
  async create(@Body() dto: CreateTaskDto) {
    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        leadId: dto.leadId,
        assigneeId: dto.assigneeId,
        priority: dto.priority ?? 0,
        parentTaskId: dto.parentTaskId,
        templateKey: dto.templateKey,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        metadata: dto.metadata,
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return task;
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Update a task' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Task not found');

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.assigneeId !== undefined) data.assigneeId = dto.assigneeId;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.dueDate !== undefined) data.dueDate = new Date(dto.dueDate);
    if (dto.metadata !== undefined) data.metadata = dto.metadata;

    return this.prisma.task.update({
      where: { id },
      data,
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  @Patch(':id/complete')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Mark task as completed' })
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Task not found');

    const task = await this.prisma.task.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        completedById: userId,
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        lead: { select: { id: true, currentStage: true } },
      },
    });

    this.emitter.emit('task.completed', {
      taskId: task.id,
      leadId: task.leadId,
      templateKey: task.templateKey,
      completedById: userId,
    });

    return task;
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Soft delete a task (set status to CANCELLED)' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Task not found');

    return this.prisma.task.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}
