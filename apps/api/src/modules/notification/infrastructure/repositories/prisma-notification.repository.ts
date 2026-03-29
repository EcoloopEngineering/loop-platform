import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  NotificationRepositoryPort,
  LeadStakeholders,
} from '../../application/ports/notification.repository.port';

@Injectable()
export class PrismaNotificationRepository implements NotificationRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: string;
    event: string;
    title: string;
    message: string;
    data?: Record<string, any>;
    isRead: boolean;
  }): Promise<any> {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        event: data.event,
        title: data.title,
        message: data.message,
        data: data.data ?? undefined,
        isRead: data.isRead,
      },
    });
  }

  async markRead(id: string): Promise<any> {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string): Promise<any> {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async findByUser(userId: string, skip: number, take: number): Promise<any[]> {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  async countByUser(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId } });
  }

  async countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async findDeviceToken(userId: string): Promise<{ token: string } | null> {
    return this.prisma.userDevice.findUnique({
      where: { userId },
      select: { token: true },
    });
  }

  // ── Lead stakeholder lookups ────────────────────────────────────────────

  async findLeadWithStakeholders(leadId: string): Promise<LeadStakeholders | null> {
    return this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        customer: true,
        assignments: {
          where: { isPrimary: true },
          include: { user: { select: { email: true, firstName: true } } },
        },
        projectManager: { select: { email: true, firstName: true } },
        property: { select: { streetAddress: true, city: true, state: true } },
      },
    }) as Promise<LeadStakeholders | null>;
  }

  async findLeadMetadata(leadId: string): Promise<{ metadata: unknown } | null> {
    return this.prisma.lead.findUnique({
      where: { id: leadId },
      select: { metadata: true },
    });
  }

  async findLeadWithPrimaryAssignment(leadId: string): Promise<{
    id: string;
    assignments: Array<{
      isPrimary: boolean;
      user: { firstName: string; lastName: string } | null;
    }>;
  } | null> {
    return this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        assignments: {
          where: { isPrimary: true },
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    }) as any;
  }

  async updateLeadMetadata(leadId: string, metadata: Record<string, unknown>): Promise<void> {
    await this.prisma.lead.update({
      where: { id: leadId },
      data: { metadata: metadata as any },
    });
  }

  // ── Settings ────────────────────────────────────────────────────────────

  async findNotificationSetting(): Promise<Record<string, boolean> | null> {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key: 'notifications' },
    });
    return (setting?.value as Record<string, boolean>) ?? null;
  }
}
