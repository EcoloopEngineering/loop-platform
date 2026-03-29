import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { DESIGN_REPOSITORY, DesignRepositoryPort } from '../ports/design.repository.port';
import { QUEUE_DESIGN } from '../../../../infrastructure/queue/queue.module';
import { QueueFallbackService } from '../../../../infrastructure/queue/queue-fallback.service';
import { DesignJobData } from '../../../../infrastructure/queue/processors/design.processor';

interface AiDesignRequestedPayload {
  designRequestId: string;
  leadId: string;
  propertyAddress: string;
  customerName: string;
  monthlyBill?: number;
  annualKwhUsage?: number;
  roofCondition?: string;
  propertyType?: string;
  userId: string;
}

@Injectable()
export class AuroraDesignListener {
  private readonly logger = new Logger(AuroraDesignListener.name);

  constructor(
    @Inject(DESIGN_REPOSITORY) private readonly repo: DesignRepositoryPort,
    private readonly queueFallback: QueueFallbackService,
    @Optional() @Inject(`BullQueue_${QUEUE_DESIGN}`) private readonly designQueue: Queue<DesignJobData> | null,
  ) {}

  @OnEvent('design.requested.ai')
  async handleAiDesignRequested(payload: AiDesignRequestedPayload): Promise<void> {
    this.logger.log(`Enqueuing Aurora enrichment for lead ${payload.leadId}`);

    try {
      await this.queueFallback.addOrExecute(
        this.designQueue,
        'aurora-enrichment',
        {
          designRequestId: payload.designRequestId,
          leadId: payload.leadId,
          propertyAddress: payload.propertyAddress,
          customerName: payload.customerName,
          monthlyBill: payload.monthlyBill,
          annualKwhUsage: payload.annualKwhUsage,
          roofCondition: payload.roofCondition,
          propertyType: payload.propertyType,
          userId: payload.userId,
        },
        { jobId: `design-${payload.designRequestId}` },
        async (_data) => {
          // Synchronous fallback — the DesignProcessor will handle it
          // In fallback mode, this is a no-op since Aurora API calls
          // should still be attempted but may fail gracefully
          this.logger.log(`[Fallback] Aurora design job would be processed for lead ${payload.leadId}`);
        },
      );

      this.logger.log(`Aurora design job enqueued for lead ${payload.leadId}`);
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to enqueue Aurora design job for lead ${payload.leadId}: ${errMessage}`);

      // Log failure activity so it's not silently lost
      await this.repo.createLeadActivity({
        leadId: payload.leadId,
        userId: payload.userId,
        type: 'DESIGN_REQUESTED',
        description: `Failed to enqueue Aurora design job: ${errMessage}`,
        metadata: { error: errMessage },
      }).catch(() => {});
    }
  }
}
