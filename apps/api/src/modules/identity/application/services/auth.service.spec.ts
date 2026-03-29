import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { USER_REPOSITORY } from '../ports/user.repository.port';
import { EmailService } from '../../../../infrastructure/email/email.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

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
      const passwordHash = await bcrypt.hash('password123', 12);
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash,
        firstName: 'Test',
        lastName: 'User',
        phone: null,
        role: 'SALES_REP',
        isActive: true,
      };

      userRepo.findRawByEmail.mockResolvedValue(mockUser);
      userRepo.updateRaw.mockResolvedValue(mockUser);

      const result = await service.login('test@example.com', 'password123');

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
      });

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
      const passwordHash = await bcrypt.hash('password123', 12);
      userRepo.findRawByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash,
        isActive: false,
      });

      await expect(service.login('test@example.com', 'password123')).rejects.toThrow(
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

      await expect(service.login('test@example.com', 'password123')).rejects.toThrow(
        UnauthorizedException,
      );
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
      const crypto = require('crypto');
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

      const result = await service.resetPasswordWithToken(resetToken, 'newPassword123');

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

    it('should throw UnauthorizedException for expired token', async () => {
      const crypto = require('crypto');
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
