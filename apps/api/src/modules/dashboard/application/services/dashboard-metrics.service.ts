import { Injectable, Inject } from '@nestjs/common';
import {
  DASHBOARD_REPOSITORY,
  DashboardRepositoryPort,
} from '../ports/dashboard.repository.port';
import { CacheService } from '../../../../infrastructure/cache/cache.service';

/** Dashboard metrics cache TTL: 60 seconds */
const METRICS_CACHE_TTL = 60_000;

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
    private readonly cache: CacheService,
  ) {}

  async getMetrics(startDate: string, endDate: string): Promise<DashboardMetrics> {
    const cacheKey = `dashboard:metrics:${startDate}:${endDate}`;
    const cached = this.cache.get<DashboardMetrics>(cacheKey);
    if (cached) return cached;

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

    const metrics: DashboardMetrics = {
      totalLeads,
      wonLeads,
      conversionRate: totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0,
      totalCommission,
      activeUsers,
    };

    this.cache.set(cacheKey, metrics, METRICS_CACHE_TTL);
    return metrics;
  }
}
