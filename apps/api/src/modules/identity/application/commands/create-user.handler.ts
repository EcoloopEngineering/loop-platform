import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { ConflictException, Inject } from '@nestjs/common';
import { UserRole } from '@loop/shared';
import {
  USER_REPOSITORY,
  UserRepositoryPort,
} from '../ports/user.repository.port';
import { UserEntity } from '../../domain/entities/user.entity';
import { UserCreatedEvent } from '../../domain/events/user-created.event';

export class CreateUserCommand {
  constructor(
    public readonly email: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly firebaseUid: string,
    public readonly phone?: string,
    public readonly role?: UserRole,
  ) {}
}

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateUserCommand): Promise<UserEntity> {
    const existingByEmail = await this.userRepository.findByEmail(
      command.email,
    );
    if (existingByEmail) {
      throw new ConflictException('User with this email already exists');
    }

    const existingByUid = await this.userRepository.findByFirebaseUid(
      command.firebaseUid,
    );
    if (existingByUid) {
      throw new ConflictException(
        'User with this Firebase UID already exists',
      );
    }

    const user = await this.userRepository.create({
      email: command.email,
      firstName: command.firstName,
      lastName: command.lastName,
      firebaseUid: command.firebaseUid,
      phone: command.phone ?? null,
      role: command.role ?? UserRole.SALES_REP,
    });

    this.eventBus.publish(
      new UserCreatedEvent(user.id, user.email, user.firebaseUid, user.role),
    );

    return user;
  }
}
