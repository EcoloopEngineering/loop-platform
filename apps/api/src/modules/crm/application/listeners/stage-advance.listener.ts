import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { PM_STAGE_ORDER } from '../config/pipeline-stages.config';

@Injectable()
export class StageAdvanceListener {
  private readonly logger = new Logger(StageAdvanceListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emitter: EventEmitter2,
  ) {}

  @OnEvent('lead.stageAdvance')
  async handleStageAdvance(payload: {
    leadId: string;
    currentStage?: string;
    suggestedStage?: string;
    suggestedNextStage?: string;
  }): Promise<void> {
    try {
      const lead = await this.prisma.lead.findUnique({
        where: { id: payload.leadId },
        include: { customer: { select: { firstName: true, lastName: true } } },
      });

      if (!lead) return;

      // Determine next stage
      let nextStage = payload.suggestedStage ?? payload.suggestedNextStage;
      if (!nextStage) {
        const currentIndex = PM_STAGE_ORDER.indexOf(lead.currentStage);
        if (currentIndex >= 0 && currentIndex < PM_STAGE_ORDER.length - 1) {
          nextStage = PM_STAGE_ORDER[currentIndex + 1];
        }
      }

      if (!nextStage || nextStage === lead.currentStage) return;

      const previousStage = lead.currentStage;

      // Advance the stage
      await this.prisma.lead.update({
        where: { id: payload.leadId },
        data: { currentStage: nextStage },
      });

      // Log activity
      await this.prisma.leadActivity.create({
        data: {
          leadId: payload.leadId,
          userId: lead.projectManagerId ?? lead.createdById ?? payload.leadId,
          type: 'STAGE_CHANGE',
          description: `Auto-advanced from ${previousStage} to ${nextStage} (all tasks completed)`,
          metadata: { previousStage, newStage: nextStage, auto: true },
        },
      });

      // Emit stage changed event (triggers new tasks, notifications, etc.)
      const customerName = `${lead.customer?.firstName ?? ''} ${lead.customer?.lastName ?? ''}`.trim();
      this.emitter.emit('lead.stageChanged', {
        leadId: payload.leadId,
        customerName,
        previousStage,
        newStage: nextStage,
      });

      this.logger.log(`Lead ${payload.leadId} auto-advanced: ${previousStage} → ${nextStage}`);
    } catch (error: any) {
      this.logger.error(`Failed to auto-advance lead: ${error.message}`);
    }
  }
}
