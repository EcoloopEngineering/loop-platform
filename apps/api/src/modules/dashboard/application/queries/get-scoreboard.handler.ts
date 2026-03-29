import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { DASHBOARD_REPOSITORY, DashboardRepositoryPort } from '../ports/dashboard.repository.port';

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
  constructor(
    @Inject(DASHBOARD_REPOSITORY) private readonly repo: DashboardRepositoryPort,
  ) {}

  async execute(query: GetScoreboardQuery): Promise<ScoreboardEntry[]> {
    const dateFilter = {
      gte: new Date(query.startDate),
      lte: new Date(query.endDate),
    };

    // Get won deals count per user via lead assignments
    const wonAssignments = await this.repo.groupWonDealsByUser(dateFilter, query.limit);

    const userIds = wonAssignments.map((d) => d.userId);

    // Get total commission per user
    const commissionsPerUser = await this.repo.groupCommissionsByUsers(userIds, dateFilter);

    const commissionMap = new Map(
      commissionsPerUser.map((c) => [c.userId, c.totalAmount]),
    );

    // Get user names
    const users = await this.repo.findUserNamesByIds(userIds);

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
