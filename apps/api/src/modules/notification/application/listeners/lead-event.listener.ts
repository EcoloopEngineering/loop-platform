import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../services/notification.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

interface LeadCreatedPayload {
  leadId: string;
  assignedTo: string;
  customerName: string;
}

interface LeadStageChangedPayload {
  leadId: string;
  customerName: string;
  previousStage: string;
  newStage: string;
}

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
export class LeadEventListener {
  private readonly logger = new Logger(LeadEventListener.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
  ) {}

  private async isEnabled(eventKey: string): Promise<boolean> {
    try {
      const setting = await this.prisma.appSetting.findUnique({ where: { key: 'notifications' } });
      if (!setting?.value) return true;
      const prefs = setting.value as Record<string, boolean>;
      return prefs[eventKey] !== false;
    } catch {
      return true;
    }
  }

  @OnEvent('lead.created')
  async handleLeadCreated(payload: LeadCreatedPayload): Promise<void> {
    if (!(await this.isEnabled('lead_assigned'))) return;
    this.logger.log(`Lead created event received: ${payload.leadId}`);

    await this.notificationService.create({
      userId: payload.assignedTo,
      event: 'LEAD_CREATED',
      title: 'New Lead Assigned',
      message: `A new lead for ${payload.customerName} has been assigned to you.`,
      data: { leadId: payload.leadId },
    });
  }

  @OnEvent('lead.stageChanged')
  async handleLeadStageChanged(payload: LeadStageChangedPayload): Promise<void> {
    if (!(await this.isEnabled('stage_changes'))) return;
    this.logger.log(
      `Lead stage changed: ${payload.leadId} from ${payload.previousStage} to ${payload.newStage}`,
    );

    const usersToNotify = await this.getLeadStakeholders(payload.leadId);

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
    const stakeholders = await this.getLeadStakeholders(payload.leadId, [payload.pmId]);

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

    const usersToNotify = await this.getLeadStakeholders(payload.leadId);

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

    const usersToNotify = await this.getLeadStakeholders(payload.leadId);

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

  /**
   * Gets all users linked to a lead: assignees + PM + creator.
   * Excludes the user who triggered the action (via excludeIds).
   */
  private async getLeadStakeholders(leadId: string, excludeIds: string[] = []): Promise<string[]> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        createdById: true,
        projectManagerId: true,
        assignments: { select: { userId: true } },
      },
    });

    if (!lead) return [];

    const userIds = new Set<string>();

    // All assignees (owners/reps)
    for (const assignment of lead.assignments) {
      userIds.add(assignment.userId);
    }

    // Project Manager
    if (lead.projectManagerId) {
      userIds.add(lead.projectManagerId);
    }

    // Creator
    if (lead.createdById) {
      userIds.add(lead.createdById);
    }

    // Remove excluded users
    for (const id of excludeIds) {
      userIds.delete(id);
    }

    return Array.from(userIds);
  }
}
