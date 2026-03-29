import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { PIPELINE_TRANSITIONS } from '@loop/shared';
import { LeadStageChangedPayload } from '../events/lead-events.types';

@Injectable()
export class PipelineTransitionService {
  private readonly logger = new Logger(PipelineTransitionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emitter: EventEmitter2,
  ) {}

  async handleTransition(payload: LeadStageChangedPayload): Promise<void> {
    const depth = payload.depth ?? 0;
    if (depth >= 5) {
      this.logger.warn(`Max transition depth reached for lead ${payload.leadId}`);
      return;
    }

    const transition = PIPELINE_TRANSITIONS[payload.newStage as keyof typeof PIPELINE_TRANSITIONS];
    if (!transition) return;

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
      depth: depth + 1,
    };
    this.emitter.emit('lead.stageChanged', nextPayload);

    this.logger.log(`Lead ${payload.leadId} auto-transitioned: ${payload.newStage} → ${transition.nextStage}`);
  }
}
