import { Injectable, Logger, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TASK_REPOSITORY, TaskRepositoryPort } from '../ports/task.repository.port';
import { GoogleChatService } from '../../../../integrations/google-chat/google-chat.service';
import { TaskCreationService } from '../services/task-creation.service';

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
    @Inject(TASK_REPOSITORY) private readonly repo: TaskRepositoryPort,
    private readonly googleChat: GoogleChatService,
    private readonly taskCreationService: TaskCreationService,
  ) {}

  @OnEvent('lead.stageChanged')
  async handleStageChanged(payload: LeadStageChangedPayload): Promise<void> {
    this.logger.log(
      `Creating tasks for lead ${payload.leadId} moving to stage ${payload.newStage}`,
    );

    try {
      // 1. Find active templates for the new stage
      const templates = await this.repo.findActiveTemplatesByStage(payload.newStage);

      if (!templates.length) {
        this.logger.debug(`No task templates found for stage ${payload.newStage}`);
        return;
      }

      // Load lead with metadata for condition evaluation
      const lead = await this.repo.findLeadWithMetadataAndState(payload.leadId);

      if (!lead) {
        this.logger.warn(`Lead ${payload.leadId} not found`);
        return;
      }

      // Delegate task creation to TaskCreationService
      const createdTasks = await this.taskCreationService.createTasksFromTemplates(
        templates as any,
        lead as any,
        payload,
      );

      // Log activity and notify
      if (createdTasks.length > 0) {
        await this.repo.createLeadActivity({
          leadId: payload.leadId,
          type: 'STAGE_CHANGE',
          description: `${createdTasks.length} task(s) auto-created for stage ${payload.newStage}`,
        });

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
   * Delegates to TaskCreationService — kept for backward compatibility.
   */
  evaluateConditions(conditions: Record<string, unknown> | null, lead: any): boolean {
    return this.taskCreationService.evaluateConditions(conditions, lead);
  }

  private async sendChatNotification(
    payload: LeadStageChangedPayload,
    taskCount: number,
  ): Promise<void> {
    try {
      if (!this.googleChat.isConfigured()) return;

      // Find the lead's Google Chat space from metadata
      const lead = await this.repo.findLeadMetadataOnly(payload.leadId);

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
