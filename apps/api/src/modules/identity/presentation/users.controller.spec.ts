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
  let s3Service: {
    isConfigured: jest.Mock;
    upload: jest.Mock;
    getObject: jest.Mock;
  };

  beforeEach(async () => {
    queryBus = { execute: jest.fn() };
    commandBus = { execute: jest.fn() };
    prisma = createMockPrismaService();
    s3Service = {
      isConfigured: jest.fn().mockReturnValue(false),
      upload: jest.fn().mockResolvedValue('https://s3.example.com/key'),
      getObject: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: QueryBus, useValue: queryBus },
        { provide: CommandBus, useValue: commandBus },
        { provide: PrismaService, useValue: prisma },
        { provide: S3Service, useValue: s3Service },
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

    it('should strip passwordHash even when other fields are missing', async () => {
      const fullUser = {
        id: 'user-2', email: 'user2@test.com',
        passwordHash: 'hash123',
      };
      queryBus.execute.mockResolvedValue(fullUser);

      const result = await controller.getMe({ id: 'user-2' } as any);

      expect(result.id).toBe('user-2');
      expect((result as any).passwordHash).toBeUndefined();
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

  describe('uploadAvatar', () => {
    it('should return error when no file provided', async () => {
      const result = await controller.uploadAvatar(undefined, 'user-1');
      expect(result).toEqual({ error: 'No file provided' });
    });

    it('should upload to S3 when configured and save avatar path', async () => {
      s3Service.isConfigured.mockReturnValue(true);
      const mockFile = {
        originalname: 'photo.png',
        buffer: Buffer.from('image-data'),
        mimetype: 'image/png',
      };
      prisma.user.update.mockResolvedValue({});

      const result = await controller.uploadAvatar(mockFile, 'user-1');

      expect(s3Service.upload).toHaveBeenCalledWith(
        expect.objectContaining({
          body: mockFile.buffer,
          contentType: 'image/png',
        }),
      );
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            profileImage: '/api/v1/users/avatar/user-1',
          }),
        }),
      );
      expect(result.url).toBe('/api/v1/users/avatar/user-1');
    });

    it('should save avatar path even when S3 is not configured', async () => {
      s3Service.isConfigured.mockReturnValue(false);
      const mockFile = {
        originalname: 'photo.jpg',
        buffer: Buffer.from('data'),
        mimetype: 'image/jpeg',
      };
      prisma.user.update.mockResolvedValue({});

      const result = await controller.uploadAvatar(mockFile, 'user-1');

      expect(s3Service.upload).not.toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalled();
      expect(result.url).toBe('/api/v1/users/avatar/user-1');
    });
  });

  describe('getAvatar', () => {
    function mockRes() {
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        setHeader: jest.fn(),
        end: jest.fn(),
      };
      return res;
    }

    it('should return 404 when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const res = mockRes();

      await controller.getAvatar('nonexistent', res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should return 404 when user has no avatar', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', metadata: {} });
      const res = mockRes();

      await controller.getAvatar('user-1', res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'No avatar' });
    });

    it('should return 404 when S3 is not configured but avatar key exists', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        metadata: { avatarS3Key: 'avatars/user-1.png' },
      });
      s3Service.isConfigured.mockReturnValue(false);
      const res = mockRes();

      await controller.getAvatar('user-1', res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'No avatar' });
    });

    it('should stream avatar from S3 when configured', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        metadata: { avatarS3Key: 'avatars/user-1.png' },
      });
      s3Service.isConfigured.mockReturnValue(true);

      // Mock an async iterable body (simulating S3 stream)
      const imageBuffer = Buffer.from('fake-image-data');
      const mockBody = {
        async *[Symbol.asyncIterator]() {
          yield imageBuffer;
        },
      };
      s3Service.getObject.mockResolvedValue({
        body: mockBody,
        contentType: 'image/png',
      });

      const res = mockRes();
      await controller.getAvatar('user-1', res);

      expect(s3Service.getObject).toHaveBeenCalledWith('avatars/user-1.png');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png');
      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=86400');
      expect(res.setHeader).toHaveBeenCalledWith('Cross-Origin-Resource-Policy', 'cross-origin');
      expect(res.end).toHaveBeenCalled();
    });

    it('should return 404 when S3 getObject throws', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        metadata: { avatarS3Key: 'avatars/user-1.png' },
      });
      s3Service.isConfigured.mockReturnValue(true);
      s3Service.getObject.mockRejectedValue(new Error('NoSuchKey'));

      const res = mockRes();
      await controller.getAvatar('user-1', res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Avatar not found in storage' });
    });
  });
});
