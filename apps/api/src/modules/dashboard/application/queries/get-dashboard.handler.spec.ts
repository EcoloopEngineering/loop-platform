import { Test } from '@nestjs/testing';
import {
  GetDashboardHandler,
  GetDashboardQuery,
} from './get-dashboard.handler';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../../../test/prisma-mock.helper';

describe('GetDashboardHandler', () => {
  let handler: GetDashboardHandler;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    // Add groupBy mock since it's not in the standard helper
    (prisma.lead as any).groupBy = jest.fn();

    const module = await Test.createTestingModule({
      providers: [
        GetDashboardHandler,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    handler = module.get(GetDashboardHandler);
  });

  const query = new GetDashboardQuery('user-1', '2026-01-01', '2026-03-31');

  it('should return dashboard metrics with data', async () => {
    prisma.lead.count
      .mockResolvedValueOnce(20) // totalLeads
      .mockResolvedValueOnce(5)  // wonLeads
      .mockResolvedValueOnce(3); // lostLeads

    prisma.commission.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 15000 } }) // total
      .mockResolvedValueOnce({ _sum: { amount: 3000 } }); // pending

    (prisma.lead as any).groupBy.mockResolvedValue([
      { currentStage: 'NEW_LEAD', _count: 8 },
      { currentStage: 'DESIGN_READY', _count: 7 },
      { currentStage: 'WON', _count: 5 },
    ]);

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
    prisma.lead.count
      .mockResolvedValueOnce(0) // totalLeads
      .mockResolvedValueOnce(0) // wonLeads
      .mockResolvedValueOnce(0); // lostLeads

    prisma.commission.aggregate
      .mockResolvedValueOnce({ _sum: { amount: null } })
      .mockResolvedValueOnce({ _sum: { amount: null } });

    (prisma.lead as any).groupBy.mockResolvedValue([]);

    const result = await handler.execute(query);

    expect(result.conversionRate).toBe(0);
    expect(result.totalCommission).toBe(0);
    expect(result.pendingCommission).toBe(0);
    expect(result.leadsbyStage).toEqual({});
  });

  it('should handle null commission sums gracefully', async () => {
    prisma.lead.count
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);

    prisma.commission.aggregate
      .mockResolvedValueOnce({ _sum: { amount: null } })
      .mockResolvedValueOnce({ _sum: { amount: null } });

    (prisma.lead as any).groupBy.mockResolvedValue([]);

    const result = await handler.execute(query);

    expect(result.totalCommission).toBe(0);
    expect(result.pendingCommission).toBe(0);
  });

  it('should apply date filters to queries', async () => {
    prisma.lead.count.mockResolvedValue(0);
    prisma.commission.aggregate.mockResolvedValue({ _sum: { amount: null } });
    (prisma.lead as any).groupBy.mockResolvedValue([]);

    await handler.execute(query);

    expect(prisma.lead.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        createdAt: {
          gte: new Date('2026-01-01'),
          lte: new Date('2026-03-31'),
        },
      }),
    });
  });
});
