import { Test, TestingModule } from '@nestjs/testing';
import { DashboardMetricsService } from './dashboard-metrics.service';
import { DASHBOARD_REPOSITORY } from '../ports/dashboard.repository.port';
import { CacheService } from '../../../../infrastructure/cache/cache.service';

describe('DashboardMetricsService', () => {
  let service: DashboardMetricsService;
  let cache: CacheService;
  let mockRepo: {
    countLeads: jest.Mock;
    aggregateCommission: jest.Mock;
    countActiveUsers: jest.Mock;
  };

  beforeEach(async () => {
    mockRepo = {
      countLeads: jest.fn(),
      aggregateCommission: jest.fn(),
      countActiveUsers: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardMetricsService,
        { provide: DASHBOARD_REPOSITORY, useValue: mockRepo },
        CacheService,
      ],
    }).compile();

    service = module.get<DashboardMetricsService>(DashboardMetricsService);
    cache = module.get<CacheService>(CacheService);
  });

  describe('getMetrics', () => {
    it('should return aggregated platform metrics', async () => {
      mockRepo.countLeads
        .mockResolvedValueOnce(100)  // totalLeads
        .mockResolvedValueOnce(25);  // wonLeads
      mockRepo.aggregateCommission.mockResolvedValue(50000);
      mockRepo.countActiveUsers.mockResolvedValue(15);

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
      mockRepo.countLeads
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockRepo.aggregateCommission.mockResolvedValue(0);
      mockRepo.countActiveUsers.mockResolvedValue(5);

      const result = await service.getMetrics('2026-01-01', '2026-03-31');

      expect(result.conversionRate).toBe(0);
      expect(result.totalCommission).toBe(0);
    });

    it('should construct correct date filters for repository calls', async () => {
      mockRepo.countLeads
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(2);
      mockRepo.aggregateCommission.mockResolvedValue(1000);
      mockRepo.countActiveUsers.mockResolvedValue(3);

      await service.getMetrics('2026-02-01', '2026-02-28');

      const expectedDateFilter = {
        createdAt: {
          gte: new Date('2026-02-01'),
          lte: new Date('2026-02-28'),
        },
      };

      expect(mockRepo.countLeads).toHaveBeenCalledWith(expectedDateFilter);
      expect(mockRepo.countLeads).toHaveBeenCalledWith({
        currentStage: 'WON',
        ...expectedDateFilter,
      });
      expect(mockRepo.aggregateCommission).toHaveBeenCalledWith({
        status: 'ACTIVE',
        ...expectedDateFilter,
      });
      expect(mockRepo.countActiveUsers).toHaveBeenCalled();
    });

    it('should return cached result on second call', async () => {
      mockRepo.countLeads
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(25);
      mockRepo.aggregateCommission.mockResolvedValue(50000);
      mockRepo.countActiveUsers.mockResolvedValue(15);

      // First call — hits the repository
      await service.getMetrics('2026-01-01', '2026-03-31');

      // Reset mocks to verify second call doesn't hit repo
      mockRepo.countLeads.mockClear();
      mockRepo.aggregateCommission.mockClear();
      mockRepo.countActiveUsers.mockClear();

      // Second call — should return cached data
      const result = await service.getMetrics('2026-01-01', '2026-03-31');

      expect(result.totalLeads).toBe(100);
      expect(mockRepo.countLeads).not.toHaveBeenCalled();
      expect(mockRepo.aggregateCommission).not.toHaveBeenCalled();
    });

    it('should fetch fresh data after cache invalidation', async () => {
      mockRepo.countLeads
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(25);
      mockRepo.aggregateCommission.mockResolvedValue(50000);
      mockRepo.countActiveUsers.mockResolvedValue(15);

      await service.getMetrics('2026-01-01', '2026-03-31');

      // Invalidate cache
      cache.invalidateByPrefix('dashboard:');

      // Set up new mock values
      mockRepo.countLeads
        .mockResolvedValueOnce(200)
        .mockResolvedValueOnce(50);
      mockRepo.aggregateCommission.mockResolvedValue(100000);
      mockRepo.countActiveUsers.mockResolvedValue(20);

      const result = await service.getMetrics('2026-01-01', '2026-03-31');

      expect(result.totalLeads).toBe(200);
    });
  });
});
