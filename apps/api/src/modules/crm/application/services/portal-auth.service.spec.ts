import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { PortalAuthService } from './portal-auth.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { EmailService } from '../../../../infrastructure/email/email.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

const mockEmailService: Partial<EmailService> = {
  send: jest.fn().mockResolvedValue(true),
};

const JWT_SECRET = 'test-secret';

describe('PortalAuthService', () => {
  let service: PortalAuthService;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    (mockEmailService.send as jest.Mock).mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortalAuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: mockEmailService },
        {
          provide: ConfigService,
          useValue: { get: (_key: string, _fallback?: string) => JWT_SECRET },
        },
      ],
    }).compile();

    service = module.get<PortalAuthService>(PortalAuthService);
  });

  // ── register ──────────────────────────────────────────────────────────────

  describe('register', () => {
    const dto = {
      firstName: 'Ana',
      lastName: 'Silva',
      email: 'ana@example.com',
      password: 'password123',
    };

    it('creates a new customer and returns token', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);
      prisma.customer.create.mockResolvedValue({
        id: 'cust-1',
        firstName: 'Ana',
        lastName: 'Silva',
        email: 'ana@example.com',
        phone: null,
        metadata: {},
      });

      const result = await service.register(dto);

      expect(result).toHaveProperty('token');
      expect(result.customer.email).toBe('ana@example.com');
      expect(prisma.customer.create).toHaveBeenCalledTimes(1);
    });

    it('throws ConflictException when customer already has a password', async () => {
      const hash = await bcrypt.hash('existing', 12);
      prisma.customer.findFirst.mockResolvedValue({
        id: 'cust-1',
        email: 'ana@example.com',
        metadata: { passwordHash: hash },
      });

      await expect(service.register(dto)).rejects.toThrow('An account with this email already exists');
      expect(prisma.customer.create).not.toHaveBeenCalled();
    });

    it('sets password on existing customer without one', async () => {
      prisma.customer.findFirst.mockResolvedValue({
        id: 'cust-1',
        firstName: 'Ana',
        lastName: 'Silva',
        email: 'ana@example.com',
        phone: null,
        metadata: {},
      });
      prisma.customer.update.mockResolvedValue({
        id: 'cust-1',
        firstName: 'Ana',
        lastName: 'Silva',
        email: 'ana@example.com',
        phone: null,
        metadata: {},
      });

      const result = await service.register(dto);

      expect(result).toHaveProperty('token');
      expect(prisma.customer.update).toHaveBeenCalledTimes(1);
    });
  });

  // ── login ─────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns token on valid credentials', async () => {
      const hash = await bcrypt.hash('password123', 12);
      prisma.customer.findFirst.mockResolvedValueOnce({
        id: 'cust-1',
        firstName: 'Ana',
        lastName: 'Silva',
        email: 'ana@example.com',
        phone: null,
        metadata: { passwordHash: hash },
      });
      prisma.lead.findFirst.mockResolvedValue(null);

      const result = await service.login({ email: 'ana@example.com', password: 'password123' });

      expect(result).toHaveProperty('token');
      expect(result.customer.email).toBe('ana@example.com');
    });

    it('throws UnauthorizedException when customer not found', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);
      await expect(service.login({ email: 'x@x.com', password: 'pass' })).rejects.toThrow('Invalid email or password');
    });

    it('throws UnauthorizedException when no passwordHash set', async () => {
      prisma.customer.findFirst.mockResolvedValue({ id: 'cust-1', email: 'ana@example.com', metadata: {} });
      await expect(service.login({ email: 'ana@example.com', password: 'password123' })).rejects.toThrow('Invalid email or password');
    });

    it('throws UnauthorizedException on wrong password', async () => {
      const hash = await bcrypt.hash('correctpass', 12);
      prisma.customer.findFirst.mockResolvedValue({ id: 'cust-1', email: 'ana@example.com', metadata: { passwordHash: hash } });
      await expect(service.login({ email: 'ana@example.com', password: 'wrongpass' })).rejects.toThrow('Invalid email or password');
    });

    it('includes currentStage from lead in response', async () => {
      const hash = await bcrypt.hash('password123', 12);
      prisma.customer.findFirst.mockResolvedValueOnce({
        id: 'cust-1',
        firstName: 'Ana',
        lastName: 'Silva',
        email: 'ana@example.com',
        phone: null,
        metadata: { passwordHash: hash },
      });
      prisma.lead.findFirst.mockResolvedValue({
        id: 'lead-1',
        currentStage: 'DESIGN_READY',
        property: { streetAddress: '123 Main St', city: 'Austin', state: 'TX' },
      });

      const result = await service.login({ email: 'ana@example.com', password: 'password123' });

      expect(result.customer.currentStage).toBe('DESIGN_READY');
    });
  });

  // ── getMe ─────────────────────────────────────────────────────────────────

  describe('getMe', () => {
    it('throws UnauthorizedException when no auth header', async () => {
      await expect(service.getMe(undefined)).rejects.toThrow('Not authenticated');
    });

    it('throws UnauthorizedException on invalid token', async () => {
      await expect(service.getMe('Bearer bad.token.here')).rejects.toThrow();
    });

    it('throws UnauthorizedException when token type is not portal', async () => {
      const token = jwt.sign({ sub: 'cust-1', email: 'a@b.com', type: 'user' }, JWT_SECRET);
      await expect(service.getMe(`Bearer ${token}`)).rejects.toThrow('Invalid token');
    });

    it('returns customer profile on valid token', async () => {
      const token = jwt.sign({ sub: 'cust-1', email: 'ana@example.com', type: 'portal' }, JWT_SECRET);
      prisma.customer.findUnique.mockResolvedValue({
        id: 'cust-1',
        firstName: 'Ana',
        lastName: 'Silva',
        email: 'ana@example.com',
        phone: null,
        metadata: {},
      });
      prisma.lead.findFirst.mockResolvedValue(null);

      const result = await service.getMe(`Bearer ${token}`);

      expect(result.email).toBe('ana@example.com');
      expect(result.currentStage).toBe('NEW_LEAD');
    });

    it('throws UnauthorizedException when customer not found', async () => {
      const token = jwt.sign({ sub: 'ghost', email: 'ghost@x.com', type: 'portal' }, JWT_SECRET);
      prisma.customer.findUnique.mockResolvedValue(null);

      await expect(service.getMe(`Bearer ${token}`)).rejects.toThrow('Customer not found');
    });
  });

  // ── forgotPassword ────────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    it('returns generic message when customer not found', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);

      const result = await service.forgotPassword('nobody@example.com');

      expect(result.message).toContain('If an account exists');
      expect(mockEmailService.send).not.toHaveBeenCalled();
    });

    it('returns generic message when customer has no password', async () => {
      prisma.customer.findFirst.mockResolvedValue({ id: 'cust-1', email: 'ana@example.com', metadata: {} });

      const result = await service.forgotPassword('ana@example.com');

      expect(result.message).toContain('If an account exists');
      expect(mockEmailService.send).not.toHaveBeenCalled();
    });

    it('sends reset email when customer exists with password', async () => {
      const hash = await bcrypt.hash('password123', 12);
      prisma.customer.findFirst.mockResolvedValue({
        id: 'cust-1',
        firstName: 'Ana',
        email: 'ana@example.com',
        metadata: { passwordHash: hash },
      });
      prisma.customer.update.mockResolvedValue({});

      const result = await service.forgotPassword('ana@example.com');

      expect(result.message).toContain('If an account exists');
      expect(prisma.customer.update).toHaveBeenCalledTimes(1);
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
      prisma.customer.findFirst.mockResolvedValue(null);

      await expect(service.resetPassword('bad-token', 'newpass12')).rejects.toThrow('Invalid or expired reset link');
    });

    it('throws BadRequestException when token is expired', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      prisma.customer.findFirst.mockResolvedValue({
        id: 'cust-1',
        email: 'ana@example.com',
        metadata: {
          passwordHash: 'old-hash',
          resetTokenHash: tokenHash,
          resetTokenExpiry: new Date(Date.now() - 10_000).toISOString(), // expired
        },
      });

      await expect(service.resetPassword(token, 'newpass12')).rejects.toThrow('Reset link has expired');
    });

    it('resets password successfully', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      prisma.customer.findFirst.mockResolvedValue({
        id: 'cust-1',
        email: 'ana@example.com',
        metadata: {
          passwordHash: 'old-hash',
          resetTokenHash: tokenHash,
          resetTokenExpiry: new Date(Date.now() + 3_600_000).toISOString(), // valid
        },
      });
      prisma.customer.update.mockResolvedValue({});

      const result = await service.resetPassword(token, 'newpass12');

      expect(result.message).toContain('Password reset successfully');
      expect(prisma.customer.update).toHaveBeenCalledTimes(1);

      // Verify resetTokenHash and resetTokenExpiry were removed from metadata
      const updateCall = prisma.customer.update.mock.calls[0][0];
      const savedMeta = updateCall.data.metadata;
      expect(savedMeta).not.toHaveProperty('resetTokenHash');
      expect(savedMeta).not.toHaveProperty('resetTokenExpiry');
      expect(savedMeta).toHaveProperty('passwordHash');
    });
  });
});
