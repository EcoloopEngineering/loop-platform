import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { PortalRegistrationService } from './portal-registration.service';
import { PortalAuthService } from './portal-auth.service';
import { CUSTOMER_REPOSITORY } from '../ports/customer.repository.port';

const mockCustomerRepo = {
  findByEmailRaw: jest.fn(),
  createWithMetadata: jest.fn(),
  updateRaw: jest.fn(),
};

const mockPortalAuth = {
  getMeta: jest.fn((raw: unknown) => (raw as Record<string, unknown>) ?? {}),
  generateToken: jest.fn().mockReturnValue('mock-token'),
  sanitize: jest.fn((c: any) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    name: `${c.firstName} ${c.lastName}`,
    email: c.email,
    phone: c.phone,
  })),
};

describe('PortalRegistrationService', () => {
  let service: PortalRegistrationService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortalRegistrationService,
        { provide: CUSTOMER_REPOSITORY, useValue: mockCustomerRepo },
        { provide: PortalAuthService, useValue: mockPortalAuth },
      ],
    }).compile();

    service = module.get<PortalRegistrationService>(PortalRegistrationService);
  });

  const dto = {
    firstName: 'Ana',
    lastName: 'Silva',
    email: 'ana@example.com',
    password: 'password123',
  };

  describe('register', () => {
    it('creates a new customer and returns token', async () => {
      mockCustomerRepo.findByEmailRaw.mockResolvedValue(null);
      mockCustomerRepo.createWithMetadata.mockResolvedValue({
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
      expect(mockCustomerRepo.createWithMetadata).toHaveBeenCalledTimes(1);
    });

    it('throws ConflictException when customer already has a password', async () => {
      const hash = await bcrypt.hash('existing', 12);
      mockCustomerRepo.findByEmailRaw.mockResolvedValue({
        id: 'cust-1',
        email: 'ana@example.com',
        metadata: { passwordHash: hash },
      });
      mockPortalAuth.getMeta.mockReturnValueOnce({ passwordHash: hash });

      await expect(service.register(dto)).rejects.toThrow('An account with this email already exists');
      expect(mockCustomerRepo.createWithMetadata).not.toHaveBeenCalled();
    });

    it('sets password on existing customer without one', async () => {
      mockCustomerRepo.findByEmailRaw.mockResolvedValue({
        id: 'cust-1',
        firstName: 'Ana',
        lastName: 'Silva',
        email: 'ana@example.com',
        phone: null,
        metadata: {},
      });
      mockPortalAuth.getMeta.mockReturnValueOnce({});
      mockCustomerRepo.updateRaw.mockResolvedValue({
        id: 'cust-1',
        firstName: 'Ana',
        lastName: 'Silva',
        email: 'ana@example.com',
        phone: null,
        metadata: {},
      });

      const result = await service.register(dto);

      expect(result).toHaveProperty('token');
      expect(mockCustomerRepo.updateRaw).toHaveBeenCalledTimes(1);
    });
  });
});
