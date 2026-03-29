import { Test, TestingModule } from '@nestjs/testing';
import { PrismaPropertyRepository } from './prisma-property.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

const mockProperty = {
  id: 'prop-1',
  customerId: 'cust-1',
  propertyType: 'RESIDENTIAL',
  streetAddress: '123 Main St',
  city: 'Austin',
  state: 'TX',
  zip: '78701',
  latitude: 30.2672,
  longitude: -97.7431,
  roofCondition: 'GOOD',
  roofAgeYears: null,
  electricalService: '200A',
  hasPool: false,
  hasEV: true,
  monthlyBill: 200,
  annualKwhUsage: null,
  utilityProvider: 'Austin Energy',
  isInsideServiceArea: true,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('PrismaPropertyRepository', () => {
  let repo: PrismaPropertyRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaPropertyRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repo = module.get(PrismaPropertyRepository);
  });

  describe('create', () => {
    it('should create and return a PropertyEntity', async () => {
      prisma.property.create.mockResolvedValue(mockProperty);

      const result = await repo.create({
        customerId: 'cust-1',
        streetAddress: '123 Main St',
        city: 'Austin',
        state: 'TX',
        zip: '78701',
        propertyType: 'RESIDENTIAL',
        hasPool: false,
        hasEV: true,
      });

      expect(prisma.property.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ customerId: 'cust-1', streetAddress: '123 Main St' }),
      });
      expect(result.id).toBe('prop-1');
      expect(result.streetAddress).toBe('123 Main St');
    });
  });

  describe('findById', () => {
    it('should return a PropertyEntity when found', async () => {
      prisma.property.findUnique.mockResolvedValue(mockProperty);
      const result = await repo.findById('prop-1');
      expect(result?.id).toBe('prop-1');
      expect(result?.fullAddress).toBe('123 Main St, Austin, TX 78701');
    });

    it('should return null when not found', async () => {
      prisma.property.findUnique.mockResolvedValue(null);
      const result = await repo.findById('bad-id');
      expect(result).toBeNull();
    });
  });

  describe('findByCustomerId', () => {
    it('should return properties for a customer', async () => {
      prisma.property.findMany.mockResolvedValue([mockProperty]);

      const result = await repo.findByCustomerId('cust-1');

      expect(prisma.property.findMany).toHaveBeenCalledWith({
        where: { customerId: 'cust-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('prop-1');
    });

    it('should return empty array when no properties found', async () => {
      prisma.property.findMany.mockResolvedValue([]);

      const result = await repo.findByCustomerId('no-props');

      expect(result).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('should update and return a PropertyEntity', async () => {
      const updated = { ...mockProperty, streetAddress: '456 Oak Ave' };
      prisma.property.update.mockResolvedValue(updated);

      const result = await repo.update('prop-1', { streetAddress: '456 Oak Ave' });

      expect(prisma.property.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'prop-1' } }),
      );
      expect(result.streetAddress).toBe('456 Oak Ave');
    });
  });
});
