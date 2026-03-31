import { Injectable, Logger, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TASK_REPOSITORY, TaskRepositoryPort } from '../ports/task.repository.port';

export interface TaskStatusChangedPayload {
  taskId: string;
  leadId: string | null;
  templateKey: string | null;
  title: string;
  previousStatus: string;
  newStatus: string;
}

@Injectable()
export class TaskStatusChangedListener {
  private readonly logger = new Logger(TaskStatusChangedListener.name);

  constructor(
    @Inject(TASK_REPOSITORY) private readonly repo: TaskRepositoryPort,
  ) {}

  @OnEvent('task.statusChanged')
  async handleStatusChanged(payload: TaskStatusChangedPayload): Promise<void> {
    if (!payload.leadId) {
      this.logger.debug('No leadId on task — skipping metadata update');
      return;
    }

    try {
      const key = this.generateMetadataKey(payload.title);

      const lead = await this.repo.findLeadMetadataOnly(payload.leadId);
      const existingMetadata = (lead?.metadata as Record<string, unknown>) ?? {};

      await this.repo.updateLeadMetadata(payload.leadId, {
        ...existingMetadata,
        [key]: payload.newStatus,
      });

      this.logger.log(
        `Updated lead ${payload.leadId} metadata: ${key} = ${payload.newStatus}`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to update lead metadata for task ${payload.taskId}: ${message}`,
        stack,
      );
    }
  }

  /**
   * Convert a task title to a camelCase metadata key with "Status" suffix.
   * Example: "Permit Submission" → "permitSubmissionStatus"
   */
  generateMetadataKey(title: string): string {
    const words = title
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (words.length === 0) return 'taskStatus';

    const camel = words
      .map((w, i) =>
        i === 0
          ? w.toLowerCase()
          : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
      )
      .join('');

    return `${camel}Status`;
  }
}
