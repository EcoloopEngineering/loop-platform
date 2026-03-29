import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { EmailService } from '../../../../infrastructure/email/email.service';
import { QUEUE_EMAIL } from '../../../../infrastructure/queue/queue.module';
import { EmailJobData } from '../../../../infrastructure/queue/processors/email.processor';
import {
  getInstallReadyEmail,
  getWonOwnerEmail,
  getWonCustomerEmail,
  getGenericStageEmail,
} from '../templates/stage-email-templates';

interface StageChangedPayload {
  leadId: string;
  customerName: string;
  previousStage: string;
  newStage: string;
}

@Injectable()
export class StageEmailListener {
  private readonly logger = new Logger(StageEmailListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    @InjectQueue(QUEUE_EMAIL) private readonly emailQueue: Queue<EmailJobData>,
  ) {}

  private async isNotificationEnabled(eventKey: string): Promise<boolean> {
    try {
      const setting = await this.prisma.appSetting.findUnique({ where: { key: 'notifications' } });
      if (!setting?.value) return true; // enabled by default
      const prefs = setting.value as Record<string, boolean>;
      // Check if the event is disabled AND if email channel is disabled
      if (prefs[eventKey] === false) return false;
      if (prefs.emailChannel === false) return false;
      return true;
    } catch {
      return true;
    }
  }

  @OnEvent('lead.stageChanged')
  async handleStageChanged(payload: StageChangedPayload): Promise<void> {
    if (!this.emailService.isConfigured()) return;
    if (!(await this.isNotificationEnabled('stage_changes'))) return;

    const lead = await this.prisma.lead.findUnique({
      where: { id: payload.leadId },
      include: {
        customer: true,
        assignments: {
          where: { isPrimary: true },
          include: { user: { select: { email: true, firstName: true } } },
        },
        projectManager: { select: { email: true, firstName: true } },
      },
    });

    if (!lead) return;

    const ownerEmail = lead.assignments?.[0]?.user?.email;
    const ownerName = lead.assignments?.[0]?.user?.firstName ?? 'Team Member';
    const pmEmail = lead.projectManager?.email;
    const stageName = this.formatStage(payload.newStage);

    // Determine which emails to enqueue based on stage
    switch (payload.newStage) {
      case 'INSTALL_READY':
        if (ownerEmail) {
          await this.enqueueEmail({
            to: ownerEmail,
            subject: `⚠️ Install Ready: ${payload.customerName}`,
            html: getInstallReadyEmail({ ownerName, customerName: payload.customerName }),
          });
        }
        break;

      case 'WON':
        // Email the owner
        if (ownerEmail) {
          await this.enqueueEmail({
            to: ownerEmail,
            subject: `🎉 Deal Won: ${payload.customerName}`,
            html: getWonOwnerEmail({ ownerName, customerName: payload.customerName }),
          });
        }
        // Email the customer
        if (lead.customer?.email) {
          await this.enqueueEmail({
            to: lead.customer.email,
            subject: 'Welcome to ecoLoop Solar! ☀️',
            html: getWonCustomerEmail({ customerFirstName: lead.customer.firstName }),
          });
        }
        break;

      default:
        // Generic stage change email to owner + PM
        const recipients = [ownerEmail, pmEmail].filter(Boolean) as string[];
        if (recipients.length > 0) {
          await this.enqueueEmail({
            to: recipients,
            subject: `Lead Update: ${payload.customerName} → ${stageName}`,
            html: getGenericStageEmail({
              customerName: payload.customerName,
              stageName,
              previousStageName: this.formatStage(payload.previousStage),
            }),
          });
        }
        break;
    }

    this.logger.log(`Stage email jobs enqueued for ${payload.leadId}: ${payload.newStage}`);
  }

  private async enqueueEmail(data: EmailJobData): Promise<void> {
    await this.emailQueue.add('send', data, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 3000 },
    });
  }

  private formatStage(stage: string): string {
    return stage.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
