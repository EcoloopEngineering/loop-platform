import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { RegistrationService } from './registration.service';
import { AuthService } from './auth.service';
import { USER_REPOSITORY } from '../ports/user.repository.port';
import { REFERRAL_REPOSITORY } from '../ports/referral.repository.port';
import { EmailService } from '../../../../infrastructure/email/email.service';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-secret';

describe('RegistrationService', () => {
  let service: RegistrationService;
  let userRepo: {
    findRawByEmail: jest.Mock;
    createRaw: jest.Mock;
    findByInvitationCode: jest.Mock;
    findRawById: jest.Mock;
    findSelectById: jest.Mock;
    updateRaw: jest.Mock;
    findFirstByMetadataPath: jest.Mock;
    findById: jest.Mock;
    findByEmail: jest.Mock;
    findByFirebaseUid: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    findAll: jest.Mock;
  };
  let referralRepo: {
    findManyByInviter: jest.Mock;
    countByInviter: jest.Mock;
    findFirstByInvitee: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    findManyByHierarchyPath: jest.Mock;
  };

  beforeEach(async () => {
    userRepo = {
      findRawByEmail: jest.fn(),
      createRaw: jest.fn(),
      findByInvitationCode: jest.fn(),
      findRawById: jest.fn(),
      findSelectById: jest.fn(),
      updateRaw: jest.fn(),
      findFirstByMetadataPath: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByFirebaseUid: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findAll: jest.fn(),
    };
    referralRepo = {
      findManyByInviter: jest.fn(),
      countByInviter: jest.fn(),
      findFirstByInvitee: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findManyByHierarchyPath: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationService,
        AuthService,
        { provide: USER_REPOSITORY, useValue: userRepo },
        { provide: REFERRAL_REPOSITORY, useValue: referralRepo },
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
          useValue: { send: jest.fn().mockResolvedValue(true) },
        },
      ],
    }).compile();

    service = module.get<RegistrationService>(RegistrationService);
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

      userRepo.findRawByEmail.mockResolvedValue(null);
      userRepo.createRaw.mockResolvedValue(mockUser);

      const result = await service.register({
        email: 'test@example.com',
        password: 'Password1',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(result.user).toEqual(expect.objectContaining({
        id: 'user-1',
        email: 'test@example.com',
      }));
      expect(result.token).toBeDefined();

      const decoded = jwt.verify(result.token, JWT_SECRET) as any;
      expect(decoded.sub).toBe('user-1');
      expect(decoded.email).toBe('test@example.com');
    });

    it('should throw BadRequestException for weak password', async () => {
      userRepo.findRawByEmail.mockResolvedValue(null);

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'weak',
          firstName: 'Test',
          lastName: 'User',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if email already exists', async () => {
      userRepo.findRawByEmail.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'Password1',
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

      userRepo.findRawByEmail.mockResolvedValue(null);
      userRepo.createRaw.mockResolvedValue(mockUser);
      userRepo.findByInvitationCode.mockResolvedValue(inviter);
      referralRepo.create.mockResolvedValue({});

      await service.register({
        email: 'partner@gmail.com',
        password: 'Password1',
        firstName: 'Partner',
        lastName: 'User',
        inviteCode: 'invite-code-1',
      });

      expect(referralRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          inviterId: 'inviter-1',
          inviteeId: 'user-1',
          status: 'ACCEPTED',
        }),
      );
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

      userRepo.findRawByEmail.mockResolvedValue(null);
      userRepo.createRaw.mockResolvedValue(mockUser);

      await service.register({
        email: 'john@ecoloop.us',
        password: 'Password1',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(userRepo.createRaw).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'john@ecoloop.us',
          role: 'SALES_REP',
        }),
      );
    });

    it('should not create referral for ecoloop.us employee even with inviteCode', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'john@ecoloop.us',
        firstName: 'John',
        lastName: 'Doe',
        role: 'SALES_REP',
        isActive: true,
      };

      userRepo.findRawByEmail.mockResolvedValue(null);
      userRepo.createRaw.mockResolvedValue(mockUser);

      await service.register({
        email: 'john@ecoloop.us',
        password: 'Password1',
        firstName: 'John',
        lastName: 'Doe',
        inviteCode: 'some-code',
      });

      expect(userRepo.findByInvitationCode).not.toHaveBeenCalled();
      expect(referralRepo.create).not.toHaveBeenCalled();
    });

    it('should not fail registration if referral creation fails', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'partner@gmail.com',
        firstName: 'Partner',
        lastName: 'User',
        phone: null,
        role: 'SALES_REP',
        isActive: true,
      };

      userRepo.findRawByEmail.mockResolvedValue(null);
      userRepo.createRaw.mockResolvedValue(mockUser);
      userRepo.findByInvitationCode.mockRejectedValue(new Error('DB error'));

      const result = await service.register({
        email: 'partner@gmail.com',
        password: 'Password1',
        firstName: 'Partner',
        lastName: 'User',
        inviteCode: 'bad-code',
      });

      expect(result.user.id).toBe('user-1');
      expect(result.token).toBeDefined();
    });

    it('should skip referral when inviter is not found', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'partner@gmail.com',
        firstName: 'Partner',
        lastName: 'User',
        phone: null,
        role: 'SALES_REP',
        isActive: true,
      };

      userRepo.findRawByEmail.mockResolvedValue(null);
      userRepo.createRaw.mockResolvedValue(mockUser);
      userRepo.findByInvitationCode.mockResolvedValue(null);

      await service.register({
        email: 'partner@gmail.com',
        password: 'Password1',
        firstName: 'Partner',
        lastName: 'User',
        inviteCode: 'nonexistent-code',
      });

      expect(referralRepo.create).not.toHaveBeenCalled();
    });
  });
});
