import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { PortalController } from './portal.controller';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { EmailService } from '../../../infrastructure/email/email.service';
import { createMockPrismaService, MockPrismaService } from '../../../test/prisma-mock.helper';

const mockEmailService: Partial<EmailService> = {
  send: jest.fn().mockResolvedValue(true),
};

const JWT_SECRET = 'test-secret';

describe('PortalController', () => {
  let controller: PortalController;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PortalController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: mockEmailService },
        {
          provide: ConfigService,
          useValue: { get: (_key: string, fallback: string) => fallback ?? JWT_SECRET },
        },
      ],
    }).compile();

    controller = module.get<PortalController>(PortalController);
    // Inject prisma directly since it's resolved via constructor
    (controller as any).prisma = prisma;
    (controller as any).jwtSecret = JWT_SECRET;
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

      const result = await controller.register(dto as any);

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

      await expect(controller.register(dto as any)).rejects.toThrow('An account with this email already exists');
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

      const result = await controller.register(dto as any);

      expect(result).toHaveProperty('token');
      expect(prisma.customer.update).toHaveBeenCalledTimes(1);
    });
  });

  // ── login ─────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns token on valid credentials', async () => {
      const hash = await bcrypt.hash('password123', 12);
      prisma.customer.findFirst
        .mockResolvedValueOnce({
          id: 'cust-1',
          firstName: 'Ana',
          lastName: 'Silva',
          email: 'ana@example.com',
          phone: null,
          metadata: { passwordHash: hash },
        })
        .mockResolvedValueOnce(null); // lead query

      const result = await controller.login({ email: 'ana@example.com', password: 'password123' } as any);

      expect(result).toHaveProperty('token');
      expect((result as any).customer.email).toBe('ana@example.com');
    });

    it('throws UnauthorizedException when customer not found', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);
      await expect(controller.login({ email: 'x@x.com', password: 'pass' } as any)).rejects.toThrow('Invalid email or password');
    });

    it('throws UnauthorizedException when no passwordHash set', async () => {
      prisma.customer.findFirst.mockResolvedValue({ id: 'cust-1', email: 'ana@example.com', metadata: {} });
      await expect(controller.login({ email: 'ana@example.com', password: 'password123' } as any)).rejects.toThrow('Invalid email or password');
    });

    it('throws UnauthorizedException on wrong password', async () => {
      const hash = await bcrypt.hash('correctpass', 12);
      prisma.customer.findFirst.mockResolvedValue({ id: 'cust-1', email: 'ana@example.com', metadata: { passwordHash: hash } });
      await expect(controller.login({ email: 'ana@example.com', password: 'wrongpass' } as any)).rejects.toThrow('Invalid email or password');
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
      // lead findFirst (called inside login)
      prisma.lead.findFirst.mockResolvedValue({
        id: 'lead-1',
        currentStage: 'DESIGN_READY',
        property: { streetAddress: '123 Main St', city: 'Austin', state: 'TX' },
      });

      const result = await controller.login({ email: 'ana@example.com', password: 'password123' } as any);

      expect((result as any).customer.currentStage).toBe('DESIGN_READY');
    });
  });

  // ── getMe ─────────────────────────────────────────────────────────────────

  describe('getMe', () => {
    function makeReq(token: string) {
      return { headers: { authorization: `Bearer ${token}` } };
    }

    it('throws UnauthorizedException when no token', async () => {
      await expect(controller.getMe({ headers: {} } as any)).rejects.toThrow('Not authenticated');
    });

    it('throws UnauthorizedException on invalid token', async () => {
      await expect(controller.getMe(makeReq('bad.token.here') as any)).rejects.toThrow();
    });

    it('throws UnauthorizedException when token type is not portal', async () => {
      const token = jwt.sign({ sub: 'cust-1', email: 'a@b.com', type: 'user' }, JWT_SECRET);
      await expect(controller.getMe(makeReq(token) as any)).rejects.toThrow('Invalid token');
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

      const result = await controller.getMe(makeReq(token) as any);

      expect((result as any).email).toBe('ana@example.com');
      expect((result as any).currentStage).toBe('NEW_LEAD');
    });

    it('throws UnauthorizedException when customer not found', async () => {
      const token = jwt.sign({ sub: 'ghost', email: 'ghost@x.com', type: 'portal' }, JWT_SECRET);
      prisma.customer.findUnique.mockResolvedValue(null);

      await expect(controller.getMe(makeReq(token) as any)).rejects.toThrow('Customer not found');
    });
  });
});
