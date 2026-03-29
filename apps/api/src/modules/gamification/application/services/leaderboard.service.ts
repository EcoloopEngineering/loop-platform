import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

/** Point values per event type */
export const POINT_VALUES: Record<string, number> = {
  CONNECTED: 2,
  SALE: 4,
  PROJECT_SUBMISSION: 6,
  CUSTOMER_SUCCESS: 8,
};

/** Coin multipliers per event type (coins = multiplier * kw) */
export const COIN_MULTIPLIERS: Record<string, number> = {
  SALE: 2,
  INSTALL: 5,
  ASSIST: 0.5,
};

export interface LeaderboardEntry {
  userId: string;
  firstName: string;
  lastName: string;
  totalPoints: number;
}

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get leaderboard for the current week (Monday to Sunday)
   */
  async getWeeklyLeaderboard(): Promise<LeaderboardEntry[]> {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() + mondayOffset);
    startOfWeek.setHours(0, 0, 0, 0);

    return this.getLeaderboard(startOfWeek, now);
  }

  /**
   * Get leaderboard for the current month
   */
  async getMonthlyLeaderboard(): Promise<LeaderboardEntry[]> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return this.getLeaderboard(startOfMonth, now);
  }

  /**
   * Aggregate leaderboard by user's team (if teams/referral hierarchy exist)
   */
  async getTeamLeaderboard(): Promise<
    { inviterId: string; firstName: string; lastName: string; teamPoints: number }[]
  > {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const events = await this.prisma.gamificationEvent.findMany({
      where: {
        createdAt: { gte: startOfMonth, lte: now },
      },
      select: {
        userId: true,
        points: true,
      },
    });

    // Get referral relationships to map users to their inviter (team lead)
    const referrals = await this.prisma.referral.findMany({
      where: { status: 'accepted' },
      select: {
        inviterId: true,
        inviteeId: true,
      },
    });

    const inviterMap = new Map<string, string>();
    for (const r of referrals) {
      if (r.inviteeId) {
        inviterMap.set(r.inviteeId, r.inviterId);
      }
    }

    // Aggregate points by team lead
    const teamPoints = new Map<string, number>();
    for (const event of events) {
      const teamLead = inviterMap.get(event.userId) ?? event.userId;
      teamPoints.set(teamLead, (teamPoints.get(teamLead) ?? 0) + event.points);
    }

    // Get user info for team leads
    const teamLeadIds = Array.from(teamPoints.keys());
    if (teamLeadIds.length === 0) return [];

    const users = await this.prisma.user.findMany({
      where: { id: { in: teamLeadIds } },
      select: { id: true, firstName: true, lastName: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return teamLeadIds
      .map((id) => ({
        inviterId: id,
        firstName: userMap.get(id)?.firstName ?? '',
        lastName: userMap.get(id)?.lastName ?? '',
        teamPoints: teamPoints.get(id) ?? 0,
      }))
      .sort((a, b) => b.teamPoints - a.teamPoints);
  }

  /**
   * Record MVP for the given month. Finds top scorer and saves MonthlyRecord.
   */
  async recordMonthlyMvp(
    year: number,
    month: number,
  ): Promise<{ userId: string; points: number } | null> {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const events = await this.prisma.gamificationEvent.findMany({
      where: {
        createdAt: { gte: startOfMonth, lte: endOfMonth },
      },
      select: { userId: true, points: true, coins: true },
    });

    if (events.length === 0) return null;

    // Aggregate by user
    const userStats = new Map<string, { points: number; coins: number }>();
    for (const e of events) {
      const existing = userStats.get(e.userId) ?? { points: 0, coins: 0 };
      existing.points += e.points;
      existing.coins += Number(e.coins);
      userStats.set(e.userId, existing);
    }

    // Find top scorer
    let topUserId = '';
    let topPoints = 0;
    let topCoins = 0;
    for (const [userId, stats] of userStats) {
      if (stats.points > topPoints) {
        topUserId = userId;
        topPoints = stats.points;
        topCoins = stats.coins;
      }
    }

    if (!topUserId) return null;

    // Upsert monthly record for MVP
    await this.prisma.monthlyRecord.upsert({
      where: {
        userId_year_month: { userId: topUserId, year, month },
      },
      create: {
        userId: topUserId,
        points: topPoints,
        coins: topCoins,
        year,
        month,
        isMvp: true,
      },
      update: {
        points: topPoints,
        coins: topCoins,
        isMvp: true,
      },
    });

    this.logger.log(`Monthly MVP for ${year}-${month}: user ${topUserId} with ${topPoints} points`);

    return { userId: topUserId, points: topPoints };
  }

  /** Get recent milestone events for the public scoreboard feed */
  async getScoreboard(take: number) {
    return this.prisma.gamificationEvent.findMany({
      where: { eventType: { in: ['CONNECTED', 'SALE', 'CUSTOMER_SUCCESS'] } },
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        user: { select: { firstName: true, lastName: true, closedDealEmoji: true } },
        lead: { select: { customer: { select: { firstName: true, lastName: true } }, kw: true } },
      },
    });
  }

  /**
   * Shared leaderboard query logic
   */
  private async getLeaderboard(
    startDate: Date,
    endDate: Date,
  ): Promise<LeaderboardEntry[]> {
    const events = await this.prisma.gamificationEvent.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        userId: true,
        points: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });

    // Aggregate points by user
    const pointsMap = new Map<
      string,
      { firstName: string; lastName: string; totalPoints: number }
    >();

    for (const event of events) {
      const existing = pointsMap.get(event.userId);
      if (existing) {
        existing.totalPoints += event.points;
      } else {
        pointsMap.set(event.userId, {
          firstName: event.user.firstName,
          lastName: event.user.lastName,
          totalPoints: event.points,
        });
      }
    }

    return Array.from(pointsMap.entries())
      .map(([userId, data]) => ({
        userId,
        ...data,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints);
  }
}
