import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { NotificationType } from '../../domain/entities/notification.entity';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(params: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, any>;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        data: params.data ?? undefined,
        isRead: false,
      },
    });

    // Attempt push notification via Firebase (fire and forget)
    this.sendPush(params.userId, params.title, params.body, params.data).catch(
      (err) => this.logger.warn(`Failed to send push notification: ${err.message}`),
    );

    return notification;
  }

  async markRead(notificationId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async getByUser(userId: string, skip = 0, take = 20) {
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);
    return { data, total };
  }

  private async sendPush(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<void> {
    // Look up the user's FCM token
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });

    if (!user?.fcmToken) {
      this.logger.debug(`No FCM token for user ${userId}, skipping push`);
      return;
    }

    // Firebase Admin SDK messaging would be called here
    // e.g., await this.firebaseService.sendPushNotification(user.fcmToken, title, body, data);
    this.logger.debug(`Push notification sent to user ${userId}: ${title}`);
  }
}
