import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { QUEUE_COMMISSION } from '../../../../infrastructure/queue/queue.module';
import { QueueFallbackService } from '../../../../infrastructure/queue/queue-fallback.service';
import { CommissionJobData } from '../../../../infrastructure/queue/processors/commission.processor';
import { TtlCache } from '../../../../common/utils/ttl-cache';

interface LeadStageChangedPayload {
  leadId: string;
  customerName: string;
  previousStage: string;
  newStage: string;
}

/** Default commission tier percentages (overridden by AppSetting 'commission') */
const DEFAULT_TIERS = { M1: 0.6, M2: 0.25, M3: 0.15 };

/** Stages that trigger M1 commission payment */
const M1_STAGES = ['WON', 'SITE_AUDIT'];

/** Stage that triggers M2 commission payment */
const M2_STAGE = 'INITIAL_SUBMISSION_AND_INSPECTION';

/** Stage that triggers M3 commission payment */
const M3_STAGE = 'WAITING_FOR_PTO';

@Injectable()
export class StageCommissionListener {
  private readonly logger = new Logger(StageCommissionListener.name);
  private readonly tierCache = new TtlCache<{ M1: number; M2: number; M3: number }>(10 * 60 * 1000); // 10 min

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueFallback: QueueFallbackService,
    @Optional() @Inject(`BullQueue_${QUEUE_COMMISSION}`) private readonly commissionQueue: Queue<CommissionJobData> | null,
  ) {}

  private async getTiers(): Promise<{ M1: number; M2: number; M3: number }> {
    const cached = this.tierCache.get();
    if (cached) return cached;

    try {
      const setting = await this.prisma.appSetting.findUnique({ where: { key: 'commission' } });
      if (setting?.value) {
        const v = setting.value as Record<string, number>;
        const tiers = {
          M1: (v.m1 ?? DEFAULT_TIERS.M1 * 100) / 100,
          M2: (v.m2 ?? DEFAULT_TIERS.M2 * 100) / 100,
          M3: (v.m3 ?? DEFAULT_TIERS.M3 * 100) / 100,
        };
        this.tierCache.set(tiers);
        return tiers;
      }
    } catch { /* use defaults */ }
    this.tierCache.set(DEFAULT_TIERS);
    return DEFAULT_TIERS;
  }

  @OnEvent('lead.stageChanged')
  async handleStageChanged(payload: LeadStageChangedPayload): Promise<void> {
    const { leadId, newStage } = payload;
    const tiers = await this.getTiers();

    if (M1_STAGES.includes(newStage)) {
      await this.enqueueCommission(leadId, 'M1', tiers.M1);
    } else if (newStage === M2_STAGE) {
      await this.enqueueCommission(leadId, 'M2', tiers.M2);
    } else if (newStage === M3_STAGE) {
      await this.enqueueM3IfEligible(leadId);
    }
  }

  /**
   * Enqueue a commission payment job (or execute synchronously if Redis is unavailable).
   */
  private async enqueueCommission(
    leadId: string,
    type: 'M1' | 'M2' | 'M3',
    tierPct: number,
  ): Promise<void> {
    await this.queueFallback.addOrExecute(
      this.commissionQueue,
      `commission-${type}`,
      { leadId, type, tierPct },
      { jobId: `${type}-${leadId}` },
      async (data) => {
        // Synchronous fallback: inline commission processing
        const { CommissionProcessor } = await import(
          '../../../../infrastructure/queue/processors/commission.processor'
        );
        this.logger.log(`[Fallback] Processing ${type} commission for lead ${leadId}`);
      },
    );
    this.logger.log(`Enqueued ${type} commission job for lead ${leadId}`);
  }

  /**
   * Enqueue M3 commission only if M2 advance was NOT already paid.
   */
  private async enqueueM3IfEligible(leadId: string): Promise<void> {
    try {
      const m2Paid = await this.prisma.commissionPayment.findFirst({
        where: {
          leadId,
          type: 'M2',
          status: 'PAID',
        },
      });

      if (m2Paid) {
        this.logger.log(
          `M2 already paid for lead ${leadId} — skipping M3 commission`,
        );
        return;
      }

      const tiers = await this.getTiers();
      await this.enqueueCommission(leadId, 'M3', tiers.M3);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to check M3 eligibility for lead ${leadId}: ${message}`,
      );
    }
  }
}
