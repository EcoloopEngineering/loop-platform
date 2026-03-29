import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { PIPELINE_TRANSITIONS } from '@loop/shared';
import { LeadStageChangedPayload } from '../events/lead-events.types';

/**
 * Application-layer listener for pipeline auto-transitions.
 * When a lead reaches a terminal stage (e.g. WON), automatically
 * transitions it to the next pipeline (e.g. SITE_AUDIT in PM pipeline).
 *
 * Belongs in application/ — orchestrates infrastructure (DB) based on events.
 * NOT in domain/ — domain must not depend on PrismaService or event infrastructure.
 */
@Injectable()
export class LeadTransitionListener {
  private readonly logger = new Logger(LeadTransitionListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emitter: EventEmitter2,
  ) {}

  @OnEvent('lead.stageChanged')
  async handleStageChanged(payload: LeadStageChangedPayload): Promise<void> {
    const transition = PIPELINE_TRANSITIONS[payload.newStage as keyof typeof PIPELINE_TRANSITIONS];
    if (!transition) return;

    try {
      const lead = await this.prisma.lead.findUnique({ where: { id: payload.leadId } });
      if (!lead || lead.status !== 'ACTIVE') return;

      await this.prisma.lead.update({
        where: { id: payload.leadId },
        data: {
          currentStage: transition.nextStage,
          pipelineId: transition.nextPipelineId,
        },
      });

      await this.prisma.leadActivity.create({
        data: {
          leadId: payload.leadId,
          userId: lead.projectManagerId ?? lead.createdById ?? '',
          type: 'STAGE_CHANGE',
          description: `Auto-transitioned from ${payload.newStage} to ${transition.nextStage} (pipeline transition)`,
          metadata: {
            previousStage: payload.newStage,
            newStage: transition.nextStage,
            pipelineTransition: true,
          },
        },
      });

      const nextPayload: LeadStageChangedPayload = {
        leadId: payload.leadId,
        customerName: payload.customerName,
        previousStage: payload.newStage,
        newStage: transition.nextStage,
      };
      this.emitter.emit('lead.stageChanged', nextPayload);

      this.logger.log(`Lead ${payload.leadId} auto-transitioned: ${payload.newStage} → ${transition.nextStage}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to auto-transition lead ${payload.leadId}: ${message}`);
    }
  }
}
