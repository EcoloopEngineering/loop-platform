import { IEvent } from '@nestjs/cqrs';

export class ReferralCreatedEvent implements IEvent {
  constructor(
    public readonly referralId: string,
    public readonly inviterId: string,
    public readonly inviteeId: string | null,
    public readonly hierarchyPath: string,
    public readonly hierarchyLevel: number,
  ) {}
}
