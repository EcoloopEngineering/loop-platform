import { Test, TestingModule } from '@nestjs/testing';
import { QueryBus } from '@nestjs/cqrs';
import { DashboardController } from './dashboard.controller';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { DashboardMetricsService } from '../application/services/dashboard-metrics.service';
import { GetDashboardQuery } from '../application/queries/get-dashboard.handler';
import { GetScoreboardQuery } from '../application/queries/get-scoreboard.handler';

describe('DashboardController', () => {
  let controller: DashboardController;
  let queryBus: { execute: jest.Mock };
  let metricsService: { getMetrics: jest.Mock };

  beforeEach(async () => {
    queryBus = { execute: jest.fn() };
    metricsService = { getMetrics: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        { provide: QueryBus, useValue: queryBus },
        { provide: DashboardMetricsService, useValue: metricsService },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DashboardController>(DashboardController);
  });

  describe('getDashboard', () => {
    it('should execute GetDashboardQuery with user id and date range', async () => {
      const dashboardData = { totalLeads: 10, wonDeals: 3 };
      queryBus.execute.mockResolvedValue(dashboardData);

      const user = { id: 'user-1', email: 'test@test.com', firstName: 'Test', lastName: 'User', phone: '', role: 'ADMIN', isActive: true, teamId: null } as any;
      const result = await controller.getDashboard(user, '2026-01-01', '2026-03-31');

      expect(queryBus.execute).toHaveBeenCalledWith(
        new GetDashboardQuery('user-1', '2026-01-01', '2026-03-31'),
      );
      expect(result).toEqual(dashboardData);
    });
  });

  describe('getScoreboard', () => {
    it('should execute GetScoreboardQuery with date range and default limit', async () => {
      const scoreboard = [{ userId: 'u1', wonDeals: 5 }];
      queryBus.execute.mockResolvedValue(scoreboard);

      const result = await controller.getScoreboard('2026-01-01', '2026-03-31');

      expect(queryBus.execute).toHaveBeenCalledWith(
        new GetScoreboardQuery('2026-01-01', '2026-03-31', 10),
      );
      expect(result).toEqual(scoreboard);
    });

    it('should pass custom limit when provided', async () => {
      queryBus.execute.mockResolvedValue([]);

      await controller.getScoreboard('2026-01-01', '2026-03-31', '5');

      expect(queryBus.execute).toHaveBeenCalledWith(
        new GetScoreboardQuery('2026-01-01', '2026-03-31', 5),
      );
    });
  });

  describe('getMetrics', () => {
    it('should delegate to DashboardMetricsService', async () => {
      const metricsData = {
        totalLeads: 100,
        wonLeads: 25,
        conversionRate: 25,
        totalCommission: 50000,
        activeUsers: 15,
      };
      metricsService.getMetrics.mockResolvedValue(metricsData);

      const result = await controller.getMetrics('2026-01-01', '2026-03-31');

      expect(metricsService.getMetrics).toHaveBeenCalledWith('2026-01-01', '2026-03-31');
      expect(result).toEqual(metricsData);
    });
  });
});
