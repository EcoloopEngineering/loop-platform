import { Test, TestingModule } from '@nestjs/testing';
import { PrismaDashboardRepository } from './prisma-dashboard.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('PrismaDashboardRepository', () => {
  let repository: PrismaDashboardRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaDashboardRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<PrismaDashboardRepository>(PrismaDashboardRepository);
  });

  describe('countLeads', () => {
    it('should count leads with given where clause', async () => {
      prisma.lead.count.mockResolvedValue(42);

      const result = await repository.countLeads({ isActive: true });

      expect(result).toBe(42);
      expect(prisma.lead.count).toHaveBeenCalledWith({ where: { isActive: true } });
    });

    it('should count with empty where clause', async () => {
      prisma.lead.count.mockResolvedValue(0);

      const result = await repository.countLeads({});

      expect(result).toBe(0);
      expect(prisma.lead.count).toHaveBeenCalledWith({ where: {} });
    });
  });

  describe('aggregateCommission', () => {
    it('should return aggregated commission amount', async () => {
      prisma.commission.aggregate.mockResolvedValue({ _sum: { amount: 5000 } });

      const result = await repository.aggregateCommission({ userId: 'u1' });

      expect(result).toBe(5000);
      expect(prisma.commission.aggregate).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        _sum: { amount: true },
      });
    });

    it('should return 0 when no commissions exist', async () => {
      prisma.commission.aggregate.mockResolvedValue({ _sum: { amount: null } });

      const result = await repository.aggregateCommission({});

      expect(result).toBe(0);
    });
  });

  describe('countActiveUsers', () => {
    it('should count active users', async () => {
      prisma.user.count.mockResolvedValue(15);

      const result = await repository.countActiveUsers();

      expect(result).toBe(15);
      expect(prisma.user.count).toHaveBeenCalledWith({ where: { isActive: true } });
    });
  });
});
