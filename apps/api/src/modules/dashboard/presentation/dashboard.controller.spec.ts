import { Test, TestingModule } from '@nestjs/testing';
import { QueryBus } from '@nestjs/cqrs';
import { DashboardController } from './dashboard.controller';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { createMockPrismaService, MockPrismaService } from '../../../test/prisma-mock.helper';
import { GetDashboardQuery } from '../application/queries/get-dashboard.handler';
import { GetScoreboardQuery } from '../application/queries/get-scoreboard.handler';

describe('DashboardController', () => {
  let controller: DashboardController;
  let queryBus: { execute: jest.Mock };
  let prisma: MockPrismaService;

  beforeEach(async () => {
    queryBus = { execute: jest.fn() };
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        { provide: QueryBus, useValue: queryBus },
        { provide: PrismaService, useValue: prisma },
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

      const user = { id: 'user-1' };
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
    it('should return aggregated platform metrics', async () => {
      prisma.lead.count
        .mockResolvedValueOnce(100)  // totalLeads
        .mockResolvedValueOnce(25);  // wonLeads
      (prisma.commission as any).aggregate = jest.fn().mockResolvedValue({
        _sum: { amount: 50000 },
      });
      prisma.user.count.mockResolvedValue(15);

      const result = await controller.getMetrics('2026-01-01', '2026-03-31');

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
      (prisma.commission as any).aggregate = jest.fn().mockResolvedValue({
        _sum: { amount: null },
      });
      prisma.user.count.mockResolvedValue(5);

      const result = await controller.getMetrics('2026-01-01', '2026-03-31');

      expect(result.conversionRate).toBe(0);
      expect(result.totalCommission).toBe(0);
    });
  });
});
