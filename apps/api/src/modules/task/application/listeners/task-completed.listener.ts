import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

interface TaskCompletedPayload {
  taskId: string;
  leadId: string | null;
  templateKey: string | null;
  completedById: string;
}

@Injectable()
export class TaskCompletedListener {
  private readonly logger = new Logger(TaskCompletedListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emitter: EventEmitter2,
  ) {}

  @OnEvent('task.completed')
  async handleTaskCompleted(payload: TaskCompletedPayload): Promise<void> {
    this.logger.log(`Task completed: ${payload.taskId}`);

    if (!payload.leadId || !payload.templateKey) {
      this.logger.debug('No leadId or templateKey — skipping sibling check');
      return;
    }

    try {
      // 1. Check if all sibling tasks (same lead + same templateKey) are completed
      const siblings = await this.prisma.task.findMany({
        where: {
          leadId: payload.leadId,
          templateKey: payload.templateKey,
          parentTaskId: null, // Only top-level tasks
        },
        select: { id: true, status: true },
      });

      const allCompleted = siblings.every((t) => t.status === 'COMPLETED');

      if (!allCompleted) {
        this.logger.debug(
          `Not all sibling tasks completed for lead ${payload.leadId}, templateKey ${payload.templateKey}`,
        );
        return;
      }

      this.logger.log(
        `All tasks completed for lead ${payload.leadId}, templateKey ${payload.templateKey}`,
      );

      // 2. Check if template has a nextStage suggestion
      const template = await this.prisma.taskTemplate.findUnique({
        where: { id: payload.templateKey },
      });

      // 3. Log activity on lead
      await this.prisma.leadActivity.create({
        data: {
          leadId: payload.leadId,
          type: 'STAGE_CHANGE',
          description: `All tasks for template "${template?.title ?? payload.templateKey}" completed`,
          userId: payload.completedById,
        },
      });

      // Emit stage advance suggestion if template metadata suggests it
      const templateMeta = (template?.conditions as Record<string, any>) ?? {};
      if (templateMeta.nextStage) {
        this.emitter.emit('lead.stageAdvance', {
          leadId: payload.leadId,
          suggestedStage: templateMeta.nextStage,
          reason: `All tasks for "${template?.title}" completed`,
        });
        this.logger.log(
          `Emitted lead.stageAdvance for lead ${payload.leadId} to ${templateMeta.nextStage}`,
        );
      }
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : String(error);
      const errStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to process task completion: ${errMessage}`,
        errStack,
      );
    }
  }
}
