import { IEvent } from '@nestjs/cqrs';

export class LeadCreatedEvent implements IEvent {
  constructor(
    public readonly leadId: string,
    public readonly customerId: string,
    public readonly userId: string,
  ) {}
}
