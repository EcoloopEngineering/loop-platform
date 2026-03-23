export enum NotificationType {
  LEAD_CREATED = 'LEAD_CREATED',
  LEAD_STAGE_CHANGED = 'LEAD_STAGE_CHANGED',
  LEAD_ASSIGNED = 'LEAD_ASSIGNED',
  LEAD_UNASSIGNED = 'LEAD_UNASSIGNED',
  LEAD_PM_ASSIGNED = 'LEAD_PM_ASSIGNED',
  LEAD_PM_REMOVED = 'LEAD_PM_REMOVED',
  LEAD_UPDATED = 'LEAD_UPDATED',
  LEAD_NOTE_ADDED = 'LEAD_NOTE_ADDED',
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
