import { IEvent } from '@nestjs/cqrs';

export class LeadStageChangedEvent implements IEvent {
  constructor(
    public readonly leadId: string,
    public readonly fromStage: string,
    public readonly toStage: string,
    public readonly userId: string,
  ) {}
}
