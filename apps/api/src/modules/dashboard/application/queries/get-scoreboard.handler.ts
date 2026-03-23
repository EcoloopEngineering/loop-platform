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

    // Get won deals count per user via lead assignments
    const wonAssignments = await this.prisma.leadAssignment.groupBy({
      by: ['userId'],
      where: {
        lead: {
          currentStage: 'WON',
          createdAt: dateFilter,
        },
      },
      _count: true,
      orderBy: { _count: { userId: 'desc' } },
      take: query.limit,
    });

    const userIds = wonAssignments.map((d) => d.userId);

    // Get total commission per user
    const commissionsPerUser = await this.prisma.commission.groupBy({
      by: ['userId'],
      where: {
        userId: { in: userIds },
        status: 'ACTIVE',
        createdAt: dateFilter,
      },
      _sum: { amount: true },
    });

    const commissionMap = new Map(
      commissionsPerUser.map((c) => [c.userId, c._sum?.amount ?? 0]),
    );

    // Get user names
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true },
    });

    const userNameMap = new Map(
      users.map((u) => [u.id, `${u.firstName} ${u.lastName}`]),
    );

    return wonAssignments.map((entry) => ({
      userId: entry.userId,
      userName: userNameMap.get(entry.userId) ?? 'Unknown',
      wonDeals: entry._count,
      totalCommission: Number(commissionMap.get(entry.userId) ?? 0),
    }));
  }
}
