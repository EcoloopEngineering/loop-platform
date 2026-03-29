import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { QUEUE_COMMISSION } from '../queue.module';

export interface CommissionJobData {
  leadId: string;
  type: 'M1' | 'M2' | 'M3';
  tierPct: number;
}

@Processor(QUEUE_COMMISSION)
export class CommissionProcessor extends WorkerHost {
  private readonly logger = new Logger(CommissionProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<CommissionJobData>): Promise<void> {
    const { leadId, type, tierPct } = job.data;
    this.logger.log(`Processing ${type} commission job ${job.id} for lead ${leadId}`);

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

    // Upsert commission payments for each assignee (idempotent via unique constraint)
    for (const assignment of assignments) {
      const paymentAmount = baseAmount !== null
        ? Math.round(baseAmount * tierPct * 100) / 100
        : null;

      const payment = await this.prisma.commissionPayment.upsert({
        where: {
          leadId_userId_type: {
            leadId,
            userId: assignment.userId,
            type,
          },
        },
        update: {},
        create: {
          leadId,
          userId: assignment.userId,
          type,
          amount: paymentAmount,
          status: 'PENDING',
        },
      });

      // Only emit if the payment was just created (no updatedAt drift)
      if (payment.createdAt.getTime() === payment.updatedAt.getTime()) {
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
      } else {
        this.logger.debug(
          `${type} commission payment already exists for user ${assignment.userId} on lead ${leadId}`,
        );
      }
    }
  }
}
