import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { PortalAuthService } from './portal-auth.service';
import { CUSTOMER_REPOSITORY } from '../ports/customer.repository.port';

const JWT_SECRET = 'test-secret';

const mockCustomerRepo = {
  findByEmailRaw: jest.fn(),
  findByIdRaw: jest.fn(),
  findLatestLeadForCustomer: jest.fn(),
  findLatestLeadForCustomerWithRelations: jest.fn(),
};

describe('PortalAuthService', () => {
  let service: PortalAuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortalAuthService,
        { provide: CUSTOMER_REPOSITORY, useValue: mockCustomerRepo },
        {
          provide: ConfigService,
          useValue: { get: (_key: string, _fallback?: string) => JWT_SECRET },
        },
      ],
    }).compile();

    service = module.get<PortalAuthService>(PortalAuthService);
  });

  // ── login ─────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns token on valid credentials', async () => {
      const hash = await bcrypt.hash('password123', 12);
      mockCustomerRepo.findByEmailRaw.mockResolvedValueOnce({
        id: 'cust-1',
        firstName: 'Ana',
        lastName: 'Silva',
        email: 'ana@example.com',
        phone: null,
        metadata: { passwordHash: hash },
      });
      mockCustomerRepo.findLatestLeadForCustomer.mockResolvedValue(null);

      const result = await service.login({ email: 'ana@example.com', password: 'password123' });

      expect(result).toHaveProperty('token');
      expect(result.customer.email).toBe('ana@example.com');
    });

    it('throws UnauthorizedException when customer not found', async () => {
      mockCustomerRepo.findByEmailRaw.mockResolvedValue(null);
      await expect(service.login({ email: 'x@x.com', password: 'pass' })).rejects.toThrow('Invalid email or password');
    });

    it('throws UnauthorizedException when no passwordHash set', async () => {
      mockCustomerRepo.findByEmailRaw.mockResolvedValue({ id: 'cust-1', email: 'ana@example.com', metadata: {} });
      await expect(service.login({ email: 'ana@example.com', password: 'password123' })).rejects.toThrow('Invalid email or password');
    });

    it('throws UnauthorizedException on wrong password', async () => {
      const hash = await bcrypt.hash('correctpass', 12);
      mockCustomerRepo.findByEmailRaw.mockResolvedValue({ id: 'cust-1', email: 'ana@example.com', metadata: { passwordHash: hash } });
      await expect(service.login({ email: 'ana@example.com', password: 'wrongpass' })).rejects.toThrow('Invalid email or password');
    });

    it('includes currentStage from lead in response', async () => {
      const hash = await bcrypt.hash('password123', 12);
      mockCustomerRepo.findByEmailRaw.mockResolvedValueOnce({
        id: 'cust-1',
        firstName: 'Ana',
        lastName: 'Silva',
        email: 'ana@example.com',
        phone: null,
        metadata: { passwordHash: hash },
      });
      mockCustomerRepo.findLatestLeadForCustomer.mockResolvedValue({
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
      mockCustomerRepo.findByIdRaw.mockResolvedValue({
        id: 'cust-1',
        firstName: 'Ana',
        lastName: 'Silva',
        email: 'ana@example.com',
        phone: null,
        metadata: {},
      });
      mockCustomerRepo.findLatestLeadForCustomerWithRelations.mockResolvedValue(null);

      const result = await service.getMe(`Bearer ${token}`);

      expect(result.email).toBe('ana@example.com');
      expect(result.currentStage).toBe('NEW_LEAD');
    });

    it('throws UnauthorizedException when customer not found', async () => {
      const token = jwt.sign({ sub: 'ghost', email: 'ghost@x.com', type: 'portal' }, JWT_SECRET);
      mockCustomerRepo.findByIdRaw.mockResolvedValue(null);

      await expect(service.getMe(`Bearer ${token}`)).rejects.toThrow('Customer not found');
    });
  });

  // ── helper methods ────────────────────────────────────────────────────────

  describe('generateToken', () => {
    it('returns a valid JWT with portal type', () => {
      const token = service.generateToken('cust-1', 'ana@example.com');
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      expect(decoded.sub).toBe('cust-1');
      expect(decoded.type).toBe('portal');
    });
  });

  describe('getMeta', () => {
    it('returns metadata object from raw', () => {
      const meta = service.getMeta({ passwordHash: 'abc' });
      expect(meta.passwordHash).toBe('abc');
    });

    it('returns empty object for null', () => {
      const meta = service.getMeta(null);
      expect(meta).toEqual({});
    });
  });

  describe('sanitize', () => {
    it('returns sanitized customer object', () => {
      const result = service.sanitize({
        id: 'cust-1',
        firstName: 'Ana',
        lastName: 'Silva',
        email: 'ana@example.com',
        phone: null,
      });
      expect(result.name).toBe('Ana Silva');
      expect(result).not.toHaveProperty('metadata');
    });
  });
});
