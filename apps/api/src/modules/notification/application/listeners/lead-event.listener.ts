import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../services/notification.service';
import { NotificationType } from '../../domain/entities/notification.entity';

interface LeadCreatedPayload {
  leadId: string;
  assignedTo: string;
  customerName: string;
}

interface LeadStageChangedPayload {
  leadId: string;
  assignedTo: string;
  customerName: string;
  previousStage: string;
  newStage: string;
}

@Injectable()
export class LeadEventListener {
  private readonly logger = new Logger(LeadEventListener.name);

  constructor(private readonly notificationService: NotificationService) {}

  @OnEvent('lead.created')
  async handleLeadCreated(payload: LeadCreatedPayload): Promise<void> {
    this.logger.log(`Lead created event received: ${payload.leadId}`);

    await this.notificationService.create({
      userId: payload.assignedTo,
      type: NotificationType.LEAD_CREATED,
      title: 'New Lead Assigned',
      body: `A new lead for ${payload.customerName} has been assigned to you.`,
      data: { leadId: payload.leadId },
    });
  }

  @OnEvent('lead.stageChanged')
  async handleLeadStageChanged(payload: LeadStageChangedPayload): Promise<void> {
    this.logger.log(
      `Lead stage changed: ${payload.leadId} from ${payload.previousStage} to ${payload.newStage}`,
    );

    await this.notificationService.create({
      userId: payload.assignedTo,
      type: NotificationType.LEAD_STAGE_CHANGED,
      title: 'Lead Stage Updated',
      body: `Lead for ${payload.customerName} moved from ${payload.previousStage} to ${payload.newStage}.`,
      data: {
        leadId: payload.leadId,
        previousStage: payload.previousStage,
        newStage: payload.newStage,
      },
    });
  }
}
