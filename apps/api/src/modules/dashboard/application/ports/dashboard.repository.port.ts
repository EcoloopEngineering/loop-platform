export const DASHBOARD_REPOSITORY = Symbol('DASHBOARD_REPOSITORY');

export interface DashboardRepositoryPort {
  countLeads(where: Record<string, unknown>): Promise<number>;
  aggregateCommission(where: Record<string, unknown>): Promise<number>;
  countActiveUsers(): Promise<number>;
}
