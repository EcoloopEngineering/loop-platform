import { Inject, Injectable, Logger } from '@nestjs/common';
import { TASK_REPOSITORY, TaskRepositoryPort } from '../ports/task.repository.port';

interface SubtaskDefinition {
  title: string;
  description?: string;
}

interface TaskTemplate {
  id: string;
  title: string;
  description: string | null;
  defaultAssigneeRole: string | null;
  defaultAssigneeEmail: string | null;
  subtasks: unknown;
  conditions: unknown;
  sortOrder: number;
}

interface LeadWithMetadata {
  id: string;
  metadata: Record<string, unknown> | null;
  property: { state: string } | null;
}

interface TaskCreationPayload {
  leadId: string;
  customerName: string;
  newStage: string;
}

@Injectable()
export class TaskCreationService {
  private readonly logger = new Logger(TaskCreationService.name);

  constructor(
    @Inject(TASK_REPOSITORY) private readonly taskRepo: TaskRepositoryPort,
  ) {}

  async createTasksFromTemplates(
    templates: TaskTemplate[],
    lead: LeadWithMetadata,
    payload: TaskCreationPayload,
  ): Promise<string[]> {
    const createdTasks: string[] = [];

    for (const template of templates) {
      if (!this.evaluateConditions(template.conditions as Record<string, unknown> | null, lead)) {
        this.logger.debug(`Template "${template.title}" conditions not met, skipping`);
        continue;
      }

      const assigneeId = await this.resolveAssignee(
        template.defaultAssigneeRole,
        template.defaultAssigneeEmail,
        payload.leadId,
      );

      const task = await this.taskRepo.createTask({
        leadId: payload.leadId,
        title: template.title,
        description: template.description,
        assigneeId,
        templateKey: template.id,
        priority: template.sortOrder,
      });

      createdTasks.push(task.id);

      await this.createSubtasks(task.id, template.subtasks as SubtaskDefinition[] | null, {
        leadId: payload.leadId,
        assigneeId,
        templateKey: template.id,
      });
    }

    return createdTasks;
  }

  async resolveAssignee(
    role?: string | null,
    email?: string | null,
    leadId?: string,
  ): Promise<string | undefined> {
    if (email) {
      const user = await this.taskRepo.findActiveUserByEmail(email);
      if (user) return user.id;
    }

    if (role === 'PM' && leadId) {
      const pmId = await this.taskRepo.findLeadProjectManagerId(leadId);
      if (pmId) return pmId;
      const manager = await this.taskRepo.findActiveUserByRole('MANAGER');
      if (manager) return manager.id;
    }

    if (role) {
      const roleMap: Record<string, string> = {
        SALES_REP: 'SALES_REP',
        MANAGER: 'MANAGER',
        ADMIN: 'ADMIN',
        PM: 'MANAGER',
      };
      const mappedRole = roleMap[role] ?? role;
      const user = await this.taskRepo.findActiveUserByRole(mappedRole);
      if (user) return user.id;
    }

    return undefined;
  }

  async createSubtasks(
    parentTaskId: string,
    subtaskDefs: SubtaskDefinition[] | null,
    context: { leadId: string; assigneeId?: string; templateKey: string },
  ): Promise<void> {
    if (!subtaskDefs?.length) return;

    for (const sub of subtaskDefs) {
      await this.taskRepo.createTask({
        leadId: context.leadId,
        title: sub.title,
        description: sub.description,
        assigneeId: context.assigneeId,
        parentTaskId,
        templateKey: context.templateKey,
      });
    }
  }

  /**
   * Evaluate template conditions against lead data.
   * Returns true if all conditions match (or if no conditions defined).
   */
  evaluateConditions(conditions: Record<string, unknown> | null, lead: LeadWithMetadata): boolean {
    if (!conditions || typeof conditions !== 'object' || Object.keys(conditions).length === 0) {
      return true;
    }

    const metadata = (lead.metadata as Record<string, unknown>) ?? {};
    const state = lead.property?.state;

    for (const [key, value] of Object.entries(conditions)) {
      if (key === 'state') {
        if (state !== value) return false;
      } else {
        if (metadata[key] !== value) return false;
      }
    }

    return true;
  }
}
