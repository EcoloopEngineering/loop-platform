export const GAMIFICATION_EVENT_REPOSITORY = Symbol('GAMIFICATION_EVENT_REPOSITORY');

export interface GamificationEventRepositoryPort {
  findByDateRange(
    startDate: Date,
    endDate: Date,
    select?: Record<string, unknown>,
    include?: Record<string, unknown>,
  ): Promise<any[]>;

  findScoreboardEvents(take: number): Promise<any[]>;

  findReferrals(): Promise<any[]>;

  findUsersByIds(ids: string[]): Promise<any[]>;

  upsertMonthlyRecord(data: {
    userId: string;
    year: number;
    month: number;
    points: number;
    coins: number;
    isMvp: boolean;
  }): Promise<any>;
}
