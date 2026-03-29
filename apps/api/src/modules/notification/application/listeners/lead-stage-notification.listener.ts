import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../services/notification.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

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

  /**
   * Gets all users linked to a lead: assignees + PM + creator.
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

    for (const assignment of lead.assignments) {
      userIds.add(assignment.userId);
    }

    if (lead.projectManagerId) {
      userIds.add(lead.projectManagerId);
    }

    if (lead.createdById) {
      userIds.add(lead.createdById);
    }

    for (const id of excludeIds) {
      userIds.delete(id);
    }

    return Array.from(userIds);
  }
}
