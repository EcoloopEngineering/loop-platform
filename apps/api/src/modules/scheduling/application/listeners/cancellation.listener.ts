import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  CancellationService,
  LeadStatusChangedPayload,
} from '../services/cancellation.service';

@Injectable()
export class CancellationListener {
  private readonly logger = new Logger(CancellationListener.name);

  constructor(private readonly cancellationService: CancellationService) {}

  @OnEvent('lead.statusChanged')
  async handleStatusChanged(payload: LeadStatusChangedPayload): Promise<void> {
    try {
      await this.cancellationService.handleStatusChanged(payload);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Cancellation workflow failed for lead ${payload.leadId}: ${message}`,
      );
    }
  }
}
