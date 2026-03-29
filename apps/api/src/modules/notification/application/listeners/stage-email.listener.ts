import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { StageEmailService, StageChangedPayload } from '../services/stage-email.service';

@Injectable()
export class StageEmailListener {
  private readonly logger = new Logger(StageEmailListener.name);

  constructor(private readonly stageEmailService: StageEmailService) {}

  @OnEvent('lead.stageChanged')
  async handleStageChanged(payload: StageChangedPayload): Promise<void> {
    try {
      await this.stageEmailService.handleStageChanged(payload);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send stage email: ${message}`);
    }
  }
}
