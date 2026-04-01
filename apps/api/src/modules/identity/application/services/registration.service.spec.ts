import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RegistrationService } from './registration.service';
import { AuthService } from './auth.service';
import { USER_REPOSITORY } from '../ports/user.repository.port';
import { REFERRAL_REPOSITORY } from '../ports/referral.repository.port';
import { EmailService } from '../../../../infrastructure/email/email.service';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-secret';

describe('RegistrationService', () => {
  let service: RegistrationService;
  let emitter: { emit: jest.Mock };
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
    emitter = { emit: jest.fn() };
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
        { provide: EventEmitter2, useValue: emitter },
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

    it('should throw BadRequestException for weak password', async () => {
      userRepo.findRawByEmail.mockResolvedValue(null);

      await expect(
        service.register({
          email: 'john@ecoloop.us',
          password: 'weak',
          firstName: 'Test',
          lastName: 'User',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    /* -------------------------------------------------------------- */
    /*  ecoloop.us employee registration                               */
    /* -------------------------------------------------------------- */
    it('should create ecoloop employee as pending SALES_REP (isActive: false)', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'john@ecoloop.us',
        firstName: 'John',
        lastName: 'Doe',
        role: 'SALES_REP',
        isActive: false,
      };

      userRepo.findRawByEmail.mockResolvedValue(null);
      userRepo.createRaw.mockResolvedValue(mockUser);

      const result = await service.register({
        email: 'john@ecoloop.us',
        password: 'Password1',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(userRepo.createRaw).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'john@ecoloop.us',
          role: 'SALES_REP',
          isActive: false,
        }),
      );
      expect(result.user).toEqual(expect.objectContaining({ id: 'user-1' }));
      expect(result.token).toBeDefined();
    });

    it('should emit user.registered event for ecoloop employee', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'john@ecoloop.us',
        firstName: 'John',
        lastName: 'Doe',
        role: 'SALES_REP',
        isActive: false,
      };

      userRepo.findRawByEmail.mockResolvedValue(null);
      userRepo.createRaw.mockResolvedValue(mockUser);

      await service.register({
        email: 'john@ecoloop.us',
        password: 'Password1',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(emitter.emit).toHaveBeenCalledWith('user.registered', {
        userId: 'user-1',
        email: 'john@ecoloop.us',
        role: 'SALES_REP',
        isEmployee: true,
      });
    });

    it('should not create referral for ecoloop.us employee even with inviteCode', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'john@ecoloop.us',
        firstName: 'John',
        lastName: 'Doe',
        role: 'SALES_REP',
        isActive: false,
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

    /* -------------------------------------------------------------- */
    /*  Non-ecoloop email — no invitation code                         */
    /* -------------------------------------------------------------- */
    it('should reject non-ecoloop email without invitation code', async () => {
      userRepo.findRawByEmail.mockResolvedValue(null);

      await expect(
        service.register({
          email: 'partner@gmail.com',
          password: 'Password1',
          firstName: 'Partner',
          lastName: 'User',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.register({
          email: 'partner@gmail.com',
          password: 'Password1',
          firstName: 'Partner',
          lastName: 'User',
        }),
      ).rejects.toThrow('Registration requires an invitation');
    });

    /* -------------------------------------------------------------- */
    /*  Non-ecoloop email — valid invitation code                      */
    /* -------------------------------------------------------------- */
    it('should create non-ecoloop user as active REFERRAL with valid invite (pre-approved)', async () => {
      const inviter = { id: 'inviter-1', invitationCode: 'invite-code-1' };
      const mockUser = {
        id: 'user-1',
        email: 'partner@gmail.com',
        firstName: 'Partner',
        lastName: 'User',
        phone: null,
        role: 'REFERRAL',
        isActive: true,
      };

      userRepo.findRawByEmail.mockResolvedValue(null);
      userRepo.findByInvitationCode.mockResolvedValue(inviter);
      userRepo.createRaw.mockResolvedValue(mockUser);
      referralRepo.create.mockResolvedValue({});

      const result = await service.register({
        email: 'partner@gmail.com',
        password: 'Password1',
        firstName: 'Partner',
        lastName: 'User',
        inviteCode: 'invite-code-1',
      });

      expect(userRepo.createRaw).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'partner@gmail.com',
          role: 'REFERRAL',
          isActive: true,
        }),
      );
      expect(referralRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          inviterId: 'inviter-1',
          inviteeId: 'user-1',
          status: 'ACCEPTED',
        }),
      );
      expect(result.user).toEqual(expect.objectContaining({ id: 'user-1' }));
      expect(result.token).toBeDefined();
    });

    it('should emit user.registered event for non-ecoloop user', async () => {
      const inviter = { id: 'inviter-1' };
      const mockUser = {
        id: 'user-1',
        email: 'partner@gmail.com',
        firstName: 'Partner',
        lastName: 'User',
        role: 'REFERRAL',
        isActive: false,
      };

      userRepo.findRawByEmail.mockResolvedValue(null);
      userRepo.findByInvitationCode.mockResolvedValue(inviter);
      userRepo.createRaw.mockResolvedValue(mockUser);
      referralRepo.create.mockResolvedValue({});

      await service.register({
        email: 'partner@gmail.com',
        password: 'Password1',
        firstName: 'Partner',
        lastName: 'User',
        inviteCode: 'valid-code',
      });

      expect(emitter.emit).toHaveBeenCalledWith('user.registered', {
        userId: 'user-1',
        email: 'partner@gmail.com',
        role: 'REFERRAL',
        isEmployee: false,
      });
    });

    /* -------------------------------------------------------------- */
    /*  Non-ecoloop email — invalid invitation code                    */
    /* -------------------------------------------------------------- */
    it('should reject non-ecoloop email with invalid invitation code', async () => {
      userRepo.findRawByEmail.mockResolvedValue(null);
      userRepo.findByInvitationCode.mockResolvedValue(null);

      await expect(
        service.register({
          email: 'partner@gmail.com',
          password: 'Password1',
          firstName: 'Partner',
          lastName: 'User',
          inviteCode: 'bad-code',
        }),
      ).rejects.toThrow(BadRequestException);

      userRepo.findRawByEmail.mockResolvedValue(null);
      userRepo.findByInvitationCode.mockResolvedValue(null);

      await expect(
        service.register({
          email: 'partner@gmail.com',
          password: 'Password1',
          firstName: 'Partner',
          lastName: 'User',
          inviteCode: 'bad-code',
        }),
      ).rejects.toThrow('Invalid invitation code');
    });

    it('should not create user when invitation code is invalid', async () => {
      userRepo.findRawByEmail.mockResolvedValue(null);
      userRepo.findByInvitationCode.mockResolvedValue(null);

      await expect(
        service.register({
          email: 'partner@gmail.com',
          password: 'Password1',
          firstName: 'Partner',
          lastName: 'User',
          inviteCode: 'bad-code',
        }),
      ).rejects.toThrow();

      expect(userRepo.createRaw).not.toHaveBeenCalled();
    });

    /* -------------------------------------------------------------- */
    /*  Token verification                                             */
    /* -------------------------------------------------------------- */
    it('should return a valid JWT token', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'john@ecoloop.us',
        firstName: 'John',
        lastName: 'Doe',
        role: 'SALES_REP',
        isActive: false,
      };

      userRepo.findRawByEmail.mockResolvedValue(null);
      userRepo.createRaw.mockResolvedValue(mockUser);

      const result = await service.register({
        email: 'john@ecoloop.us',
        password: 'Password1',
        firstName: 'John',
        lastName: 'Doe',
      });

      const decoded = jwt.verify(result.token, JWT_SECRET) as any;
      expect(decoded.sub).toBe('user-1');
      expect(decoded.email).toBe('john@ecoloop.us');
    });
  });
});
