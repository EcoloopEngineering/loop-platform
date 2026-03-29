import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PortalPasswordService } from './portal-password.service';
import { PortalAuthService } from './portal-auth.service';
import { EmailService } from '../../../../infrastructure/email/email.service';
import { CUSTOMER_REPOSITORY } from '../ports/customer.repository.port';

const mockCustomerRepo = {
  findByEmailRaw: jest.fn(),
  updateRaw: jest.fn(),
  findByMetadataPath: jest.fn(),
};

const mockEmailService: Partial<EmailService> = {
  send: jest.fn().mockResolvedValue(true),
};

const mockPortalAuth = {
  getMeta: jest.fn((raw: unknown) => (raw as Record<string, unknown>) ?? {}),
};

describe('PortalPasswordService', () => {
  let service: PortalPasswordService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortalPasswordService,
        { provide: CUSTOMER_REPOSITORY, useValue: mockCustomerRepo },
        { provide: EmailService, useValue: mockEmailService },
        { provide: PortalAuthService, useValue: mockPortalAuth },
        {
          provide: ConfigService,
          useValue: { get: (_key: string, fallback?: string) => fallback ?? 'http://localhost:9000' },
        },
      ],
    }).compile();

    service = module.get<PortalPasswordService>(PortalPasswordService);
  });

  // ── forgotPassword ────────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    it('returns generic message when customer not found', async () => {
      mockCustomerRepo.findByEmailRaw.mockResolvedValue(null);

      const result = await service.forgotPassword('nobody@example.com');

      expect(result.message).toContain('If an account exists');
      expect(mockEmailService.send).not.toHaveBeenCalled();
    });

    it('returns generic message when customer has no password', async () => {
      mockCustomerRepo.findByEmailRaw.mockResolvedValue({ id: 'cust-1', email: 'ana@example.com', metadata: {} });
      mockPortalAuth.getMeta.mockReturnValueOnce({});

      const result = await service.forgotPassword('ana@example.com');

      expect(result.message).toContain('If an account exists');
      expect(mockEmailService.send).not.toHaveBeenCalled();
    });

    it('sends reset email when customer exists with password', async () => {
      const hash = await bcrypt.hash('password123', 12);
      mockCustomerRepo.findByEmailRaw.mockResolvedValue({
        id: 'cust-1',
        firstName: 'Ana',
        email: 'ana@example.com',
        metadata: { passwordHash: hash },
      });
      mockPortalAuth.getMeta.mockReturnValueOnce({ passwordHash: hash });
      mockCustomerRepo.updateRaw.mockResolvedValue({});

      const result = await service.forgotPassword('ana@example.com');

      expect(result.message).toContain('If an account exists');
      expect(mockCustomerRepo.updateRaw).toHaveBeenCalledTimes(1);
      expect(mockEmailService.send).toHaveBeenCalledTimes(1);
      expect(mockEmailService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'ana@example.com',
          subject: 'Reset your ecoLoop portal password',
        }),
      );
    });
  });

  // ── resetPassword ─────────────────────────────────────────────────────────

  describe('resetPassword', () => {
    it('throws BadRequestException when token not found', async () => {
      mockCustomerRepo.findByMetadataPath.mockResolvedValue(null);

      await expect(service.resetPassword('bad-token', 'newpass12')).rejects.toThrow('Invalid or expired reset link');
    });

    it('throws BadRequestException when token is expired', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      mockCustomerRepo.findByMetadataPath.mockResolvedValue({
        id: 'cust-1',
        email: 'ana@example.com',
        metadata: {
          passwordHash: 'old-hash',
          resetTokenHash: tokenHash,
          resetTokenExpiry: new Date(Date.now() - 10_000).toISOString(),
        },
      });
      mockPortalAuth.getMeta.mockReturnValueOnce({
        passwordHash: 'old-hash',
        resetTokenHash: tokenHash,
        resetTokenExpiry: new Date(Date.now() - 10_000).toISOString(),
      });

      await expect(service.resetPassword(token, 'newpass12')).rejects.toThrow('Reset link has expired');
    });

    it('resets password successfully', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiry = new Date(Date.now() + 3_600_000).toISOString();
      mockCustomerRepo.findByMetadataPath.mockResolvedValue({
        id: 'cust-1',
        email: 'ana@example.com',
        metadata: {
          passwordHash: 'old-hash',
          resetTokenHash: tokenHash,
          resetTokenExpiry: expiry,
        },
      });
      mockPortalAuth.getMeta.mockReturnValueOnce({
        passwordHash: 'old-hash',
        resetTokenHash: tokenHash,
        resetTokenExpiry: expiry,
      });
      mockCustomerRepo.updateRaw.mockResolvedValue({});

      const result = await service.resetPassword(token, 'newpass12');

      expect(result.message).toContain('Password reset successfully');
      expect(mockCustomerRepo.updateRaw).toHaveBeenCalledTimes(1);

      // Verify resetTokenHash and resetTokenExpiry were removed from metadata
      const updateCall = mockCustomerRepo.updateRaw.mock.calls[0];
      const savedMeta = updateCall[1].metadata;
      expect(savedMeta).not.toHaveProperty('resetTokenHash');
      expect(savedMeta).not.toHaveProperty('resetTokenExpiry');
      expect(savedMeta).toHaveProperty('passwordHash');
    });
  });
});
