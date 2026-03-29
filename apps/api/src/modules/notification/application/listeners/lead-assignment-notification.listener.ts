import { Injectable, Logger, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../services/notification.service';
import { NOTIFICATION_REPOSITORY, NotificationRepositoryPort } from '../ports/notification.repository.port';

interface LeadAssignedPayload {
  leadId: string;
  assigneeId: string;
  customerName: string;
  assignedByName: string;
  isPrimary: boolean;
}

interface LeadPMAssignedPayload {
  leadId: string;
  pmId: string;
  pmName: string;
  customerName: string;
  assignedByName: string;
}

interface LeadPMRemovedPayload {
  leadId: string;
  pmId: string;
  customerName: string;
  removedByName: string;
}

interface LeadUpdatedPayload {
  leadId: string;
  customerName: string;
  updatedByName: string;
  changes: string;
}

interface LeadNoteAddedPayload {
  leadId: string;
  customerName: string;
  addedByName: string;
  notePreview: string;
}

@Injectable()
export class LeadAssignmentNotificationListener {
  private readonly logger = new Logger(LeadAssignmentNotificationListener.name);

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

  @OnEvent('lead.assigned')
  async handleLeadAssigned(payload: LeadAssignedPayload): Promise<void> {
    if (!(await this.isEnabled('lead_assigned'))) return;
    this.logger.log(`Lead assigned: ${payload.leadId} to ${payload.assigneeId}`);

    await this.notificationService.create({
      userId: payload.assigneeId,
      event: 'LEAD_ASSIGNED',
      title: 'You were assigned to a lead',
      message: `${payload.assignedByName} assigned you to the lead for ${payload.customerName}${payload.isPrimary ? ' as primary owner' : ''}.`,
      data: { leadId: payload.leadId, isPrimary: payload.isPrimary },
    });
  }

  @OnEvent('lead.pmAssigned')
  async handleLeadPMAssigned(payload: LeadPMAssignedPayload): Promise<void> {
    this.logger.log(`PM assigned: ${payload.pmId} to lead ${payload.leadId}`);

    // Notify the PM
    await this.notificationService.create({
      userId: payload.pmId,
      event: 'LEAD_PM_ASSIGNED',
      title: 'You were assigned as Project Manager',
      message: `${payload.assignedByName} assigned you as PM for the lead for ${payload.customerName}.`,
      data: { leadId: payload.leadId },
    });

    // Notify other stakeholders
    const stakeholders = await this.repo.findLeadStakeholderIds(payload.leadId, [payload.pmId]);

    const notifications = stakeholders.map((userId) =>
      this.notificationService.create({
        userId,
        event: 'LEAD_PM_ASSIGNED',
        title: 'Project Manager Assigned',
        message: `${payload.pmName} was assigned as PM for the lead for ${payload.customerName}.`,
        data: { leadId: payload.leadId, pmId: payload.pmId },
      }),
    );

    await Promise.allSettled(notifications);
  }

  @OnEvent('lead.pmRemoved')
  async handleLeadPMRemoved(payload: LeadPMRemovedPayload): Promise<void> {
    this.logger.log(`PM removed from lead ${payload.leadId}`);

    await this.notificationService.create({
      userId: payload.pmId,
      event: 'LEAD_PM_REMOVED',
      title: 'You were removed as Project Manager',
      message: `${payload.removedByName} removed you as PM from the lead for ${payload.customerName}.`,
      data: { leadId: payload.leadId },
    });
  }

  @OnEvent('lead.updated')
  async handleLeadUpdated(payload: LeadUpdatedPayload): Promise<void> {
    this.logger.log(`Lead updated: ${payload.leadId}`);

    const usersToNotify = await this.repo.findLeadStakeholderIds(payload.leadId);

    const notifications = usersToNotify.map((userId) =>
      this.notificationService.create({
        userId,
        event: 'LEAD_UPDATED',
        title: 'Lead Information Updated',
        message: `${payload.updatedByName} updated the lead for ${payload.customerName}: ${payload.changes}.`,
        data: { leadId: payload.leadId },
      }),
    );

    await Promise.allSettled(notifications);
  }

  @OnEvent('lead.noteAdded')
  async handleLeadNoteAdded(payload: LeadNoteAddedPayload): Promise<void> {
    this.logger.log(`Note added to lead: ${payload.leadId}`);

    const usersToNotify = await this.repo.findLeadStakeholderIds(payload.leadId);

    const notifications = usersToNotify.map((userId) =>
      this.notificationService.create({
        userId,
        event: 'LEAD_NOTE_ADDED',
        title: 'New Note on Lead',
        message: `${payload.addedByName} added a note on lead for ${payload.customerName}: "${payload.notePreview}"`,
        data: { leadId: payload.leadId },
      }),
    );

    await Promise.allSettled(notifications);
  }
}
