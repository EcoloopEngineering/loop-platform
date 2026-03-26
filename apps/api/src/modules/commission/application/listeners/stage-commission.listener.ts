import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

interface LeadStageChangedPayload {
  leadId: string;
  customerName: string;
  previousStage: string;
  newStage: string;
}

/** Commission tier percentages */
const COMMISSION_TIERS = {
  M1: 0.6,  // 60%
  M2: 0.25, // 25%
  M3: 0.15, // 15%
} as const;

/** Stages that trigger M1 commission payment */
const M1_STAGES = ['WON', 'SITE_AUDIT'];

/** Stage that triggers M2 commission payment */
const M2_STAGE = 'INITIAL_SUBMISSION_AND_INSPECTION';

/** Stage that triggers M3 commission payment */
const M3_STAGE = 'WAITING_FOR_PTO';

@Injectable()
export class StageCommissionListener {
  private readonly logger = new Logger(StageCommissionListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emitter: EventEmitter2,
  ) {}

  @OnEvent('lead.stageChanged')
  async handleStageChanged(payload: LeadStageChangedPayload): Promise<void> {
    const { leadId, newStage } = payload;

    if (M1_STAGES.includes(newStage)) {
      await this.createCommissionPayments(leadId, 'M1', COMMISSION_TIERS.M1);
    } else if (newStage === M2_STAGE) {
      await this.createCommissionPayments(leadId, 'M2', COMMISSION_TIERS.M2);
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

      for (const assignment of assignments) {
        // Check if payment already exists for this user/lead/type
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

        const payment = await this.prisma.commissionPayment.create({
          data: {
            leadId,
            userId: assignment.userId,
            type,
            amount: paymentAmount,
            status: 'PENDING',
          },
        });

        this.emitter.emit('commission.created', {
          paymentId: payment.id,
          leadId,
          userId: assignment.userId,
          type,
          amount: paymentAmount,
        });

        this.logger.log(
          `${type} commission payment created for user ${assignment.userId} on lead ${leadId} (amount: ${paymentAmount ?? 'TBD'})`,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to create ${type} commission payments for lead ${leadId}: ${error.message}`,
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

      await this.createCommissionPayments(leadId, 'M3', COMMISSION_TIERS.M3);
    } catch (error: any) {
      this.logger.error(
        `Failed to check M3 eligibility for lead ${leadId}: ${error.message}`,
      );
    }
  }
}
