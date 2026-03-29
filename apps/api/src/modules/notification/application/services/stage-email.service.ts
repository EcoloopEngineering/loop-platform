import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { Queue } from 'bullmq';
import { EmailService } from '../../../../infrastructure/email/email.service';
import { QUEUE_EMAIL } from '../../../../infrastructure/queue/queue.constants';
import { QueueFallbackService } from '../../../../infrastructure/queue/queue-fallback.service';
import { EmailJobData } from '../../../../infrastructure/queue/processors/email.processor';
import {
  NOTIFICATION_REPOSITORY,
  NotificationRepositoryPort,
} from '../ports/notification.repository.port';
import {
  getInstallReadyEmail,
  getWonOwnerEmail,
  getWonCustomerEmail,
  getGenericStageEmail,
} from '../templates/stage-email-templates';

export interface StageChangedPayload {
  leadId: string;
  customerName: string;
  previousStage: string;
  newStage: string;
}

@Injectable()
export class StageEmailService {
  private readonly logger = new Logger(StageEmailService.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepo: NotificationRepositoryPort,
    private readonly emailService: EmailService,
    private readonly queueFallback: QueueFallbackService,
    @Optional() @Inject(`BullQueue_${QUEUE_EMAIL}`) private readonly emailQueue: Queue<EmailJobData> | null,
  ) {}

  async handleStageChanged(payload: StageChangedPayload): Promise<void> {
    if (!this.emailService.isConfigured()) return;
    if (!(await this.isNotificationEnabled('stage_changes'))) return;

    const lead = await this.notificationRepo.findLeadWithStakeholders(payload.leadId);
    if (!lead) return;

    const ownerEmail = lead.assignments?.[0]?.user?.email;
    const ownerName = lead.assignments?.[0]?.user?.firstName ?? 'Team Member';
    const pmEmail = lead.projectManager?.email;
    const stageName = this.formatStage(payload.newStage);

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
        if (ownerEmail) {
          await this.enqueueEmail({
            to: ownerEmail,
            subject: `🎉 Deal Won: ${payload.customerName}`,
            html: getWonOwnerEmail({ ownerName, customerName: payload.customerName }),
          });
        }
        if (lead.customer?.email) {
          await this.enqueueEmail({
            to: lead.customer.email,
            subject: 'Welcome to ecoLoop Solar! ☀️',
            html: getWonCustomerEmail({ customerFirstName: lead.customer.firstName }),
          });
        }
        break;

      default: {
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
    }

    this.logger.log(`Stage email jobs enqueued for ${payload.leadId}: ${payload.newStage}`);
  }

  private async isNotificationEnabled(eventKey: string): Promise<boolean> {
    try {
      const prefs = await this.notificationRepo.findNotificationSetting();
      if (!prefs) return true;
      if (prefs[eventKey] === false) return false;
      if (prefs.emailChannel === false) return false;
      return true;
    } catch {
      return true;
    }
  }

  private async enqueueEmail(data: EmailJobData): Promise<void> {
    await this.queueFallback.addOrExecute(
      this.emailQueue,
      'send',
      data,
      { attempts: 5, backoff: { type: 'exponential', delay: 3000 } },
      async (jobData) => {
        const sent = await this.emailService.send(jobData);
        if (!sent) {
          this.logger.warn(`[Fallback] Email delivery failed for ${jobData.to}`);
        }
      },
    );
  }

  formatStage(stage: string): string {
    return stage.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
