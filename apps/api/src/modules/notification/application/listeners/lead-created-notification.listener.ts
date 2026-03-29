import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../services/notification.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

interface LeadCreatedPayload {
  leadId: string;
  assignedTo: string;
  customerName: string;
}

@Injectable()
export class LeadCreatedNotificationListener {
  private readonly logger = new Logger(LeadCreatedNotificationListener.name);

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
}
