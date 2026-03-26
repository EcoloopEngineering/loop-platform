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

    const userLeadFilter = {
      assignments: { some: { userId: query.userId } },
      ...dateFilter,
    };

    const [totalLeads, wonLeads, lostLeads, commissions, leadsByStage] =
      await Promise.all([
        this.prisma.lead.count({
          where: userLeadFilter,
        }),
        this.prisma.lead.count({
          where: { ...userLeadFilter, currentStage: 'WON' },
        }),
        this.prisma.lead.count({
          where: { ...userLeadFilter, status: 'LOST' },
        }),
        this.prisma.commission.aggregate({
          where: { userId: query.userId, ...dateFilter },
          _sum: { amount: true },
        }),
        this.prisma.lead.groupBy({
          by: ['currentStage'],
          where: userLeadFilter,
          _count: true,
        }),
      ]);

    const pendingCommissions = await this.prisma.commission.aggregate({
      where: {
        userId: query.userId,
        status: { in: ['PENDING'] },
        ...dateFilter,
      },
      _sum: { amount: true },
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
      totalCommission: Number(commissions._sum?.amount ?? 0),
      pendingCommission: Number(pendingCommissions._sum?.amount ?? 0),
      leadsbyStage,
    };
  }
}
