import { Test, TestingModule } from '@nestjs/testing';
import { QueryBus } from '@nestjs/cqrs';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UserProfileService } from './user-profile.service';
import { USER_REPOSITORY } from '../ports/user.repository.port';
import { S3Service } from '../../../../infrastructure/storage/s3.service';
import { UserRole } from '@loop/shared';
import { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';

describe('UserProfileService', () => {
  let service: UserProfileService;
  let queryBus: { execute: jest.Mock };
  let userRepo: {
    findRawById: jest.Mock;
    findRawByEmail: jest.Mock;
    findSelectById: jest.Mock;
    updateRaw: jest.Mock;
    findById: jest.Mock;
    findByEmail: jest.Mock;
    findByFirebaseUid: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    findAll: jest.Mock;
    findByInvitationCode: jest.Mock;
    createRaw: jest.Mock;
    findFirstByMetadataPath: jest.Mock;
    deleteById: jest.Mock;
  };
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
    phone: null,
    role: UserRole.SALES_REP,
    isActive: true,
    profileImage: null,
  };

  beforeEach(async () => {
    queryBus = { execute: jest.fn() };
    userRepo = {
      findRawById: jest.fn(),
      findRawByEmail: jest.fn(),
      findSelectById: jest.fn(),
      updateRaw: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByFirebaseUid: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findAll: jest.fn(),
      findByInvitationCode: jest.fn(),
      createRaw: jest.fn(),
      findFirstByMetadataPath: jest.fn(),
      deleteById: jest.fn(),
    };
    s3Service = {
      isConfigured: jest.fn().mockReturnValue(false),
      upload: jest.fn().mockResolvedValue('https://s3.example.com/key'),
      getObject: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserProfileService,
        { provide: QueryBus, useValue: queryBus },
        { provide: USER_REPOSITORY, useValue: userRepo },
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

      expect((result as any).id).toBe('user-1');
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
      userRepo.updateRaw.mockResolvedValue(updated);

      const result = await service.updateProfile(mockUser, { firstName: 'Updated' });

      expect(userRepo.updateRaw).toHaveBeenCalledWith('user-1', { firstName: 'Updated' });
      expect(result.firstName).toBe('Updated');
      expect((result as any).passwordHash).toBeUndefined();
    });

    it('should merge metadata when darkMode or compactView are provided', async () => {
      userRepo.findSelectById.mockResolvedValue({ metadata: { existing: 'value' } });
      userRepo.updateRaw.mockResolvedValue({
        id: 'user-1',
        metadata: { existing: 'value', darkMode: true },
        passwordHash: 'h',
        socialSecurityNumber: null,
        firebaseUid: 'f',
      });

      await service.updateProfile(mockUser, { darkMode: true } as any);

      expect(userRepo.findSelectById).toHaveBeenCalledWith('user-1', { metadata: true });
      expect(userRepo.updateRaw).toHaveBeenCalledWith('user-1', {
        metadata: { existing: 'value', darkMode: true },
      });
    });

    it('should handle null metadata when merging preferences', async () => {
      userRepo.findSelectById.mockResolvedValue({ metadata: null });
      userRepo.updateRaw.mockResolvedValue({
        id: 'user-1',
        metadata: { compactView: true },
        passwordHash: 'h',
        socialSecurityNumber: null,
        firebaseUid: 'f',
      });

      await service.updateProfile(mockUser, { compactView: true } as any);

      expect(userRepo.updateRaw).toHaveBeenCalledWith('user-1', {
        metadata: { compactView: true },
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
      } as any;
      userRepo.updateRaw.mockResolvedValue({});

      const result = await service.uploadAvatar(mockFile, 'user-1');

      expect(s3Service.upload).toHaveBeenCalledWith(
        expect.objectContaining({
          body: mockFile.buffer,
          contentType: 'image/png',
        }),
      );
      expect(userRepo.updateRaw).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          profileImage: '/api/v1/users/avatar/user-1',
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
      } as any;
      userRepo.updateRaw.mockResolvedValue({});

      const result = await service.uploadAvatar(mockFile, 'user-1');

      expect(s3Service.upload).not.toHaveBeenCalled();
      expect(userRepo.updateRaw).toHaveBeenCalled();
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
      userRepo.findRawById.mockResolvedValue({ id: 'user-1', isActive: true });
      userRepo.updateRaw.mockResolvedValue({
        id: 'user-1',
        isActive: false,
        passwordHash: 'h',
        metadata: null,
        socialSecurityNumber: null,
        firebaseUid: 'f',
      });

      const result = await service.toggleActive('user-1');

      expect(userRepo.updateRaw).toHaveBeenCalledWith('user-1', { isActive: false });
      expect((result as any).isActive).toBe(false);
    });

    it('should toggle isActive from false to true', async () => {
      userRepo.findRawById.mockResolvedValue({ id: 'user-1', isActive: false });
      userRepo.updateRaw.mockResolvedValue({
        id: 'user-1',
        isActive: true,
        passwordHash: 'h',
        metadata: null,
        socialSecurityNumber: null,
        firebaseUid: 'f',
      });

      const result = await service.toggleActive('user-1');

      expect(userRepo.updateRaw).toHaveBeenCalledWith('user-1', { isActive: true });
      expect((result as any).isActive).toBe(true);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepo.findRawById.mockResolvedValue(null);

      await expect(service.toggleActive('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  approveUser                                                        */
  /* ------------------------------------------------------------------ */
  describe('approveUser', () => {
    it('should activate user and set role', async () => {
      userRepo.findRawById.mockResolvedValue({ id: 'user-1', isActive: false });
      userRepo.updateRaw.mockResolvedValue({ id: 'user-1', isActive: true, role: UserRole.SALES_REP });
      queryBus.execute.mockResolvedValue({ id: 'user-1', isActive: true, role: UserRole.SALES_REP });

      const result = await service.approveUser('user-1', UserRole.SALES_REP);

      expect(userRepo.updateRaw).toHaveBeenCalledWith('user-1', { isActive: true, role: UserRole.SALES_REP });
      expect(result).toEqual({ id: 'user-1', isActive: true, role: UserRole.SALES_REP });
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepo.findRawById.mockResolvedValue(null);

      await expect(service.approveUser('nonexistent', UserRole.SALES_REP)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when user is already active', async () => {
      userRepo.findRawById.mockResolvedValue({ id: 'user-1', isActive: true });

      await expect(service.approveUser('user-1', UserRole.SALES_REP)).rejects.toThrow(BadRequestException);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  rejectUser                                                         */
  /* ------------------------------------------------------------------ */
  describe('rejectUser', () => {
    it('should delete an inactive user', async () => {
      userRepo.findRawById.mockResolvedValue({ id: 'user-1', isActive: false });
      userRepo.deleteById.mockResolvedValue(undefined);

      await service.rejectUser('user-1');

      expect(userRepo.deleteById).toHaveBeenCalledWith('user-1');
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepo.findRawById.mockResolvedValue(null);

      await expect(service.rejectUser('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when user is active', async () => {
      userRepo.findRawById.mockResolvedValue({ id: 'user-1', isActive: true });

      await expect(service.rejectUser('user-1')).rejects.toThrow(BadRequestException);
    });
  });
});
