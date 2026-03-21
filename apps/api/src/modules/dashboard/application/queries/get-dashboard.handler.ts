import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetDashboardQuery): Promise<DashboardResult> {
    const dateFilter = {
      createdAt: {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      },
    };

    const [totalLeads, wonLeads, lostLeads, commissions, leadsByStage] =
      await Promise.all([
        this.prisma.lead.count({
          where: { assignedTo: query.userId, ...dateFilter },
        }),
        this.prisma.lead.count({
          where: { assignedTo: query.userId, stage: 'WON', ...dateFilter },
        }),
        this.prisma.lead.count({
          where: { assignedTo: query.userId, stage: 'LOST', ...dateFilter },
        }),
        this.prisma.commission.aggregate({
          where: { userId: query.userId, ...dateFilter },
          _sum: { calculatedAmount: true },
        }),
        this.prisma.lead.groupBy({
          by: ['stage'],
          where: { assignedTo: query.userId, ...dateFilter },
          _count: { _all: true },
        }),
      ]);

    const pendingCommissions = await this.prisma.commission.aggregate({
      where: {
        userId: query.userId,
        status: { in: ['PENDING', 'CALCULATED'] },
        ...dateFilter,
      },
      _sum: { calculatedAmount: true },
    });

    const leadsbyStage: Record<string, number> = {};
    for (const group of leadsByStage) {
      leadsbyStage[group.stage] = group._count._all;
    }

    return {
      totalLeads,
      wonLeads,
      lostLeads,
      conversionRate: totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0,
      totalCommission: commissions._sum.calculatedAmount ?? 0,
      pendingCommission: pendingCommissions._sum.calculatedAmount ?? 0,
      leadsbyStage,
    };
  }
}
