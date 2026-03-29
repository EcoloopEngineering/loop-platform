import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { CreateTaskTemplateDto, UpdateTaskTemplateDto } from '../dto/create-task-template.dto';

export interface TaskTemplateFilter {
  stage?: string;
}

@Injectable()
export class TaskTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: TaskTemplateFilter = {}) {
    const where: TaskTemplateFilter = {};
    if (filter.stage) where.stage = filter.stage;

    return this.prisma.taskTemplate.findMany({
      where,
      orderBy: [{ stage: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async create(dto: CreateTaskTemplateDto) {
    return this.prisma.taskTemplate.create({
      data: {
        stage: dto.stage,
        title: dto.title,
        description: dto.description,
        defaultAssigneeRole: dto.defaultAssigneeRole,
        defaultAssigneeEmail: dto.defaultAssigneeEmail,
        subtasks: (dto.subtasks as unknown as Prisma.InputJsonValue) ?? undefined,
        conditions: (dto.conditions as unknown as Prisma.InputJsonValue) ?? undefined,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateTaskTemplateDto) {
    const existing = await this.prisma.taskTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Task template not found');

    const data: Partial<UpdateTaskTemplateDto> = {};
    if (dto.stage !== undefined) data.stage = dto.stage;
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.defaultAssigneeRole !== undefined) data.defaultAssigneeRole = dto.defaultAssigneeRole;
    if (dto.defaultAssigneeEmail !== undefined) data.defaultAssigneeEmail = dto.defaultAssigneeEmail;
    if (dto.subtasks !== undefined) data.subtasks = dto.subtasks;
    if (dto.conditions !== undefined) data.conditions = dto.conditions;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.taskTemplate.update({
      where: { id },
      data: data as unknown as Prisma.TaskTemplateUpdateInput,
    });
  }

  async delete(id: string) {
    const existing = await this.prisma.taskTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Task template not found');

    return this.prisma.taskTemplate.delete({ where: { id } });
  }
}
