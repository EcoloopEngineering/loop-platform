import { CreateTaskDto, UpdateTaskDto } from '../dto/create-task.dto';
import { CreateTaskTemplateDto, UpdateTaskTemplateDto } from '../dto/create-task-template.dto';

export interface TaskTemplateRecord {
  id: string;
  stage: string;
  title: string;
  description?: string | null;
  defaultAssigneeRole?: string | null;
  defaultAssigneeEmail?: string | null;
  subtasks?: unknown;
  conditions?: unknown;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
}

export interface TaskWithAssignee {
  id: string;
  title: string;
  description?: string | null;
  leadId?: string | null;
  assigneeId?: string | null;
  priority: number;
  status: string;
  parentTaskId?: string | null;
  templateKey?: string | null;
  dueDate?: Date | null;
  completedAt?: Date | null;
  completedById?: string | null;
  metadata?: unknown;
  createdAt: Date;
  updatedAt: Date;
  assignee?: { id: string; firstName: string; lastName: string; email: string } | null;
  lead?: { id: string; currentStage: string; customer?: { firstName: string; lastName: string } | null } | null;
  subtasks?: TaskWithAssignee[];
  parentTask?: { id: string; title: string } | null;
}

export interface TaskFilter {
  leadId?: string;
  assigneeId?: string;
  status?: string;
}

export interface TaskRepositoryPort {
  findAll(filter: TaskFilter): Promise<TaskWithAssignee[]>;
  findById(id: string): Promise<TaskWithAssignee | null>;
  findByIdSimple(id: string): Promise<TaskWithAssignee | null>;
  create(dto: CreateTaskDto): Promise<TaskWithAssignee>;
  update(id: string, data: Record<string, any>): Promise<TaskWithAssignee>;
  complete(id: string, userId: string): Promise<TaskWithAssignee>;
  cancel(id: string): Promise<TaskWithAssignee>;

  /* ── used by TaskCreationService ── */
  createTask(data: {
    leadId: string;
    title: string;
    description?: string | null;
    assigneeId?: string;
    templateKey?: string;
    priority?: number;
    parentTaskId?: string;
  }): Promise<{ id: string }>;

  findActiveUserByEmail(email: string): Promise<{ id: string } | null>;

  findActiveUserByRole(role: string): Promise<{ id: string } | null>;

  findLeadProjectManagerId(leadId: string): Promise<string | null>;

  /* ── Task templates ── */
  findTemplates(filter?: { stage?: string }): Promise<TaskTemplateRecord[]>;
  findTemplateById(id: string): Promise<TaskTemplateRecord | null>;
  createTemplate(data: Record<string, unknown>): Promise<TaskTemplateRecord>;
  updateTemplate(id: string, data: Record<string, unknown>): Promise<TaskTemplateRecord>;
  deleteTemplate(id: string): Promise<TaskTemplateRecord>;
}

export const TASK_REPOSITORY = Symbol('TASK_REPOSITORY');
