import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UserProfileService } from '../application/services/user-profile.service';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { UserRole } from '@loop/shared';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';

describe('UsersController', () => {
  let controller: UsersController;
  let userProfileService: Record<string, jest.Mock>;

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
    userProfileService = {
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      uploadAvatar: jest.fn(),
      getAvatar: jest.fn(),
      listUsers: jest.fn(),
      getUserById: jest.fn(),
      updateUserById: jest.fn(),
      updateUserRole: jest.fn(),
      toggleActive: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UserProfileService, useValue: userProfileService },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  describe('getMe', () => {
    it('should delegate to userProfileService.getProfile', async () => {
      const expected = { id: 'user-1', email: 'test@test.com', darkMode: false, compactView: false };
      userProfileService.getProfile.mockResolvedValue(expected);

      const result = await controller.getMe(mockUser);

      expect(userProfileService.getProfile).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(expected);
    });
  });

  describe('updateMe', () => {
    it('should delegate to userProfileService.updateProfile', async () => {
      const dto = { firstName: 'Updated' };
      const expected = { id: 'user-1', firstName: 'Updated' };
      userProfileService.updateProfile.mockResolvedValue(expected);

      const result = await controller.updateMe(mockUser, dto);

      expect(userProfileService.updateProfile).toHaveBeenCalledWith(mockUser, dto);
      expect(result).toEqual(expected);
    });
  });

  describe('uploadAvatar', () => {
    it('should delegate to userProfileService.uploadAvatar', async () => {
      const mockFile = { originalname: 'photo.png', buffer: Buffer.from('data'), mimetype: 'image/png' };
      const expected = { url: '/api/v1/users/avatar/user-1' };
      userProfileService.uploadAvatar.mockResolvedValue(expected);

      const result = await controller.uploadAvatar(mockFile, 'user-1');

      expect(userProfileService.uploadAvatar).toHaveBeenCalledWith(mockFile, 'user-1');
      expect(result).toEqual(expected);
    });

    it('should return error when no file provided', async () => {
      userProfileService.uploadAvatar.mockResolvedValue({ error: 'No file provided' });

      const result = await controller.uploadAvatar(undefined as any, 'user-1');

      expect(result).toEqual({ error: 'No file provided' });
    });
  });

  describe('getAvatar', () => {
    function mockRes() {
      return {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        setHeader: jest.fn(),
        end: jest.fn(),
      };
    }

    it('should return 404 when avatar not found', async () => {
      userProfileService.getAvatar.mockResolvedValue({
        found: false,
        status: 404,
        error: 'User not found',
      });
      const res = mockRes();

      await controller.getAvatar('nonexistent', res as any);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should stream avatar buffer when found', async () => {
      const buffer = Buffer.from('fake-image');
      userProfileService.getAvatar.mockResolvedValue({
        found: true,
        buffer,
        contentType: 'image/png',
      });
      const res = mockRes();

      await controller.getAvatar('user-1', res as any);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png');
      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=86400');
      expect(res.setHeader).toHaveBeenCalledWith('Cross-Origin-Resource-Policy', 'cross-origin');
      expect(res.end).toHaveBeenCalledWith(buffer);
    });
  });

  describe('findOne', () => {
    it('should delegate to userProfileService.getUserById', async () => {
      const user = { id: 'user-1' };
      userProfileService.getUserById.mockResolvedValue(user);

      const result = await controller.findOne('user-1');

      expect(userProfileService.getUserById).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(user);
    });
  });

  describe('changeRole', () => {
    it('should delegate to userProfileService.updateUserRole', async () => {
      const updatedUser = { id: 'user-1', role: UserRole.MANAGER };
      userProfileService.updateUserRole.mockResolvedValue(updatedUser);

      const result = await controller.changeRole('user-1', { role: UserRole.MANAGER });

      expect(userProfileService.updateUserRole).toHaveBeenCalledWith('user-1', UserRole.MANAGER);
      expect(result).toEqual(updatedUser);
    });
  });
});
