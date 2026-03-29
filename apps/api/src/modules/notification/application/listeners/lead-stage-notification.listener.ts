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

    const notifications = usersToNotify.map((userId) =>
      this.notificationService.create({
        userId,
        event: 'LEAD_STAGE_CHANGED',
        title: 'Lead Stage Updated',
        message: `Lead for ${payload.customerName} moved from ${payload.previousStage} to ${payload.newStage}.`,
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
