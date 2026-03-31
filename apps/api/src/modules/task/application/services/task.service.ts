import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  TASK_REPOSITORY,
  TaskRepositoryPort,
  TaskFilter,
  TaskWithAssignee,
} from '../ports/task.repository.port';
import { CreateTaskDto, UpdateTaskDto } from '../dto/create-task.dto';

@Injectable()
export class TaskService {
  constructor(
    @Inject(TASK_REPOSITORY) private readonly taskRepo: TaskRepositoryPort,
    private readonly emitter: EventEmitter2,
  ) {}

  async list(filter: TaskFilter): Promise<TaskWithAssignee[]> {
    return this.taskRepo.findAll(filter);
  }

  async findOne(id: string): Promise<TaskWithAssignee> {
    const task = await this.taskRepo.findById(id);
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async create(dto: CreateTaskDto): Promise<TaskWithAssignee> {
    return this.taskRepo.create(dto);
  }

  async update(id: string, dto: UpdateTaskDto): Promise<TaskWithAssignee> {
    const existing = await this.taskRepo.findByIdSimple(id);
    if (!existing) throw new NotFoundException('Task not found');

    const data: Record<string, any> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.assigneeId !== undefined) data.assigneeId = dto.assigneeId;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.dueDate !== undefined) data.dueDate = new Date(dto.dueDate);
    if (dto.metadata !== undefined) data.metadata = dto.metadata;

    if (dto.status && dto.status !== existing.status) {
      this.emitter.emit('task.statusChanged', {
        taskId: id,
        leadId: existing.leadId,
        templateKey: existing.templateKey,
        title: existing.title,
        previousStatus: existing.status,
        newStatus: dto.status,
      });
    }

    return this.taskRepo.update(id, data);
  }

  async complete(id: string, userId: string): Promise<TaskWithAssignee> {
    const existing = await this.taskRepo.findByIdSimple(id);
    if (!existing) throw new NotFoundException('Task not found');

    const task = await this.taskRepo.complete(id, userId);

    this.emitter.emit('task.completed', {
      taskId: task.id,
      leadId: task.leadId,
      templateKey: task.templateKey,
      completedById: userId,
    });

    return task;
  }

  async remove(id: string): Promise<TaskWithAssignee> {
    const existing = await this.taskRepo.findByIdSimple(id);
    if (!existing) throw new NotFoundException('Task not found');

    return this.taskRepo.cancel(id);
  }
}
