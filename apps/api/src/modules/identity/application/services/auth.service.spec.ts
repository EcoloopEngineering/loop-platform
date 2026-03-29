import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../../../test/prisma-mock.helper';
import { EmailService } from '../../../../infrastructure/email/email.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: MockPrismaService;
  const JWT_SECRET = 'test-secret';

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
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

  describe('register', () => {
    it('should register a new user and return token', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: null,
        role: 'SALES_REP',
        isActive: true,
      };

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);

      const result = await service.register({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(result.user).toEqual(expect.objectContaining({
        id: 'user-1',
        email: 'test@example.com',
      }));
      expect(result.token).toBeDefined();

      // Verify token is valid
      const decoded = jwt.verify(result.token, JWT_SECRET) as any;
      expect(decoded.sub).toBe('user-1');
      expect(decoded.email).toBe('test@example.com');
    });

    it('should throw ConflictException if email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create referral when inviteCode is provided for non-employee', async () => {
      const inviter = { id: 'inviter-1', invitationCode: 'invite-code-1' };
      const mockUser = {
        id: 'user-1',
        email: 'partner@gmail.com',
        firstName: 'Partner',
        lastName: 'User',
        phone: null,
        role: 'SALES_REP',
        isActive: true,
      };

      prisma.user.findUnique
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce(inviter); // inviteCode lookup
      prisma.user.create.mockResolvedValue(mockUser);
      prisma.referral.create.mockResolvedValue({});

      await service.register({
        email: 'partner@gmail.com',
        password: 'password123',
        firstName: 'Partner',
        lastName: 'User',
        inviteCode: 'invite-code-1',
      });

      expect(prisma.referral.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          inviterId: 'inviter-1',
          inviteeId: 'user-1',
          status: 'ACCEPTED',
        }),
      });
    });

    it('should assign SALES_REP role for ecoloop.us employees', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'john@ecoloop.us',
        firstName: 'John',
        lastName: 'Doe',
        role: 'SALES_REP',
        isActive: true,
      };

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);

      await service.register({
        email: 'john@ecoloop.us',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'john@ecoloop.us',
          role: 'SALES_REP',
        }),
      });
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

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(mockUser);

      const result = await service.login('test@example.com', 'password123');

      expect(result.user.email).toBe('test@example.com');
      expect(result.token).toBeDefined();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { lastLoginAt: expect.any(Date) },
      });
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 12);
      prisma.user.findUnique.mockResolvedValue({
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
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login('nobody@example.com', 'password')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for deactivated user', async () => {
      const passwordHash = await bcrypt.hash('password123', 12);
      prisma.user.findUnique.mockResolvedValue({
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
      prisma.user.findUnique.mockResolvedValue({
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
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateToken(token);
      expect(result).toEqual(mockUser);
    });

    it('should return null for invalid token', async () => {
      const result = await service.validateToken('invalid-token');
      expect(result).toBeNull();
    });

    it('should return null for inactive user', async () => {
      const token = jwt.sign({ sub: 'user-1' }, JWT_SECRET);
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', isActive: false });

      const result = await service.validateToken(token);
      expect(result).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('should return new token for active user', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com', role: 'SALES_REP', isActive: true };
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.refreshToken('user-1');
      expect(result.token).toBeDefined();

      const decoded = jwt.verify(result.token, JWT_SECRET) as any;
      expect(decoded.sub).toBe('user-1');
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

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
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(mockUser);

      const result = await service.forgotPassword('test@example.com');

      expect(result.message).toContain('If an account exists');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              resetTokenHash: expect.any(String),
              resetExpiry: expect.any(String),
            }),
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
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword('nobody@example.com');

      expect(result.message).toContain('If an account exists');
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(emailService.send).not.toHaveBeenCalled();
    });

    it('should return same message for inactive user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'test@example.com', isActive: false });

      const result = await service.forgotPassword('test@example.com');

      expect(result.message).toContain('If an account exists');
      expect(emailService.send).not.toHaveBeenCalled();
    });
  });

  describe('resetPasswordWithToken', () => {
    it('should reset password with valid token', async () => {
      const resetToken = 'valid-reset-token';
      // New implementation stores SHA-256 hash, not bcrypt
      const crypto = require('crypto');
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      const futureExpiry = new Date(Date.now() + 3600000).toISOString();

      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        isActive: true,
        metadata: { resetTokenHash, resetExpiry: futureExpiry },
      };

      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(mockUser);

      const result = await service.resetPasswordWithToken(resetToken, 'newPassword123');

      expect(result.message).toContain('Password reset successfully');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({ passwordHash: expect.any(String) }),
        }),
      );
      // Ensure reset token hash is cleared from metadata
      const updateCall = prisma.user.update.mock.calls[0][0];
      expect(updateCall.data.metadata).not.toHaveProperty('resetTokenHash');
      expect(updateCall.data.metadata).not.toHaveProperty('resetExpiry');
    });

    it('should throw UnauthorizedException for expired token', async () => {
      const crypto = require('crypto');
      const resetToken = 'expired-token';
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      const pastExpiry = new Date(Date.now() - 3600000).toISOString();

      prisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        isActive: true,
        metadata: { resetTokenHash, resetExpiry: pastExpiry },
      });

      await expect(service.resetPasswordWithToken(resetToken, 'newPassword')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when no user matches token', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.resetPasswordWithToken('any-token', 'newPassword')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
