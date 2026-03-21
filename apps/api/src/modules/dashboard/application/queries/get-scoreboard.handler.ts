import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

export class GetScoreboardQuery {
  constructor(
    public readonly startDate: string,
    public readonly endDate: string,
    public readonly limit: number,
  ) {}
}

interface ScoreboardEntry {
  userId: string;
  userName: string;
  wonDeals: number;
  totalCommission: number;
}

@QueryHandler(GetScoreboardQuery)
@Injectable()
export class GetScoreboardHandler implements IQueryHandler<GetScoreboardQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetScoreboardQuery): Promise<ScoreboardEntry[]> {
    const dateFilter = {
      gte: new Date(query.startDate),
      lte: new Date(query.endDate),
    };

    // Get won deals count per user
    const wonDealsPerUser = await this.prisma.lead.groupBy({
      by: ['assignedTo'],
      where: {
        stage: 'WON',
        createdAt: dateFilter,
      },
      _count: { _all: true },
      orderBy: { _count: { assignedTo: 'desc' } },
      take: query.limit,
    });

    const userIds = wonDealsPerUser.map((d) => d.assignedTo);

    // Get total commission per user
    const commissionsPerUser = await this.prisma.commission.groupBy({
      by: ['userId'],
      where: {
        userId: { in: userIds },
        status: 'FINALIZED',
        createdAt: dateFilter,
      },
      _sum: { calculatedAmount: true },
    });

    const commissionMap = new Map(
      commissionsPerUser.map((c) => [c.userId, c._sum.calculatedAmount ?? 0]),
    );

    // Get user names
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true },
    });

    const userNameMap = new Map(
      users.map((u) => [u.id, `${u.firstName} ${u.lastName}`]),
    );

    return wonDealsPerUser.map((entry) => ({
      userId: entry.assignedTo,
      userName: userNameMap.get(entry.assignedTo) ?? 'Unknown',
      wonDeals: entry._count._all,
      totalCommission: commissionMap.get(entry.assignedTo) ?? 0,
    }));
  }
}
