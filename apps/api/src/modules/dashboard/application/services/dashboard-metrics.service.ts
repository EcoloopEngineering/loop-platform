import { Injectable, Inject } from '@nestjs/common';
import {
  DASHBOARD_REPOSITORY,
  DashboardRepositoryPort,
} from '../ports/dashboard.repository.port';

export interface DashboardMetrics {
  totalLeads: number;
  wonLeads: number;
  conversionRate: number;
  totalCommission: number;
  activeUsers: number;
}

@Injectable()
export class DashboardMetricsService {
  constructor(
    @Inject(DASHBOARD_REPOSITORY)
    private readonly dashboardRepo: DashboardRepositoryPort,
  ) {}

  async getMetrics(startDate: string, endDate: string): Promise<DashboardMetrics> {
    const dateFilter = {
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };

    const [totalLeads, wonLeads, totalCommission, activeUsers] =
      await Promise.all([
        this.dashboardRepo.countLeads(dateFilter),
        this.dashboardRepo.countLeads({ currentStage: 'WON', ...dateFilter }),
        this.dashboardRepo.aggregateCommission({ status: 'ACTIVE', ...dateFilter }),
        this.dashboardRepo.countActiveUsers(),
      ]);

    return {
      totalLeads,
      wonLeads,
      conversionRate: totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0,
      totalCommission,
      activeUsers,
    };
  }
}
