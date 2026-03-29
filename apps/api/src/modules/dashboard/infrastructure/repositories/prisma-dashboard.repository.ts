import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  DashboardRepositoryPort,
  LeadsByStageEntry,
  ScoreboardWonEntry,
  ScoreboardCommissionEntry,
  ScoreboardUserName,
} from '../../application/ports/dashboard.repository.port';

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

  // ── Used by GetDashboardHandler ──────────────────────────────────────

  async groupLeadsByStage(where: Record<string, unknown>): Promise<LeadsByStageEntry[]> {
    const groups = await this.prisma.lead.groupBy({
      by: ['currentStage'],
      where: where as any,
      _count: true,
    });
    return groups.map((g) => ({ currentStage: g.currentStage, _count: g._count }));
  }

  async aggregatePendingCommission(where: Record<string, unknown>): Promise<number> {
    const result = await this.prisma.commission.aggregate({
      where: where as any,
      _sum: { amount: true },
    });
    return Number(result._sum?.amount ?? 0);
  }

  // ── Used by GetScoreboardHandler ─────────────────────────────────────

  async groupWonDealsByUser(
    dateFilter: { gte: Date; lte: Date },
    limit: number,
  ): Promise<ScoreboardWonEntry[]> {
    const groups = await this.prisma.leadAssignment.groupBy({
      by: ['userId'],
      where: {
        lead: {
          currentStage: 'WON',
          createdAt: dateFilter,
        },
      },
      _count: true,
      orderBy: { _count: { userId: 'desc' } },
      take: limit,
    });
    return groups.map((g) => ({ userId: g.userId, _count: g._count }));
  }

  async groupCommissionsByUsers(
    userIds: string[],
    dateFilter: { gte: Date; lte: Date },
  ): Promise<ScoreboardCommissionEntry[]> {
    const groups = await this.prisma.commission.groupBy({
      by: ['userId'],
      where: {
        userId: { in: userIds },
        status: 'ACTIVE',
        createdAt: dateFilter,
      },
      _sum: { amount: true },
    });
    return groups.map((g) => ({
      userId: g.userId,
      totalAmount: Number(g._sum?.amount ?? 0),
    }));
  }

  async findUserNamesByIds(userIds: string[]): Promise<ScoreboardUserName[]> {
    return this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true },
    });
  }
}
