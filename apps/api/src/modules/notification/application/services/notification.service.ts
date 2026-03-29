import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  NOTIFICATION_REPOSITORY,
  NotificationRepositoryPort,
} from '../ports/notification.repository.port';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepo: NotificationRepositoryPort,
  ) {}

  async create(params: {
    userId: string;
    event: string;
    title: string;
    message: string;
    data?: Record<string, any>;
  }) {
    const notification = await this.notificationRepo.create({
      userId: params.userId,
      event: params.event,
      title: params.title,
      message: params.message,
      data: params.data,
      isRead: false,
    });

    // Attempt push notification via Firebase (fire and forget)
    this.sendPush(params.userId, params.title, params.message, params.data).catch(
      (err) => this.logger.warn(`Failed to send push notification: ${err.message}`),
    );

    return notification;
  }

  async markRead(notificationId: string) {
    return this.notificationRepo.markRead(notificationId);
  }

  async markAllRead(userId: string) {
    return this.notificationRepo.markAllRead(userId);
  }

  async getByUser(userId: string, skip = 0, take = 20) {
    const [data, total, unread] = await Promise.all([
      this.notificationRepo.findByUser(userId, skip, take),
      this.notificationRepo.countByUser(userId),
      this.notificationRepo.countUnread(userId),
    ]);
    return { data, total, unread };
  }

  async getUnreadCount(userId: string) {
    const count = await this.notificationRepo.countUnread(userId);
    return { count };
  }

  private async sendPush(
    userId: string,
    title: string,
    _body: string,
    _data?: Record<string, any>,
  ): Promise<void> {
    // Look up the user's FCM token
    const device = await this.notificationRepo.findDeviceToken(userId);

    if (!device?.token) {
      this.logger.debug(`No device token for user ${userId}, skipping push`);
      return;
    }

    // Firebase Admin SDK messaging would be called here
    // e.g., await this.firebaseService.sendPushNotification(device.token, title, body, data);
    this.logger.debug(`Push notification sent to user ${userId}: ${title}`);
  }
}
