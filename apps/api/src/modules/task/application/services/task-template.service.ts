import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TASK_REPOSITORY, TaskRepositoryPort } from '../ports/task.repository.port';
import { CreateTaskTemplateDto, UpdateTaskTemplateDto } from '../dto/create-task-template.dto';

export interface TaskTemplateFilter {
  stage?: string;
}

@Injectable()
export class TaskTemplateService {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly taskRepo: TaskRepositoryPort,
  ) {}

  async list(filter: TaskTemplateFilter = {}) {
    return this.taskRepo.findTemplates(filter.stage ? { stage: filter.stage } : undefined);
  }

  async create(dto: CreateTaskTemplateDto) {
    return this.taskRepo.createTemplate({
      stage: dto.stage,
      title: dto.title,
      description: dto.description,
      defaultAssigneeRole: dto.defaultAssigneeRole,
      defaultAssigneeEmail: dto.defaultAssigneeEmail,
      subtasks: (dto.subtasks as unknown as Prisma.InputJsonValue) ?? undefined,
      conditions: (dto.conditions as unknown as Prisma.InputJsonValue) ?? undefined,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
    });
  }

  async update(id: string, dto: UpdateTaskTemplateDto) {
    const existing = await this.taskRepo.findTemplateById(id);
    if (!existing) throw new NotFoundException('Task template not found');

    const data: Record<string, unknown> = {};
    if (dto.stage !== undefined) data.stage = dto.stage;
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.defaultAssigneeRole !== undefined) data.defaultAssigneeRole = dto.defaultAssigneeRole;
    if (dto.defaultAssigneeEmail !== undefined) data.defaultAssigneeEmail = dto.defaultAssigneeEmail;
    if (dto.subtasks !== undefined) data.subtasks = dto.subtasks;
    if (dto.conditions !== undefined) data.conditions = dto.conditions;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.taskRepo.updateTemplate(id, data);
  }

  async delete(id: string) {
    const existing = await this.taskRepo.findTemplateById(id);
    if (!existing) throw new NotFoundException('Task template not found');

    return this.taskRepo.deleteTemplate(id);
  }
}
