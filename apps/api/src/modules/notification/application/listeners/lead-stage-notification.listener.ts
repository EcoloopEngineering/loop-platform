import { Injectable, Logger, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../services/notification.service';
import { NOTIFICATION_REPOSITORY, NotificationRepositoryPort } from '../ports/notification.repository.port';

interface LeadStageChangedPayload {
  leadId: string;
  customerName: string;
  previousStage: string;
  newStage: string;
}

const STAGE_LABELS: Record<string, string> = {
  NEW_LEAD: 'New Lead',
  ALREADY_CALLED: 'Already Called',
  CONNECTED: 'Connected',
  REQUEST_DESIGN: 'Request Design',
  DESIGN_IN_PROGRESS: 'Design In Progress',
  DESIGN_READY: 'Design Ready',
  WON: 'Won',
  SITE_AUDIT: 'Site Survey',
  PROGRESS_REVIEW: 'Project Review',
  NTP: 'Notice to Proceed',
  ENGINEERING: 'Engineering Design',
  PERMIT_AND_ICE: 'Permits & ICE',
  FINAL_APPROVAL: 'Final Approval',
  INSTALL_READY: 'Install Ready',
  INSTALL: 'Installation',
  COMMISSION: 'Commissioning',
  SITE_COMPLETE: 'Site Complete',
  INITIAL_SUBMISSION_AND_INSPECTION: 'Inspection',
  WAITING_FOR_PTO: 'Waiting for PTO',
  FINAL_SUBMISSION: 'Final Submission',
  CUSTOMER_SUCCESS: 'Customer Success',
  LOST: 'Lost',
};

function stageLabel(stage: string): string {
  return STAGE_LABELS[stage] ?? stage.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

@Injectable()
export class LeadStageNotificationListener {
  private readonly logger = new Logger(LeadStageNotificationListener.name);

  constructor(
    private readonly notificationService: NotificationService,
    @Inject(NOTIFICATION_REPOSITORY) private readonly repo: NotificationRepositoryPort,
  ) {}

  private async isEnabled(eventKey: string): Promise<boolean> {
    try {
      const prefs = await this.repo.findNotificationSetting();
      if (!prefs) return true;
      return prefs[eventKey] !== false;
    } catch {
      return true;
    }
  }

  @OnEvent('lead.stageChanged')
  async handleLeadStageChanged(payload: LeadStageChangedPayload): Promise<void> {
    if (!(await this.isEnabled('stage_changes'))) return;
    this.logger.log(
      `Lead stage changed: ${payload.leadId} from ${payload.previousStage} to ${payload.newStage}`,
    );

    const usersToNotify = await this.repo.findLeadStakeholderIds(payload.leadId);
    const from = stageLabel(payload.previousStage);
    const to = stageLabel(payload.newStage);

    const notifications = usersToNotify.map((userId) =>
      this.notificationService.create({
        userId,
        event: 'LEAD_STAGE_CHANGED',
        title: `Stage Update: ${to}`,
        message: `${payload.customerName} moved from ${from} → ${to}`,
        data: {
          leadId: payload.leadId,
          previousStage: payload.previousStage,
          newStage: payload.newStage,
        },
      }),
    );

    await Promise.allSettled(notifications);
  }
}
