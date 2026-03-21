import { IEvent } from '@nestjs/cqrs';

export class UserCreatedEvent implements IEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly firebaseUid: string,
    public readonly role: string,
  ) {}
}
