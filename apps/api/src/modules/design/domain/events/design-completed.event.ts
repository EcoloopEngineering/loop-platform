import { IEvent } from '@nestjs/cqrs';

export class DesignCompletedEvent implements IEvent {
  constructor(
    public readonly designRequestId: string,
    public readonly leadId: string,
    public readonly resultUrl: string,
  ) {}
}
