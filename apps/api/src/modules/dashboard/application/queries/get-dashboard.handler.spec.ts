import { Test } from '@nestjs/testing';
import {
  GetDashboardHandler,
  GetDashboardQuery,
} from './get-dashboard.handler';
import { DASHBOARD_REPOSITORY } from '../ports/dashboard.repository.port';

describe('GetDashboardHandler', () => {
  let handler: GetDashboardHandler;
  let repo: Record<string, jest.Mock>;

  beforeEach(async () => {
    repo = {
      countLeads: jest.fn(),
      aggregateCommission: jest.fn(),
      countActiveUsers: jest.fn(),
      groupLeadsByStage: jest.fn(),
      aggregatePendingCommission: jest.fn(),
      groupWonDealsByUser: jest.fn(),
      groupCommissionsByUsers: jest.fn(),
      findUserNamesByIds: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        GetDashboardHandler,
        { provide: DASHBOARD_REPOSITORY, useValue: repo },
      ],
    }).compile();

    handler = module.get(GetDashboardHandler);
  });

  const query = new GetDashboardQuery('user-1', '2026-01-01', '2026-03-31');

  it('should return dashboard metrics with data', async () => {
    repo.countLeads
      .mockResolvedValueOnce(20) // totalLeads
      .mockResolvedValueOnce(5)  // wonLeads
      .mockResolvedValueOnce(3); // lostLeads

    repo.aggregateCommission.mockResolvedValue(15000);

    repo.groupLeadsByStage.mockResolvedValue([
      { currentStage: 'NEW_LEAD', _count: 8 },
      { currentStage: 'DESIGN_READY', _count: 7 },
      { currentStage: 'WON', _count: 5 },
    ]);

    repo.aggregatePendingCommission.mockResolvedValue(3000);

    const result = await handler.execute(query);

    expect(result.totalLeads).toBe(20);
    expect(result.wonLeads).toBe(5);
    expect(result.lostLeads).toBe(3);
    expect(result.conversionRate).toBe(25); // 5/20 * 100
    expect(result.totalCommission).toBe(15000);
    expect(result.pendingCommission).toBe(3000);
    expect(result.leadsbyStage).toEqual({
      NEW_LEAD: 8,
      DESIGN_READY: 7,
      WON: 5,
    });
  });

  it('should return zero conversion rate when no leads', async () => {
    repo.countLeads
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    repo.aggregateCommission.mockResolvedValue(0);
    repo.groupLeadsByStage.mockResolvedValue([]);
    repo.aggregatePendingCommission.mockResolvedValue(0);

    const result = await handler.execute(query);

    expect(result.conversionRate).toBe(0);
    expect(result.totalCommission).toBe(0);
    expect(result.pendingCommission).toBe(0);
    expect(result.leadsbyStage).toEqual({});
  });

  it('should handle null commission sums gracefully', async () => {
    repo.countLeads
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);

    repo.aggregateCommission.mockResolvedValue(0);
    repo.groupLeadsByStage.mockResolvedValue([]);
    repo.aggregatePendingCommission.mockResolvedValue(0);

    const result = await handler.execute(query);

    expect(result.totalCommission).toBe(0);
    expect(result.pendingCommission).toBe(0);
  });

  it('should apply date filters to queries', async () => {
    repo.countLeads.mockResolvedValue(0);
    repo.aggregateCommission.mockResolvedValue(0);
    repo.groupLeadsByStage.mockResolvedValue([]);
    repo.aggregatePendingCommission.mockResolvedValue(0);

    await handler.execute(query);

    expect(repo.countLeads).toHaveBeenCalledWith(
      expect.objectContaining({
        createdAt: {
          gte: new Date('2026-01-01'),
          lte: new Date('2026-03-31'),
        },
      }),
    );
  });
});
