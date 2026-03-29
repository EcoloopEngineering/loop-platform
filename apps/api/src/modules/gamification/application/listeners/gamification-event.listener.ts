import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LeadStageChangedPayload } from '../../../crm/application/events/lead-events.types';
import { GamificationScoringService } from '../services/gamification-scoring.service';

@Injectable()
export class GamificationEventListener {
  private readonly logger = new Logger(GamificationEventListener.name);

  constructor(
    private readonly scoringService: GamificationScoringService,
  ) {}

  @OnEvent('lead.stageChanged')
  async handleStageChanged(payload: LeadStageChangedPayload): Promise<void> {
    try {
      await this.scoringService.processStageChange(payload);
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : String(error);
      const errStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Gamification event failed for lead ${payload.leadId}: ${errMessage}`,
        errStack,
      );
    }
  }
}
