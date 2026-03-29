export const DASHBOARD_REPOSITORY = Symbol('DASHBOARD_REPOSITORY');

export interface LeadsByStageEntry {
  currentStage: string;
  _count: number;
}

export interface ScoreboardWonEntry {
  userId: string;
  _count: number;
}

export interface ScoreboardCommissionEntry {
  userId: string;
  totalAmount: number;
}

export interface ScoreboardUserName {
  id: string;
  firstName: string;
  lastName: string;
}

export interface DashboardRepositoryPort {
  countLeads(where: Record<string, unknown>): Promise<number>;
  aggregateCommission(where: Record<string, unknown>): Promise<number>;
  countActiveUsers(): Promise<number>;

  // ── Used by GetDashboardHandler ────────────────────────────────────────
  groupLeadsByStage(where: Record<string, unknown>): Promise<LeadsByStageEntry[]>;
  aggregatePendingCommission(where: Record<string, unknown>): Promise<number>;

  // ── Used by GetScoreboardHandler ───────────────────────────────────────
  groupWonDealsByUser(dateFilter: {
    gte: Date;
    lte: Date;
  }, limit: number): Promise<ScoreboardWonEntry[]>;

  groupCommissionsByUsers(userIds: string[], dateFilter: {
    gte: Date;
    lte: Date;
  }): Promise<ScoreboardCommissionEntry[]>;

  findUserNamesByIds(userIds: string[]): Promise<ScoreboardUserName[]>;
}
