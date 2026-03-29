import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LeadStage } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

@Injectable()
export class AutoAdvanceInstallsHandler {
  private readonly logger = new Logger(AutoAdvanceInstallsHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron(): Promise<void> {
    await this.advanceInstalls();
  }

  /**
   * Find leads with INSTALL stage and scheduleDate matching today,
   * then advance them to COMMISSION.
   */
  async advanceInstalls(): Promise<number> {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

    this.logger.log(`Auto-advance installs check for date: ${dateStr}`);

    try {
      const leads = await this.prisma.lead.findMany({
        where: {
          currentStage: 'INSTALL',
        },
        include: {
          customer: { select: { firstName: true, lastName: true } },
        },
      });

      let advancedCount = 0;

      for (const lead of leads) {
        const metadata = lead.metadata as Record<string, any> | null;
        const scheduleDate = metadata?.scheduleDate;

        if (!scheduleDate || scheduleDate !== dateStr) {
          continue;
        }

        await this.prisma.lead.update({
          where: { id: lead.id },
          data: { currentStage: LeadStage.COMMISSION },
        });

        await this.prisma.leadActivity.create({
          data: {
            leadId: lead.id,
            userId: lead.createdById ?? '',
            type: 'STAGE_CHANGE',
            description: 'Auto-advanced from INSTALL to COMMISSION (scheduled date reached)',
            metadata: {
              previousStage: 'INSTALL',
              newStage: 'COMMISSION',
              automated: true,
            },
          },
        });

        const customerName = lead.customer
          ? `${lead.customer.firstName} ${lead.customer.lastName}`
          : 'Unknown';

        this.emitter.emit('lead.stageChanged', {
          leadId: lead.id,
          customerName,
          previousStage: 'INSTALL',
          newStage: 'COMMISSION',
        });

        advancedCount++;
        this.logger.log(`Lead ${lead.id} auto-advanced to COMMISSION`);
      }

      this.logger.log(`Auto-advance complete: ${advancedCount} leads advanced`);
      return advancedCount;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Auto-advance installs failed: ${message}`);
      return 0;
    }
  }
}
