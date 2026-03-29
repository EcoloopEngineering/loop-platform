import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  TaskRepositoryPort,
  TaskFilter,
  TaskWithAssignee,
} from '../../application/ports/task.repository.port';
import { CreateTaskDto } from '../../application/dto/create-task.dto';

const ASSIGNEE_SELECT = {
  select: { id: true, firstName: true, lastName: true, email: true },
};

@Injectable()
export class PrismaTaskRepository implements TaskRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter: TaskFilter): Promise<TaskWithAssignee[]> {
    const where: any = {};
    if (filter.leadId) where.leadId = filter.leadId;
    if (filter.assigneeId) where.assigneeId = filter.assigneeId;
    if (filter.status) where.status = filter.status;

    return this.prisma.task.findMany({
      where,
      include: {
        assignee: ASSIGNEE_SELECT,
        lead: {
          select: {
            id: true,
            currentStage: true,
            customer: { select: { firstName: true, lastName: true } },
          },
        },
        subtasks: true,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async findById(id: string): Promise<TaskWithAssignee | null> {
    return this.prisma.task.findUnique({
      where: { id },
      include: {
        assignee: ASSIGNEE_SELECT,
        lead: {
          select: {
            id: true,
            currentStage: true,
            customer: { select: { firstName: true, lastName: true } },
          },
        },
        subtasks: {
          include: { assignee: ASSIGNEE_SELECT },
          orderBy: { priority: 'desc' },
        },
        parentTask: { select: { id: true, title: true } },
      },
    });
  }

  async findByIdSimple(id: string): Promise<TaskWithAssignee | null> {
    return this.prisma.task.findUnique({ where: { id } });
  }

  async create(dto: CreateTaskDto): Promise<TaskWithAssignee> {
    return this.prisma.task.create({
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
      include: { assignee: ASSIGNEE_SELECT },
    });
  }

  async update(id: string, data: Record<string, any>): Promise<TaskWithAssignee> {
    return this.prisma.task.update({
      where: { id },
      data,
      include: { assignee: ASSIGNEE_SELECT },
    });
  }

  async complete(id: string, userId: string): Promise<TaskWithAssignee> {
    return this.prisma.task.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        completedById: userId,
      },
      include: {
        assignee: ASSIGNEE_SELECT,
        lead: { select: { id: true, currentStage: true } },
      },
    });
  }

  async cancel(id: string): Promise<TaskWithAssignee> {
    return this.prisma.task.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}
