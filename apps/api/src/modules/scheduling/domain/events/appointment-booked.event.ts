import { IEvent } from '@nestjs/cqrs';

export class AppointmentBookedEvent implements IEvent {
  constructor(
    public readonly appointmentId: string,
    public readonly leadId: string,
    public readonly type: string,
    public readonly scheduledAt: Date,
  ) {}
}
