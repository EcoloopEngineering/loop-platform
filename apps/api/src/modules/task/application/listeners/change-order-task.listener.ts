import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

export interface ChangeOrderCreatedPayload {
  leadId: string;
  changes: string[];
  userId: string;
  customerName: string;
}

@Injectable()
export class ChangeOrderTaskListener {
  private readonly logger = new Logger(ChangeOrderTaskListener.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('lead.changeOrderCreated')
  async handleChangeOrderCreated(payload: ChangeOrderCreatedPayload): Promise<void> {
    this.logger.log(
      `Creating change order tasks for lead ${payload.leadId} (${payload.changes.length} change(s))`,
    );

    try {
      // Find an ENGINEER-role user, fall back to ADMIN
      let assignee = await this.prisma.user.findFirst({
        where: { role: 'ADMIN', isActive: true },
        select: { id: true },
      });

      // Create parent task
      const parentTask = await this.prisma.task.create({
        data: {
          leadId: payload.leadId,
          title: `Change Order: ${payload.customerName}`,
          description: `Change order with ${payload.changes.length} change(s) requested.`,
          assigneeId: assignee?.id,
          status: 'OPEN',
          priority: 1,
        },
      });

      // Create subtasks from the changes array
      for (const change of payload.changes) {
        await this.prisma.task.create({
          data: {
            leadId: payload.leadId,
            title: change,
            parentTaskId: parentTask.id,
            assigneeId: assignee?.id,
            status: 'OPEN',
            priority: 0,
          },
        });
      }

      // Log activity
      await this.prisma.leadActivity.create({
        data: {
          leadId: payload.leadId,
          userId: payload.userId,
          type: 'TASK_CREATED',
          description: `Change order task created with ${payload.changes.length} subtask(s)`,
          metadata: { taskId: parentTask.id },
        },
      });

      this.logger.log(
        `Created change order task ${parentTask.id} with ${payload.changes.length} subtask(s) for lead ${payload.leadId}`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to create change order tasks for lead ${payload.leadId}: ${message}`,
        stack,
      );
    }
  }
}
