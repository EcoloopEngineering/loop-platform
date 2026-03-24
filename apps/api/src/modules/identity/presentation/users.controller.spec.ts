import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UsersController } from './users.controller';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { createMockPrismaService, MockPrismaService } from '../../../test/prisma-mock.helper';
import { S3Service } from '../../../infrastructure/storage/s3.service';
import { UserRole } from '@loop/shared';

describe('UsersController', () => {
  let controller: UsersController;
  let queryBus: { execute: jest.Mock };
  let commandBus: { execute: jest.Mock };
  let prisma: MockPrismaService;

  beforeEach(async () => {
    queryBus = { execute: jest.fn() };
    commandBus = { execute: jest.fn() };
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: QueryBus, useValue: queryBus },
        { provide: CommandBus, useValue: commandBus },
        { provide: PrismaService, useValue: prisma },
        { provide: S3Service, useValue: { isConfigured: jest.fn().mockReturnValue(false), upload: jest.fn(), getObject: jest.fn() } },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  describe('changeRole', () => {
    it('should update user role and return updated user', async () => {
      const updatedUser = { id: 'user-1', role: UserRole.MANAGER };
      prisma.user.update.mockResolvedValue(updatedUser);
      queryBus.execute.mockResolvedValue(updatedUser);

      const result = await controller.changeRole('user-1', { role: UserRole.MANAGER });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { role: UserRole.MANAGER },
      });
      expect(result).toEqual(updatedUser);
    });
  });

  describe('getMe', () => {
    it('should return user without sensitive fields', async () => {
      const fullUser = {
        id: 'user-1', email: 'test@test.com', firstName: 'Test',
        passwordHash: 'secret', metadata: { token: 'x' }, socialSecurityNumber: '123',
      };
      queryBus.execute.mockResolvedValue(fullUser);

      const result = await controller.getMe({ id: 'user-1' } as any);

      expect(result.id).toBe('user-1');
      expect(result.email).toBe('test@test.com');
      expect((result as any).passwordHash).toBeUndefined();
      expect((result as any).metadata).toBeUndefined();
      expect((result as any).socialSecurityNumber).toBeUndefined();
    });
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      const user = { id: 'user-1' };
      queryBus.execute.mockResolvedValue(user);

      const result = await controller.findOne('user-1');

      expect(result).toEqual(user);
    });
  });
});
