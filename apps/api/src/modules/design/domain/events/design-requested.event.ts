import { IEvent } from '@nestjs/cqrs';

export class DesignRequestedEvent implements IEvent {
  constructor(
    public readonly designRequestId: string,
    public readonly leadId: string,
    public readonly designType: string,
    public readonly createdBy: string,
  ) {}
}
