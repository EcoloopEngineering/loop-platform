import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LeadStageChangedPayload } from '../events/lead-events.types';
import { PipelineTransitionService } from '../services/pipeline-transition.service';

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
    private readonly transitionService: PipelineTransitionService,
  ) {}

  @OnEvent('lead.stageChanged')
  async handleStageChanged(payload: LeadStageChangedPayload): Promise<void> {
    try {
      await this.transitionService.handleTransition(payload);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to auto-transition lead ${payload.leadId}: ${message}`);
    }
  }
}
