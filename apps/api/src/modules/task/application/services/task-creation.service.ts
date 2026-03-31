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
  financier: string | null;
  property: { state: string } | null;
}

interface TaskCreationPayload {
  leadId: string;
  customerName: string;
  newStage: string;
}

/** Keys in conditions that are directives, not filter conditions */
const CONDITION_SKIP_KEYS = new Set(['nextStage', 'stateOverride', 'stateSubtasks']);

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
      const conditions = template.conditions as Record<string, unknown> | null;

      if (!this.evaluateConditions(conditions, lead)) {
        this.logger.debug(`Template "${template.title}" conditions not met, skipping`);
        continue;
      }

      // Phase 2: stateOverride — override assignee role based on lead state
      let effectiveRole = template.defaultAssigneeRole;
      const stateOverride = conditions?.stateOverride as Record<string, string> | undefined;
      if (stateOverride && lead.property?.state) {
        const overrideRole = stateOverride[lead.property.state];
        if (overrideRole) {
          this.logger.debug(
            `Template "${template.title}" — state override for ${lead.property.state}: ${effectiveRole} → ${overrideRole}`,
          );
          effectiveRole = overrideRole;
        }
      }

      const assigneeId = await this.resolveAssignee(
        effectiveRole,
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

      // Standard subtasks from the template
      const standardSubtasks = template.subtasks as SubtaskDefinition[] | null;

      await this.createSubtasks(task.id, standardSubtasks, {
        leadId: payload.leadId,
        assigneeId,
        templateKey: template.id,
      });

      // Phase 2: stateSubtasks — add extra subtasks based on lead state
      const stateSubtasks = conditions?.stateSubtasks as Record<string, string[]> | undefined;
      if (stateSubtasks && lead.property?.state) {
        const extraTitles = stateSubtasks[lead.property.state];
        if (extraTitles?.length) {
          const extraSubtasks: SubtaskDefinition[] = extraTitles.map((t) => ({ title: t }));
          this.logger.debug(
            `Template "${template.title}" — adding ${extraSubtasks.length} state subtask(s) for ${lead.property.state}`,
          );
          await this.createSubtasks(task.id, extraSubtasks, {
            leadId: payload.leadId,
            assigneeId,
            templateKey: template.id,
          });
        }
      }
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
      // Map template roles to actual system UserRole values
      const SYSTEM_ROLES = new Set(['ADMIN', 'MANAGER', 'SALES_REP', 'REFERRAL']);
      const roleMap: Record<string, string> = {
        PM: 'MANAGER',
      };
      const mappedRole = roleMap[role] ?? role;

      // Only query Prisma with valid system roles
      if (SYSTEM_ROLES.has(mappedRole)) {
        const user = await this.taskRepo.findActiveUserByRole(mappedRole);
        if (user) return user.id;
      }

      // For specialty roles (DESIGNER, ELECTRICIAN, etc.), fall back to PM → ADMIN
      if (leadId) {
        const pmId = await this.taskRepo.findLeadProjectManagerId(leadId);
        if (pmId) return pmId;
      }
      const admin = await this.taskRepo.findActiveUserByRole('ADMIN');
      if (admin) return admin.id;
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
      // Support both string[] and { title, description }[] formats
      const title = typeof sub === 'string' ? sub : sub.title;
      const description = typeof sub === 'string' ? undefined : sub.description;
      if (!title) continue;

      await this.taskRepo.createTask({
        leadId: context.leadId,
        title,
        description,
        assigneeId: context.assigneeId,
        parentTaskId,
        templateKey: context.templateKey,
      });
    }
  }

  /**
   * Evaluate template conditions against lead data.
   * Returns true if all filter conditions match (or if no conditions defined).
   *
   * Supported condition keys:
   * - `state`: exact match on lead.property.state
   * - `upgradesIncludes`: checks if lead.metadata.upgrades contains a value (string or array)
   * - `financierIncludes`: checks if lead.financier contains a substring
   * - Directive keys (`nextStage`, `stateOverride`, `stateSubtasks`) are skipped — they are not filter conditions
   * - Any other key: exact match against lead.metadata[key]
   */
  evaluateConditions(conditions: Record<string, unknown> | null, lead: LeadWithMetadata): boolean {
    if (!conditions || typeof conditions !== 'object' || Object.keys(conditions).length === 0) {
      return true;
    }

    const metadata = (lead.metadata as Record<string, unknown>) ?? {};
    const state = lead.property?.state;

    for (const [key, value] of Object.entries(conditions)) {
      // Skip directive keys — they are not filter conditions
      if (CONDITION_SKIP_KEYS.has(key)) continue;

      if (key === 'state') {
        if (state !== value) return false;
      } else if (key === 'upgradesIncludes') {
        if (!this.checkUpgradesIncludes(metadata, value)) return false;
      } else if (key === 'financierIncludes') {
        if (!this.checkFinancierIncludes(lead.financier, value as string)) return false;
      } else {
        if (metadata[key] !== value) return false;
      }
    }

    return true;
  }

  /**
   * Check if lead.metadata.upgrades contains the specified value(s).
   * Handles: upgrades as string, array of strings, comma-separated string.
   * Value can be a single string or an array of strings (any match = true).
   */
  private checkUpgradesIncludes(metadata: Record<string, unknown>, conditionValue: unknown): boolean {
    const upgrades = metadata.upgrades;
    if (!upgrades) return false;

    const valuesToCheck = Array.isArray(conditionValue) ? conditionValue : [conditionValue];

    // Normalize upgrades into an array of lowercased strings
    let upgradeList: string[];
    if (Array.isArray(upgrades)) {
      upgradeList = upgrades.map((u) => String(u).toLowerCase());
    } else if (typeof upgrades === 'string') {
      upgradeList = upgrades.split(',').map((u) => u.trim().toLowerCase());
    } else {
      return false;
    }

    return valuesToCheck.some((v) => {
      const needle = String(v).toLowerCase();
      return upgradeList.some((u) => u.includes(needle));
    });
  }

  /**
   * Check if lead.financier contains the specified substring (case-insensitive).
   */
  private checkFinancierIncludes(financier: string | null | undefined, needle: string): boolean {
    if (!financier || !needle) return false;
    return financier.toLowerCase().includes(needle.toLowerCase());
  }
}
