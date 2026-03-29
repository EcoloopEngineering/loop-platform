import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { GoogleChatService } from '../../../../integrations/google-chat/google-chat.service';

interface SubtaskDefinition {
  title: string;
  description?: string;
}

interface LeadWithMetadata {
  id: string;
  metadata: Record<string, unknown> | null;
  property: { state: string } | null;
}

interface LeadStageChangedPayload {
  leadId: string;
  customerName: string;
  previousStage: string;
  newStage: string;
}

@Injectable()
export class StageTaskListener {
  private readonly logger = new Logger(StageTaskListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly googleChat: GoogleChatService,
  ) {}

  @OnEvent('lead.stageChanged')
  async handleStageChanged(payload: LeadStageChangedPayload): Promise<void> {
    this.logger.log(
      `Creating tasks for lead ${payload.leadId} moving to stage ${payload.newStage}`,
    );

    try {
      // 1. Find active templates for the new stage
      const templates = await this.prisma.taskTemplate.findMany({
        where: { stage: payload.newStage, isActive: true },
        orderBy: { sortOrder: 'asc' },
      });

      if (!templates.length) {
        this.logger.debug(`No task templates found for stage ${payload.newStage}`);
        return;
      }

      // Load lead with metadata for condition evaluation
      const lead = await this.prisma.lead.findUnique({
        where: { id: payload.leadId },
        select: {
          id: true,
          metadata: true,
          property: { select: { state: true } },
        },
      });

      if (!lead) {
        this.logger.warn(`Lead ${payload.leadId} not found`);
        return;
      }

      const createdTasks: string[] = [];

      for (const template of templates) {
        // 2. Evaluate conditions
        if (!this.evaluateConditions(template.conditions as Record<string, unknown> | null, lead as unknown as LeadWithMetadata)) {
          this.logger.debug(`Template "${template.title}" conditions not met, skipping`);
          continue;
        }

        // Resolve assignee
        const assigneeId = await this.resolveAssignee(
          template.defaultAssigneeRole,
          template.defaultAssigneeEmail,
          payload.leadId,
        );

        // 3. Create the task
        const task = await this.prisma.task.create({
          data: {
            leadId: payload.leadId,
            title: template.title,
            description: template.description,
            assigneeId,
            templateKey: template.id,
            priority: template.sortOrder,
          },
        });

        createdTasks.push(task.id);

        // Create subtasks if defined
        const subtaskDefs = template.subtasks as SubtaskDefinition[] | null;
        if (subtaskDefs?.length) {
          for (const sub of subtaskDefs) {
            await this.prisma.task.create({
              data: {
                leadId: payload.leadId,
                title: sub.title,
                description: sub.description,
                assigneeId,
                parentTaskId: task.id,
                templateKey: template.id,
              },
            });
          }
        }
      }

      // 5. Log activity on lead
      if (createdTasks.length > 0) {
        await this.prisma.leadActivity.create({
          data: {
            leadId: payload.leadId,
            type: 'STAGE_CHANGE',
            description: `${createdTasks.length} task(s) auto-created for stage ${payload.newStage}`,
          },
        });

        // 4. Send Google Chat notification
        await this.sendChatNotification(payload, createdTasks.length);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to create tasks for lead ${payload.leadId}: ${message}`,
        stack,
      );
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
        // Check in metadata
        if (metadata[key] !== value) return false;
      }
    }

    return true;
  }

  private async resolveAssignee(
    role?: string | null,
    email?: string | null,
    leadId?: string,
  ): Promise<string | undefined> {
    // First try by email
    if (email) {
      const user = await this.prisma.user.findFirst({
        where: { email, isActive: true },
        select: { id: true },
      });
      if (user) return user.id;
    }

    // If role is PM, use the lead's project manager
    if (role === 'PM' && leadId) {
      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
        select: { projectManagerId: true },
      });
      if (lead?.projectManagerId) return lead.projectManagerId;
      // Fallback: find any MANAGER
      const manager = await this.prisma.user.findFirst({
        where: { role: 'MANAGER', isActive: true },
        select: { id: true },
      });
      if (manager) return manager.id;
    }

    // Map role names to UserRole enum values
    if (role) {
      const roleMap: Record<string, string> = {
        SALES_REP: 'SALES_REP',
        MANAGER: 'MANAGER',
        ADMIN: 'ADMIN',
        PM: 'MANAGER',
      };
      const mappedRole = roleMap[role] ?? role;
      const user = await this.prisma.user.findFirst({
        where: { role: mappedRole as UserRole, isActive: true },
        select: { id: true },
      });
      if (user) return user.id;
    }

    return undefined;
  }

  private async sendChatNotification(
    payload: LeadStageChangedPayload,
    taskCount: number,
  ): Promise<void> {
    try {
      if (!this.googleChat.isConfigured()) return;

      // Find the lead's Google Chat space from metadata
      const lead = await this.prisma.lead.findUnique({
        where: { id: payload.leadId },
        select: { metadata: true },
      });

      const metadata = (lead?.metadata as Record<string, unknown>) ?? {};
      const spaceName = metadata.googleChatSpace as string | undefined;

      if (spaceName) {
        await this.googleChat.sendMessage(
          spaceName,
          `*${taskCount} new task(s)* created for *${payload.customerName}* (stage: ${payload.newStage}). Check the task list for details.`,
        );
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to send Google Chat notification: ${message}`);
    }
  }
}
