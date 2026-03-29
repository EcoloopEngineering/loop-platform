import { Test, TestingModule } from '@nestjs/testing';
import { PrismaCustomerRepository } from './prisma-customer.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

const mockCustomer = {
  id: 'cust-1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '555-0100',
  source: 'DIRECT',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('PrismaCustomerRepository', () => {
  let repo: PrismaCustomerRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaCustomerRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repo = module.get(PrismaCustomerRepository);
  });

  describe('create', () => {
    it('should create and return a CustomerEntity', async () => {
      prisma.customer.create.mockResolvedValue(mockCustomer);

      const result = await repo.create({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      });

      expect(prisma.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ firstName: 'John', lastName: 'Doe' }),
      });
      expect(result.id).toBe('cust-1');
    });
  });

  describe('findById', () => {
    it('should return a CustomerEntity when found', async () => {
      prisma.customer.findUnique.mockResolvedValue(mockCustomer);
      const result = await repo.findById('cust-1');
      expect(result?.id).toBe('cust-1');
    });

    it('should return null when not found', async () => {
      prisma.customer.findUnique.mockResolvedValue(null);
      const result = await repo.findById('bad-id');
      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return CustomerEntity when email matches', async () => {
      prisma.customer.findFirst.mockResolvedValue(mockCustomer);
      const result = await repo.findByEmail('john@example.com');
      expect(result?.email).toBe('john@example.com');
    });

    it('should return null when email not found', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);
      const result = await repo.findByEmail('notfound@example.com');
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return paginated customers', async () => {
      prisma.customer.findMany.mockResolvedValue([mockCustomer]);
      prisma.customer.count.mockResolvedValue(1);

      const result = await repo.findAll({ page: 1, limit: 10 });

      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
    });

    it('should apply search filter', async () => {
      prisma.customer.findMany.mockResolvedValue([]);
      prisma.customer.count.mockResolvedValue(0);

      await repo.findAll({ page: 1, limit: 10, search: 'John' });

      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) }),
      );
    });
  });

  describe('update', () => {
    it('should update and return a CustomerEntity', async () => {
      const updated = { ...mockCustomer, firstName: 'Jane' };
      prisma.customer.update.mockResolvedValue(updated);

      const result = await repo.update('cust-1', { firstName: 'Jane' });

      expect(prisma.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'cust-1' } }),
      );
      expect(result.firstName).toBe('Jane');
    });
  });
});
