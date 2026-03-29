import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { NotificationRepositoryPort } from '../../application/ports/notification.repository.port';

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
}
