import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { QUEUE_DESIGN } from '../../../../infrastructure/queue/queue.module';
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
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_DESIGN) private readonly designQueue: Queue<DesignJobData>,
  ) {}

  @OnEvent('design.requested.ai')
  async handleAiDesignRequested(payload: AiDesignRequestedPayload): Promise<void> {
    this.logger.log(`Enqueuing Aurora enrichment for lead ${payload.leadId}`);

    try {
      await this.designQueue.add(
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
      );

      this.logger.log(`Aurora design job enqueued for lead ${payload.leadId}`);
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to enqueue Aurora design job for lead ${payload.leadId}: ${errMessage}`);

      // Log failure activity so it's not silently lost
      await this.prisma.leadActivity.create({
        data: {
          leadId: payload.leadId,
          userId: payload.userId,
          type: 'DESIGN_REQUESTED',
          description: `Failed to enqueue Aurora design job: ${errMessage}`,
          metadata: { error: errMessage },
        },
      }).catch(() => {});
    }
  }
}
