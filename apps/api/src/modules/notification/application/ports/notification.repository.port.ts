export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');

export interface NotificationRepositoryPort {
  create(data: {
    userId: string;
    event: string;
    title: string;
    message: string;
    data?: Record<string, any>;
    isRead: boolean;
  }): Promise<any>;

  markRead(id: string): Promise<any>;

  markAllRead(userId: string): Promise<any>;

  findByUser(userId: string, skip: number, take: number): Promise<any[]>;

  countByUser(userId: string): Promise<number>;

  countUnread(userId: string): Promise<number>;

  findDeviceToken(userId: string): Promise<{ token: string } | null>;
}
