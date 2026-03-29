import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { DASHBOARD_REPOSITORY, DashboardRepositoryPort } from '../ports/dashboard.repository.port';

export class GetDashboardQuery {
  constructor(
    public readonly userId: string,
    public readonly startDate: string,
    public readonly endDate: string,
  ) {}
}

interface DashboardResult {
  totalLeads: number;
  wonLeads: number;
  lostLeads: number;
  conversionRate: number;
  totalCommission: number;
  pendingCommission: number;
  leadsbyStage: Record<string, number>;
}

@QueryHandler(GetDashboardQuery)
@Injectable()
export class GetDashboardHandler implements IQueryHandler<GetDashboardQuery> {
  constructor(
    @Inject(DASHBOARD_REPOSITORY) private readonly repo: DashboardRepositoryPort,
  ) {}

  async execute(query: GetDashboardQuery): Promise<DashboardResult> {
    const dateFilter = {
      createdAt: {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      },
    };

    const userLeadFilter = {
      assignments: { some: { userId: query.userId } },
      ...dateFilter,
    };

    const [totalLeads, wonLeads, lostLeads, totalCommission, leadsByStage] =
      await Promise.all([
        this.repo.countLeads(userLeadFilter),
        this.repo.countLeads({ ...userLeadFilter, currentStage: 'WON' }),
        this.repo.countLeads({ ...userLeadFilter, status: 'LOST' }),
        this.repo.aggregateCommission({ userId: query.userId, ...dateFilter }),
        this.repo.groupLeadsByStage(userLeadFilter),
      ]);

    const pendingCommission = await this.repo.aggregatePendingCommission({
      userId: query.userId,
      status: { in: ['PENDING'] },
      ...dateFilter,
    });

    const leadsbyStage: Record<string, number> = {};
    for (const group of leadsByStage) {
      leadsbyStage[group.currentStage] = group._count;
    }

    return {
      totalLeads,
      wonLeads,
      lostLeads,
      conversionRate: totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0,
      totalCommission,
      pendingCommission,
      leadsbyStage,
    };
  }
}
