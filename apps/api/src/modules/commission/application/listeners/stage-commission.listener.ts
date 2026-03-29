import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
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
    private readonly emitter: EventEmitter2,
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
      await this.createCommissionPayments(leadId, 'M1', tiers.M1);
    } else if (newStage === M2_STAGE) {
      await this.createCommissionPayments(leadId, 'M2', tiers.M2);
    } else if (newStage === M3_STAGE) {
      await this.createM3IfEligible(leadId);
    }
  }

  /**
   * Create commission payments for all primary assignees of a lead.
   */
  private async createCommissionPayments(
    leadId: string,
    type: 'M1' | 'M2' | 'M3',
    tierPct: number,
  ): Promise<void> {
    try {
      const assignments = await this.prisma.leadAssignment.findMany({
        where: { leadId, isPrimary: true },
      });

      if (!assignments.length) {
        this.logger.warn(`No primary assignees found for lead ${leadId} — skipping ${type} commission`);
        return;
      }

      // Get the lead commission to calculate payment amount
      const commission = await this.prisma.commission.findFirst({
        where: { leadId },
      });

      const baseAmount = commission?.amount
        ? Number(commission.amount)
        : null;

      // Check for existing payments and filter to only new ones
      const assignmentsToCreate: { userId: string; amount: number | null }[] = [];

      for (const assignment of assignments) {
        const existing = await this.prisma.commissionPayment.findFirst({
          where: {
            leadId,
            userId: assignment.userId,
            type,
          },
        });

        if (existing) {
          this.logger.debug(
            `${type} commission payment already exists for user ${assignment.userId} on lead ${leadId}`,
          );
          continue;
        }

        const paymentAmount = baseAmount !== null
          ? Math.round(baseAmount * tierPct * 100) / 100
          : null;

        assignmentsToCreate.push({ userId: assignment.userId, amount: paymentAmount });
      }

      if (assignmentsToCreate.length === 0) return;

      // Batch all creates in a single transaction
      const creates = assignmentsToCreate.map((a) =>
        this.prisma.commissionPayment.create({
          data: {
            leadId,
            userId: a.userId,
            type,
            amount: a.amount,
            status: 'PENDING',
          },
        }),
      );

      const payments = await this.prisma.$transaction(creates);

      // Emit events after transaction commits
      for (let i = 0; i < payments.length; i++) {
        const payment = payments[i];
        const { userId, amount } = assignmentsToCreate[i];

        this.emitter.emit('commission.created', {
          paymentId: payment.id,
          leadId,
          userId,
          type,
          amount,
        });

        this.logger.log(
          `${type} commission payment created for user ${userId} on lead ${leadId} (amount: ${amount ?? 'TBD'})`,
        );
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to create ${type} commission payments for lead ${leadId}: ${message}`,
      );
    }
  }

  /**
   * Create M3 commission only if M2 advance was NOT already paid.
   */
  private async createM3IfEligible(leadId: string): Promise<void> {
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
      await this.createCommissionPayments(leadId, 'M3', tiers.M3);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to check M3 eligibility for lead ${leadId}: ${message}`,
      );
    }
  }
}
