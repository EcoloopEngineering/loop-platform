import { Injectable, Inject, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LEAD_REPOSITORY, LeadRepositoryPort } from '../ports/lead.repository.port';
import { PIPELINE_TRANSITIONS } from '@loop/shared';
import { LeadStageChangedPayload } from '../events/lead-events.types';

@Injectable()
export class PipelineTransitionService {
  private readonly logger = new Logger(PipelineTransitionService.name);

  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leadRepo: LeadRepositoryPort,
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

    const lead = await this.leadRepo.findById(payload.leadId);
    if (!lead || lead.status !== 'ACTIVE') return;

    await this.leadRepo.updateStageAndPipeline(
      payload.leadId,
      transition.nextStage,
      transition.nextPipelineId,
    );

    await this.leadRepo.createActivity({
      leadId: payload.leadId,
      userId: lead.projectManagerId ?? lead.createdById ?? '',
      type: 'STAGE_CHANGE',
      description: `Auto-transitioned from ${payload.newStage} to ${transition.nextStage} (pipeline transition)`,
      metadata: {
        previousStage: payload.newStage,
        newStage: transition.nextStage,
        pipelineTransition: true,
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
