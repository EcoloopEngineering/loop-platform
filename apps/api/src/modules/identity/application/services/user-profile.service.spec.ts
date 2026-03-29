import { Test, TestingModule } from '@nestjs/testing';
import { QueryBus } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { UserProfileService } from './user-profile.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { S3Service } from '../../../../infrastructure/storage/s3.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';
import { UserRole } from '@loop/shared';
import { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';

describe('UserProfileService', () => {
  let service: UserProfileService;
  let queryBus: { execute: jest.Mock };
  let prisma: MockPrismaService;
  let s3Service: {
    isConfigured: jest.Mock;
    upload: jest.Mock;
    getObject: jest.Mock;
  };

  const mockUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'test@test.com',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.SALES_REP,
    isActive: true,
    profileImage: null,
  };

  beforeEach(async () => {
    queryBus = { execute: jest.fn() };
    prisma = createMockPrismaService();
    s3Service = {
      isConfigured: jest.fn().mockReturnValue(false),
      upload: jest.fn().mockResolvedValue('https://s3.example.com/key'),
      getObject: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserProfileService,
        { provide: QueryBus, useValue: queryBus },
        { provide: PrismaService, useValue: prisma },
        { provide: S3Service, useValue: s3Service },
      ],
    }).compile();

    service = module.get<UserProfileService>(UserProfileService);
  });

  /* ------------------------------------------------------------------ */
  /*  getProfile                                                         */
  /* ------------------------------------------------------------------ */
  describe('getProfile', () => {
    it('should return user without sensitive fields and include darkMode/compactView', async () => {
      const fullUser = {
        id: 'user-1',
        email: 'test@test.com',
        firstName: 'Test',
        passwordHash: 'secret',
        metadata: { darkMode: true, compactView: false },
        socialSecurityNumber: '123-45-6789',
        firebaseUid: 'fb-uid',
      };
      queryBus.execute.mockResolvedValue(fullUser);

      const result = await service.getProfile('user-1');

      expect(result.id).toBe('user-1');
      expect(result.darkMode).toBe(true);
      expect(result.compactView).toBe(false);
      expect((result as any).passwordHash).toBeUndefined();
      expect((result as any).metadata).toBeUndefined();
      expect((result as any).socialSecurityNumber).toBeUndefined();
      expect((result as any).firebaseUid).toBeUndefined();
    });

    it('should default darkMode and compactView to false when metadata is null', async () => {
      const fullUser = { id: 'user-2', email: 'u2@test.com', passwordHash: 'hash' };
      queryBus.execute.mockResolvedValue(fullUser);

      const result = await service.getProfile('user-2');

      expect(result.darkMode).toBe(false);
      expect(result.compactView).toBe(false);
      expect((result as any).passwordHash).toBeUndefined();
    });
  });

  /* ------------------------------------------------------------------ */
  /*  updateProfile                                                      */
  /* ------------------------------------------------------------------ */
  describe('updateProfile', () => {
    it('should update basic profile fields', async () => {
      const updated = {
        id: 'user-1',
        firstName: 'Updated',
        lastName: 'User',
        passwordHash: 'hash',
        metadata: null,
        socialSecurityNumber: null,
        firebaseUid: 'fb',
      };
      prisma.user.update.mockResolvedValue(updated);

      const result = await service.updateProfile(mockUser, { firstName: 'Updated' });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { firstName: 'Updated' },
      });
      expect(result.firstName).toBe('Updated');
      expect((result as any).passwordHash).toBeUndefined();
    });

    it('should merge metadata when darkMode or compactView are provided', async () => {
      prisma.user.findUnique.mockResolvedValue({ metadata: { existing: 'value' } });
      prisma.user.update.mockResolvedValue({
        id: 'user-1',
        metadata: { existing: 'value', darkMode: true },
        passwordHash: 'h',
        socialSecurityNumber: null,
        firebaseUid: 'f',
      });

      await service.updateProfile(mockUser, { darkMode: true } as any);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { metadata: true },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { metadata: { existing: 'value', darkMode: true } },
      });
    });

    it('should handle null metadata when merging preferences', async () => {
      prisma.user.findUnique.mockResolvedValue({ metadata: null });
      prisma.user.update.mockResolvedValue({
        id: 'user-1',
        metadata: { compactView: true },
        passwordHash: 'h',
        socialSecurityNumber: null,
        firebaseUid: 'f',
      });

      await service.updateProfile(mockUser, { compactView: true } as any);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { metadata: { compactView: true } },
      });
    });
  });

  /* ------------------------------------------------------------------ */
  /*  uploadAvatar                                                       */
  /* ------------------------------------------------------------------ */
  describe('uploadAvatar', () => {
    it('should return error when no file provided', async () => {
      const result = await service.uploadAvatar(undefined, 'user-1');
      expect(result).toEqual({ error: 'No file provided' });
    });

    it('should upload to S3 when configured and save avatar path', async () => {
      s3Service.isConfigured.mockReturnValue(true);
      const mockFile = {
        originalname: 'photo.png',
        buffer: Buffer.from('image-data'),
        mimetype: 'image/png',
      } as Express.Multer.File;
      prisma.user.update.mockResolvedValue({});

      const result = await service.uploadAvatar(mockFile, 'user-1');

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
      expect(result).toEqual({ url: '/api/v1/users/avatar/user-1' });
    });

    it('should save avatar path even when S3 is not configured', async () => {
      s3Service.isConfigured.mockReturnValue(false);
      const mockFile = {
        originalname: 'photo.jpg',
        buffer: Buffer.from('data'),
        mimetype: 'image/jpeg',
      } as Express.Multer.File;
      prisma.user.update.mockResolvedValue({});

      const result = await service.uploadAvatar(mockFile, 'user-1');

      expect(s3Service.upload).not.toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalled();
      expect(result).toEqual({ url: '/api/v1/users/avatar/user-1' });
    });
  });

  /* ------------------------------------------------------------------ */
  /*  listUsers                                                          */
  /* ------------------------------------------------------------------ */
  describe('listUsers', () => {
    it('should delegate to queryBus with GetUsersQuery', async () => {
      const expected = { data: [{ id: 'u1' }], total: 1 };
      queryBus.execute.mockResolvedValue(expected);

      const result = await service.listUsers(0, 10, 'search');

      expect(queryBus.execute).toHaveBeenCalled();
      expect(result).toEqual(expected);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  toggleActive                                                       */
  /* ------------------------------------------------------------------ */
  describe('toggleActive', () => {
    it('should toggle isActive from true to false', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', isActive: true });
      prisma.user.update.mockResolvedValue({
        id: 'user-1',
        isActive: false,
        passwordHash: 'h',
        metadata: null,
        socialSecurityNumber: null,
        firebaseUid: 'f',
      });

      const result = await service.toggleActive('user-1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { isActive: false },
      });
      expect((result as any).isActive).toBe(false);
    });

    it('should toggle isActive from false to true', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', isActive: false });
      prisma.user.update.mockResolvedValue({
        id: 'user-1',
        isActive: true,
        passwordHash: 'h',
        metadata: null,
        socialSecurityNumber: null,
        firebaseUid: 'f',
      });

      const result = await service.toggleActive('user-1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { isActive: true },
      });
      expect((result as any).isActive).toBe(true);
    });

    it('should throw NotFoundException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.toggleActive('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
