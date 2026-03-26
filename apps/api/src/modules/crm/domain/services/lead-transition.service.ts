import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { PIPELINE_TRANSITIONS } from '@loop/shared';

@Injectable()
export class LeadTransitionService {
  private readonly logger = new Logger(LeadTransitionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emitter: EventEmitter2,
  ) {}

  /**
   * Auto-transition leads between pipelines when they reach terminal stages.
   * WON → SITE_AUDIT (PM Pipeline)
   * CUSTOMER_SUCCESS → FIN_TICKETS_OPEN (Finance Pipeline)
   */
  @OnEvent('lead.stageChanged')
  async handleStageChanged(payload: {
    leadId: string;
    customerName: string;
    previousStage: string;
    newStage: string;
  }): Promise<void> {
    const transition = PIPELINE_TRANSITIONS[payload.newStage as keyof typeof PIPELINE_TRANSITIONS];
    if (!transition) return;

    try {
      const lead = await this.prisma.lead.findUnique({
        where: { id: payload.leadId },
      });

      if (!lead || lead.status !== 'ACTIVE') return;

      await this.prisma.lead.update({
        where: { id: payload.leadId },
        data: {
          currentStage: transition.nextStage as any,
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

      this.emitter.emit('lead.stageChanged', {
        leadId: payload.leadId,
        customerName: payload.customerName,
        previousStage: payload.newStage,
        newStage: transition.nextStage,
      });

      this.logger.log(
        `Lead ${payload.leadId} transitioned: ${payload.newStage} → ${transition.nextStage}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to auto-transition lead ${payload.leadId}: ${error.message}`,
      );
    }
  }
}
