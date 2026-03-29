import { Test } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { UserRole } from '@loop/shared';
import {
  CreateUserHandler,
  CreateUserCommand,
} from './create-user.handler';
import { USER_REPOSITORY } from '../ports/user.repository.port';
import { UserEntity } from '../../domain/entities/user.entity';
import { UserCreatedEvent } from '../../domain/events/user-created.event';

describe('CreateUserHandler', () => {
  let handler: CreateUserHandler;
  let userRepository: Record<string, jest.Mock>;
  let eventBus: { publish: jest.Mock };

  beforeEach(async () => {
    userRepository = {
      findByEmail: jest.fn(),
      findByFirebaseUid: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      findAll: jest.fn(),
    };

    eventBus = { publish: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        CreateUserHandler,
        { provide: USER_REPOSITORY, useValue: userRepository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get(CreateUserHandler);
  });

  const baseCommand = new CreateUserCommand(
    'john@example.com',
    'John',
    'Doe',
    'firebase-uid-123',
    '555-1234',
    UserRole.SALES_REP,
  );

  it('should throw ConflictException when email already exists', async () => {
    userRepository.findByEmail.mockResolvedValue(
      new UserEntity({ id: 'existing', email: 'john@example.com' }),
    );

    await expect(handler.execute(baseCommand)).rejects.toThrow(
      ConflictException,
    );
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it('should throw ConflictException when Firebase UID already exists', async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.findByFirebaseUid.mockResolvedValue(
      new UserEntity({ id: 'existing', firebaseUid: 'firebase-uid-123' }),
    );

    await expect(handler.execute(baseCommand)).rejects.toThrow(
      ConflictException,
    );
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it('should create a user and publish UserCreatedEvent', async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.findByFirebaseUid.mockResolvedValue(null);

    const createdUser = new UserEntity({
      id: 'user-1',
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
      firebaseUid: 'firebase-uid-123',
      phone: '555-1234',
      role: UserRole.SALES_REP,
    });
    userRepository.create.mockResolvedValue(createdUser);

    const result = await handler.execute(baseCommand);

    expect(userRepository.create).toHaveBeenCalledWith({
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
      firebaseUid: 'firebase-uid-123',
      phone: '555-1234',
      role: UserRole.SALES_REP,
    });
    expect(result).toEqual(createdUser);
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.any(UserCreatedEvent),
    );
  });

  it('should default to SALES_REP role when role is not provided', async () => {
    const commandNoRole = new CreateUserCommand(
      'jane@example.com',
      'Jane',
      'Smith',
      'firebase-uid-456',
    );

    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.findByFirebaseUid.mockResolvedValue(null);

    const createdUser = new UserEntity({
      id: 'user-2',
      email: 'jane@example.com',
      role: UserRole.SALES_REP,
    });
    userRepository.create.mockResolvedValue(createdUser);

    await handler.execute(commandNoRole);

    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        role: UserRole.SALES_REP,
        phone: null,
      }),
    );
  });

  it('should default phone to null when not provided', async () => {
    const commandNoPhone = new CreateUserCommand(
      'nophone@example.com',
      'No',
      'Phone',
      'firebase-uid-789',
      undefined,
      UserRole.ADMIN,
    );

    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.findByFirebaseUid.mockResolvedValue(null);
    userRepository.create.mockResolvedValue(
      new UserEntity({ id: 'user-3', role: UserRole.ADMIN }),
    );

    await handler.execute(commandNoPhone);

    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ phone: null, role: UserRole.ADMIN }),
    );
  });
});
