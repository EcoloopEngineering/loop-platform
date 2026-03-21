export enum NotificationType {
  LEAD_CREATED = 'LEAD_CREATED',
  LEAD_STAGE_CHANGED = 'LEAD_STAGE_CHANGED',
  APPOINTMENT_BOOKED = 'APPOINTMENT_BOOKED',
  DESIGN_COMPLETED = 'DESIGN_COMPLETED',
  COMMISSION_FINALIZED = 'COMMISSION_FINALIZED',
  SYSTEM = 'SYSTEM',
}

export class NotificationEntity {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, any> | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;

  constructor(partial: Partial<NotificationEntity>) {
    Object.assign(this, partial);
  }

  markRead(): void {
    this.isRead = true;
    this.readAt = new Date();
  }
}
