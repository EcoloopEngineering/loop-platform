import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  GAMIFICATION_EVENT_REPOSITORY,
  GamificationEventRepositoryPort,
} from '../ports/gamification-event.repository.port';
import { CacheService } from '../../../../infrastructure/cache/cache.service';

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

/** Leaderboard cache TTL: 120 seconds */
const LEADERBOARD_CACHE_TTL = 120_000;

export interface LeaderboardEntry {
  userId: string;
  firstName: string;
  lastName: string;
  totalPoints: number;
}

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(
    @Inject(GAMIFICATION_EVENT_REPOSITORY)
    private readonly eventRepo: GamificationEventRepositoryPort,
    private readonly cache: CacheService,
  ) {}

  /**
   * Get leaderboard for the current week (Monday to Sunday)
   */
  async getWeeklyLeaderboard(): Promise<LeaderboardEntry[]> {
    const cacheKey = 'leaderboard:weekly';
    const cached = this.cache.get<LeaderboardEntry[]>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() + mondayOffset);
    startOfWeek.setHours(0, 0, 0, 0);

    const result = await this.getLeaderboard(startOfWeek, now);
    this.cache.set(cacheKey, result, LEADERBOARD_CACHE_TTL);
    return result;
  }

  /**
   * Get leaderboard for the current month
   */
  async getMonthlyLeaderboard(): Promise<LeaderboardEntry[]> {
    const cacheKey = 'leaderboard:monthly';
    const cached = this.cache.get<LeaderboardEntry[]>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const result = await this.getLeaderboard(startOfMonth, now);
    this.cache.set(cacheKey, result, LEADERBOARD_CACHE_TTL);
    return result;
  }

  /**
   * Aggregate leaderboard by user's team (if teams/referral hierarchy exist)
   */
  async getTeamLeaderboard(): Promise<
    { inviterId: string; firstName: string; lastName: string; teamPoints: number }[]
  > {
    const cacheKey = 'leaderboard:team';
    const cached = this.cache.get<
      { inviterId: string; firstName: string; lastName: string; teamPoints: number }[]
    >(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const events = await this.eventRepo.findByDateRange(
      startOfMonth,
      now,
      { userId: true, points: true },
    );

    // Get referral relationships to map users to their inviter (team lead)
    const referrals = await this.eventRepo.findReferrals();

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

    const users = await this.eventRepo.findUsersByIds(teamLeadIds);

    const userMap = new Map(users.map((u) => [u.id, u]));

    const result = teamLeadIds
      .map((id) => ({
        inviterId: id,
        firstName: userMap.get(id)?.firstName ?? '',
        lastName: userMap.get(id)?.lastName ?? '',
        teamPoints: teamPoints.get(id) ?? 0,
      }))
      .sort((a, b) => b.teamPoints - a.teamPoints);

    this.cache.set(cacheKey, result, LEADERBOARD_CACHE_TTL);
    return result;
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

    const events = await this.eventRepo.findByDateRange(
      startOfMonth,
      endOfMonth,
      { userId: true, points: true, coins: true },
    );

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
    await this.eventRepo.upsertMonthlyRecord({
      userId: topUserId,
      year,
      month,
      points: topPoints,
      coins: topCoins,
      isMvp: true,
    });

    this.logger.log(`Monthly MVP for ${year}-${month}: user ${topUserId} with ${topPoints} points`);

    return { userId: topUserId, points: topPoints };
  }

  /** Get recent milestone events for the public scoreboard feed */
  async getScoreboard(take: number) {
    return this.eventRepo.findScoreboardEvents(take);
  }

  /**
   * Shared leaderboard query logic
   */
  private async getLeaderboard(
    startDate: Date,
    endDate: Date,
  ): Promise<LeaderboardEntry[]> {
    const events = await this.eventRepo.findByDateRange(
      startDate,
      endDate,
      {
        userId: true,
        points: true,
        user: { select: { firstName: true, lastName: true } },
      },
    );

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
