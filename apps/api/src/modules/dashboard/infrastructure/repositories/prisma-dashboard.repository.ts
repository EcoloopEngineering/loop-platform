import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { DashboardRepositoryPort } from '../../application/ports/dashboard.repository.port';

@Injectable()
export class PrismaDashboardRepository implements DashboardRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async countLeads(where: Record<string, unknown>): Promise<number> {
    return this.prisma.lead.count({ where: where as any });
  }

  async aggregateCommission(where: Record<string, unknown>): Promise<number> {
    const result = await this.prisma.commission.aggregate({
      where: where as any,
      _sum: { amount: true },
    });
    return Number(result._sum?.amount ?? 0);
  }

  async countActiveUsers(): Promise<number> {
    return this.prisma.user.count({ where: { isActive: true } });
  }
}
