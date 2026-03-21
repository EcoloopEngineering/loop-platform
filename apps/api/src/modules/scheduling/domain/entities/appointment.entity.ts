export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum AppointmentType {
  SITE_SURVEY = 'SITE_SURVEY',
  CONSULTATION = 'CONSULTATION',
  INSTALLATION = 'INSTALLATION',
  FOLLOW_UP = 'FOLLOW_UP',
}

export class AppointmentEntity {
  id: string;
  leadId: string;
  type: AppointmentType;
  status: AppointmentStatus;
  scheduledAt: Date;
  endAt: Date;
  assignedTo: string;
  location: string | null;
  notes: string | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<AppointmentEntity>) {
    Object.assign(this, partial);
  }

  reschedule(newStart: Date, newEnd: Date): void {
    this.scheduledAt = newStart;
    this.endAt = newEnd;
    this.status = AppointmentStatus.SCHEDULED;
    this.updatedAt = new Date();
  }

  cancel(reason: string): void {
    this.status = AppointmentStatus.CANCELLED;
    this.cancelledAt = new Date();
    this.cancelReason = reason;
    this.updatedAt = new Date();
  }

  confirm(): void {
    this.status = AppointmentStatus.CONFIRMED;
    this.updatedAt = new Date();
  }

  complete(): void {
    this.status = AppointmentStatus.COMPLETED;
    this.updatedAt = new Date();
  }
}
