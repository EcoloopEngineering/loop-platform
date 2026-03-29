import { Test } from '@nestjs/testing';
import { GetScoreboardHandler, GetScoreboardQuery } from './get-scoreboard.handler';
import { DASHBOARD_REPOSITORY } from '../ports/dashboard.repository.port';

describe('GetScoreboardHandler', () => {
  let handler: GetScoreboardHandler;
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
        GetScoreboardHandler,
        { provide: DASHBOARD_REPOSITORY, useValue: repo },
      ],
    }).compile();

    handler = module.get(GetScoreboardHandler);
  });

  it('should return scoreboard entries with user names and commissions', async () => {
    repo.groupWonDealsByUser.mockResolvedValue([
      { userId: 'u1', _count: 5 },
      { userId: 'u2', _count: 3 },
    ]);
    repo.groupCommissionsByUsers.mockResolvedValue([
      { userId: 'u1', totalAmount: 15000 },
      { userId: 'u2', totalAmount: 8000 },
    ]);
    repo.findUserNamesByIds.mockResolvedValue([
      { id: 'u1', firstName: 'John', lastName: 'Doe' },
      { id: 'u2', firstName: 'Jane', lastName: 'Smith' },
    ]);

    const query = new GetScoreboardQuery('2026-01-01', '2026-03-31', 10);
    const result = await handler.execute(query);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      userId: 'u1',
      userName: 'John Doe',
      wonDeals: 5,
      totalCommission: 15000,
    });
    expect(result[1]).toEqual({
      userId: 'u2',
      userName: 'Jane Smith',
      wonDeals: 3,
      totalCommission: 8000,
    });
  });

  it('should return empty array when no won deals', async () => {
    repo.groupWonDealsByUser.mockResolvedValue([]);
    repo.groupCommissionsByUsers.mockResolvedValue([]);
    repo.findUserNamesByIds.mockResolvedValue([]);

    const query = new GetScoreboardQuery('2026-01-01', '2026-03-31', 10);
    const result = await handler.execute(query);

    expect(result).toEqual([]);
  });

  it('should handle missing commission data gracefully', async () => {
    repo.groupWonDealsByUser.mockResolvedValue([
      { userId: 'u1', _count: 2 },
    ]);
    repo.groupCommissionsByUsers.mockResolvedValue([]);
    repo.findUserNamesByIds.mockResolvedValue([
      { id: 'u1', firstName: 'Alice', lastName: 'Wonder' },
    ]);

    const query = new GetScoreboardQuery('2026-01-01', '2026-03-31', 5);
    const result = await handler.execute(query);

    expect(result[0].totalCommission).toBe(0);
    expect(result[0].userName).toBe('Alice Wonder');
  });
});
