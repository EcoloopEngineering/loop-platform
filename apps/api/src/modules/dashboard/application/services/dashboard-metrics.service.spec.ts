import { Test, TestingModule } from '@nestjs/testing';
import { DashboardMetricsService } from './dashboard-metrics.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('DashboardMetricsService', () => {
  let service: DashboardMetricsService;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardMetricsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<DashboardMetricsService>(DashboardMetricsService);
  });

  describe('getMetrics', () => {
    it('should return aggregated platform metrics', async () => {
      prisma.lead.count
        .mockResolvedValueOnce(100)  // totalLeads
        .mockResolvedValueOnce(25);  // wonLeads
      prisma.commission.aggregate.mockResolvedValue({
        _sum: { amount: 50000 },
      });
      prisma.user.count.mockResolvedValue(15);

      const result = await service.getMetrics('2026-01-01', '2026-03-31');

      expect(result).toEqual({
        totalLeads: 100,
        wonLeads: 25,
        conversionRate: 25,
        totalCommission: 50000,
        activeUsers: 15,
      });
    });

    it('should return 0 conversion rate when no leads exist', async () => {
      prisma.lead.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      prisma.commission.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });
      prisma.user.count.mockResolvedValue(5);

      const result = await service.getMetrics('2026-01-01', '2026-03-31');

      expect(result.conversionRate).toBe(0);
      expect(result.totalCommission).toBe(0);
    });

    it('should construct correct date filters for Prisma queries', async () => {
      prisma.lead.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(2);
      prisma.commission.aggregate.mockResolvedValue({
        _sum: { amount: 1000 },
      });
      prisma.user.count.mockResolvedValue(3);

      await service.getMetrics('2026-02-01', '2026-02-28');

      const expectedDateFilter = {
        createdAt: {
          gte: new Date('2026-02-01'),
          lte: new Date('2026-02-28'),
        },
      };

      expect(prisma.lead.count).toHaveBeenCalledWith({ where: expectedDateFilter });
      expect(prisma.lead.count).toHaveBeenCalledWith({
        where: { currentStage: 'WON', ...expectedDateFilter },
      });
      expect(prisma.commission.aggregate).toHaveBeenCalledWith({
        where: { status: 'ACTIVE', ...expectedDateFilter },
        _sum: { amount: true },
      });
      expect(prisma.user.count).toHaveBeenCalledWith({ where: { isActive: true } });
    });
  });
});
