import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { StageAdvanceService, StageAdvancePayload } from '../services/stage-advance.service';

@Injectable()
export class StageAdvanceListener {
  private readonly logger = new Logger(StageAdvanceListener.name);

  constructor(private readonly stageAdvanceService: StageAdvanceService) {}

  @OnEvent('lead.stageAdvance')
  async handleStageAdvance(payload: StageAdvancePayload): Promise<void> {
    try {
      await this.stageAdvanceService.handleStageChange(payload);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to auto-advance lead: ${message}`);
    }
  }
}
