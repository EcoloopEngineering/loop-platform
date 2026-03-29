import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { USER_REPOSITORY } from '../ports/user.repository.port';
import { EmailService } from '../../../../infrastructure/email/email.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: {
    findRawById: jest.Mock;
    findRawByEmail: jest.Mock;
    findSelectById: jest.Mock;
    updateRaw: jest.Mock;
    findFirstByMetadataPath: jest.Mock;
    findById: jest.Mock;
    findByEmail: jest.Mock;
    findByFirebaseUid: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    findAll: jest.Mock;
    findByInvitationCode: jest.Mock;
    createRaw: jest.Mock;
  };
  const JWT_SECRET = 'test-secret';

  beforeEach(async () => {
    userRepo = {
      findRawById: jest.fn(),
      findRawByEmail: jest.fn(),
      findSelectById: jest.fn(),
      updateRaw: jest.fn(),
      findFirstByMetadataPath: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByFirebaseUid: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findAll: jest.fn(),
      findByInvitationCode: jest.fn(),
      createRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: USER_REPOSITORY, useValue: userRepo },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal?: string) => {
              if (key === 'JWT_SECRET') return JWT_SECRET;
              if (key === 'JWT_EXPIRY') return '7d';
              return defaultVal;
            }),
          },
        },
        {
          provide: EmailService,
          useValue: { send: jest.fn().mockResolvedValue(true), isConfigured: jest.fn().mockReturnValue(true) },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('constructor — JWT_SECRET validation', () => {
    it('should throw if default JWT_SECRET is used in production', async () => {
      await expect(
        Test.createTestingModule({
          providers: [
            AuthService,
            { provide: USER_REPOSITORY, useValue: userRepo },
            {
              provide: ConfigService,
              useValue: {
                get: jest.fn((key: string, defaultVal?: string) => {
                  if (key === 'JWT_SECRET') return 'loop-platform-jwt-secret-change-in-prod';
                  if (key === 'JWT_EXPIRY') return '7d';
                  if (key === 'NODE_ENV') return 'production';
                  return defaultVal;
                }),
              },
            },
            {
              provide: EmailService,
              useValue: { send: jest.fn(), isConfigured: jest.fn().mockReturnValue(true) },
            },
          ],
        }).compile(),
      ).rejects.toThrow('JWT_SECRET must be configured in production');
    });

    it('should NOT throw if default JWT_SECRET is used in development', async () => {
      const module = await Test.createTestingModule({
        providers: [
          AuthService,
          { provide: USER_REPOSITORY, useValue: userRepo },
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultVal?: string) => {
                if (key === 'JWT_SECRET') return 'loop-platform-jwt-secret-change-in-prod';
                if (key === 'JWT_EXPIRY') return '7d';
                if (key === 'NODE_ENV') return 'development';
                return defaultVal;
              }),
            },
          },
          {
            provide: EmailService,
            useValue: { send: jest.fn(), isConfigured: jest.fn().mockReturnValue(true) },
          },
        ],
      }).compile();

      expect(module.get(AuthService)).toBeDefined();
    });
  });

  describe('login', () => {
    it('should login with valid credentials and return token', async () => {
      const passwordHash = await bcrypt.hash('Password1', 12);
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash,
        firstName: 'Test',
        lastName: 'User',
        phone: null,
        role: 'SALES_REP',
        isActive: true,
        metadata: {},
      };

      userRepo.findRawByEmail.mockResolvedValue(mockUser);
      userRepo.updateRaw.mockResolvedValue(mockUser);

      const result = await service.login('test@example.com', 'Password1');

      expect(result.user.email).toBe('test@example.com');
      expect(result.token).toBeDefined();
      expect(userRepo.updateRaw).toHaveBeenCalledWith('user-1', { lastLoginAt: expect.any(Date) });
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 12);
      userRepo.findRawByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash,
        isActive: true,
        metadata: {},
      });

      userRepo.updateRaw.mockResolvedValue({});

      await expect(service.login('test@example.com', 'wrong-password')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      userRepo.findRawByEmail.mockResolvedValue(null);

      await expect(service.login('nobody@example.com', 'password')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for deactivated user', async () => {
      const passwordHash = await bcrypt.hash('Password1', 12);
      userRepo.findRawByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash,
        isActive: false,
      });

      await expect(service.login('test@example.com', 'Password1')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for user without password hash', async () => {
      userRepo.findRawByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: null,
        isActive: true,
      });

      await expect(service.login('test@example.com', 'Password1')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should increment failedAttempts on wrong password', async () => {
      const passwordHash = await bcrypt.hash('CorrectPass1', 12);
      userRepo.findRawByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash,
        isActive: true,
        metadata: { failedAttempts: 2 },
      });
      userRepo.updateRaw.mockResolvedValue({});

      await expect(service.login('test@example.com', 'WrongPass1')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(userRepo.updateRaw).toHaveBeenCalledWith('user-1', {
        metadata: expect.objectContaining({ failedAttempts: 3, lockedUntil: null }),
      });
    });

    it('should lock account after 5 consecutive failed attempts', async () => {
      const passwordHash = await bcrypt.hash('CorrectPass1', 12);
      userRepo.findRawByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash,
        isActive: true,
        metadata: { failedAttempts: 4 },
      });
      userRepo.updateRaw.mockResolvedValue({});

      await expect(service.login('test@example.com', 'WrongPass1')).rejects.toThrow(
        'Account temporarily locked',
      );

      expect(userRepo.updateRaw).toHaveBeenCalledWith('user-1', {
        metadata: expect.objectContaining({
          failedAttempts: 5,
          lockedUntil: expect.any(String),
        }),
      });
    });

    it('should reject login when account is locked', async () => {
      const passwordHash = await bcrypt.hash('CorrectPass1', 12);
      const lockedUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      userRepo.findRawByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash,
        isActive: true,
        metadata: { failedAttempts: 5, lockedUntil },
      });

      await expect(service.login('test@example.com', 'CorrectPass1')).rejects.toThrow(
        'Account temporarily locked',
      );

      // Should NOT call updateRaw — rejected before password check
      expect(userRepo.updateRaw).not.toHaveBeenCalled();
    });

    it('should allow login after lockout expires', async () => {
      const passwordHash = await bcrypt.hash('CorrectPass1', 12);
      const expiredLock = new Date(Date.now() - 1000).toISOString();
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash,
        firstName: 'Test',
        lastName: 'User',
        phone: null,
        role: 'SALES_REP',
        isActive: true,
        metadata: { failedAttempts: 5, lockedUntil: expiredLock },
      };

      userRepo.findRawByEmail.mockResolvedValue(mockUser);
      userRepo.updateRaw.mockResolvedValue(mockUser);

      const result = await service.login('test@example.com', 'CorrectPass1');

      expect(result.user.email).toBe('test@example.com');
      expect(result.token).toBeDefined();
      // Should clear failedAttempts/lockedUntil from metadata
      expect(userRepo.updateRaw).toHaveBeenCalledWith('user-1', {
        lastLoginAt: expect.any(Date),
        metadata: expect.not.objectContaining({ failedAttempts: expect.anything() }),
      });
    });

    it('should reset failedAttempts on successful login', async () => {
      const passwordHash = await bcrypt.hash('CorrectPass1', 12);
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash,
        firstName: 'Test',
        lastName: 'User',
        phone: null,
        role: 'SALES_REP',
        isActive: true,
        metadata: { failedAttempts: 3, lockedUntil: null, otherData: 'keep' },
      };

      userRepo.findRawByEmail.mockResolvedValue(mockUser);
      userRepo.updateRaw.mockResolvedValue(mockUser);

      await service.login('test@example.com', 'CorrectPass1');

      const updateCall = userRepo.updateRaw.mock.calls[0][1];
      expect(updateCall.metadata).not.toHaveProperty('failedAttempts');
      expect(updateCall.metadata).not.toHaveProperty('lockedUntil');
      expect(updateCall.metadata).toHaveProperty('otherData', 'keep');
    });
  });

  describe('validateToken', () => {
    it('should return user for valid token', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com', isActive: true };
      const token = jwt.sign({ sub: 'user-1', email: 'test@example.com' }, JWT_SECRET);
      userRepo.findSelectById.mockResolvedValue(mockUser);

      const result = await service.validateToken(token);
      expect(result).toEqual(mockUser);
    });

    it('should return null for invalid token', async () => {
      const result = await service.validateToken('invalid-token');
      expect(result).toBeNull();
    });

    it('should return null for inactive user', async () => {
      const token = jwt.sign({ sub: 'user-1' }, JWT_SECRET);
      userRepo.findSelectById.mockResolvedValue({ id: 'user-1', isActive: false });

      const result = await service.validateToken(token);
      expect(result).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('should return new token for active user', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com', role: 'SALES_REP', isActive: true };
      userRepo.findRawById.mockResolvedValue(mockUser);

      const result = await service.refreshToken('user-1');
      expect(result.token).toBeDefined();

      const decoded = jwt.verify(result.token, JWT_SECRET) as any;
      expect(decoded.sub).toBe('user-1');
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      userRepo.findRawById.mockResolvedValue(null);

      await expect(service.refreshToken('non-existent')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('forgotPassword', () => {
    let emailService: { send: jest.Mock; isConfigured: jest.Mock };

    beforeEach(() => {
      emailService = (service as any).emailService;
    });

    it('should send reset email for existing active user', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        isActive: true,
        metadata: {},
      };
      userRepo.findRawByEmail.mockResolvedValue(mockUser);
      userRepo.updateRaw.mockResolvedValue(mockUser);

      const result = await service.forgotPassword('test@example.com');

      expect(result.message).toContain('If an account exists');
      expect(userRepo.updateRaw).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          metadata: expect.objectContaining({
            resetTokenHash: expect.any(String),
            resetExpiry: expect.any(String),
          }),
        }),
      );
      expect(emailService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: expect.stringContaining('Reset'),
        }),
      );
    });

    it('should return same message for non-existent user (prevent email enumeration)', async () => {
      userRepo.findRawByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword('nobody@example.com');

      expect(result.message).toContain('If an account exists');
      expect(userRepo.updateRaw).not.toHaveBeenCalled();
      expect(emailService.send).not.toHaveBeenCalled();
    });

    it('should return same message for inactive user', async () => {
      userRepo.findRawByEmail.mockResolvedValue({ id: 'user-1', email: 'test@example.com', isActive: false });

      const result = await service.forgotPassword('test@example.com');

      expect(result.message).toContain('If an account exists');
      expect(emailService.send).not.toHaveBeenCalled();
    });
  });

  describe('resetPasswordWithToken', () => {
    it('should reset password with valid token', async () => {
      const resetToken = 'valid-reset-token';
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      const futureExpiry = new Date(Date.now() + 3600000).toISOString();

      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        isActive: true,
        metadata: { resetTokenHash, resetExpiry: futureExpiry },
      };

      userRepo.findFirstByMetadataPath.mockResolvedValue(mockUser);
      userRepo.updateRaw.mockResolvedValue(mockUser);

      const result = await service.resetPasswordWithToken(resetToken, 'NewPassword1');

      expect(result.message).toContain('Password reset successfully');
      expect(userRepo.updateRaw).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ passwordHash: expect.any(String) }),
      );
      // Ensure reset token hash is cleared from metadata
      const updateCall = userRepo.updateRaw.mock.calls[0][1];
      expect(updateCall.metadata).not.toHaveProperty('resetTokenHash');
      expect(updateCall.metadata).not.toHaveProperty('resetExpiry');
    });

    it('should reject weak password on reset', async () => {
      const resetToken = 'valid-reset-token';
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      const futureExpiry = new Date(Date.now() + 3600000).toISOString();

      userRepo.findFirstByMetadataPath.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        isActive: true,
        metadata: { resetTokenHash, resetExpiry: futureExpiry },
      });

      await expect(
        service.resetPasswordWithToken(resetToken, 'weak'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException for expired token', async () => {
      const resetToken = 'expired-token';
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      const pastExpiry = new Date(Date.now() - 3600000).toISOString();

      userRepo.findFirstByMetadataPath.mockResolvedValue({
        id: 'user-1',
        isActive: true,
        metadata: { resetTokenHash, resetExpiry: pastExpiry },
      });

      await expect(service.resetPasswordWithToken(resetToken, 'newPassword')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when no user matches token', async () => {
      userRepo.findFirstByMetadataPath.mockResolvedValue(null);

      await expect(service.resetPasswordWithToken('any-token', 'newPassword')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
