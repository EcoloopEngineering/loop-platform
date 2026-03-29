import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

export interface DashboardMetrics {
  totalLeads: number;
  wonLeads: number;
  conversionRate: number;
  totalCommission: number;
  activeUsers: number;
}

@Injectable()
export class DashboardMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(startDate: string, endDate: string): Promise<DashboardMetrics> {
    const dateFilter = {
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };

    const [totalLeads, wonLeads, totalCommission, activeUsers] =
      await Promise.all([
        this.prisma.lead.count({ where: dateFilter }),
        this.prisma.lead.count({ where: { currentStage: 'WON', ...dateFilter } }),
        this.prisma.commission.aggregate({
          where: { status: 'ACTIVE', ...dateFilter },
          _sum: { amount: true },
        }),
        this.prisma.user.count({ where: { isActive: true } }),
      ]);

    return {
      totalLeads,
      wonLeads,
      conversionRate: totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0,
      totalCommission: Number(totalCommission._sum?.amount ?? 0),
      activeUsers,
    };
  }
}
