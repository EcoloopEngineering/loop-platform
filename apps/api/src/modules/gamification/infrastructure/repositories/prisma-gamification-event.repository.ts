import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { GamificationEventRepositoryPort } from '../../application/ports/gamification-event.repository.port';

@Injectable()
export class PrismaGamificationEventRepository implements GamificationEventRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByDateRange(
    startDate: Date,
    endDate: Date,
    select?: Record<string, unknown>,
    include?: Record<string, unknown>,
  ): Promise<any[]> {
    const query: any = {
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      take: 10000,
    };

    if (select) query.select = select;
    if (include) query.include = include;

    return this.prisma.gamificationEvent.findMany(query);
  }

  async findScoreboardEvents(take: number): Promise<any[]> {
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

  async findReferrals(): Promise<any[]> {
    return this.prisma.referral.findMany({
      where: { status: 'accepted' },
      select: {
        inviterId: true,
        inviteeId: true,
      },
      take: 1000,
    });
  }

  async findUsersByIds(ids: string[]): Promise<any[]> {
    return this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, firstName: true, lastName: true },
    });
  }

  async upsertMonthlyRecord(data: {
    userId: string;
    year: number;
    month: number;
    points: number;
    coins: number;
    isMvp: boolean;
  }): Promise<any> {
    return this.prisma.monthlyRecord.upsert({
      where: {
        userId_year_month: { userId: data.userId, year: data.year, month: data.month },
      },
      create: {
        userId: data.userId,
        points: data.points,
        coins: data.coins,
        year: data.year,
        month: data.month,
        isMvp: data.isMvp,
      },
      update: {
        points: data.points,
        coins: data.coins,
        isMvp: data.isMvp,
      },
    });
  }
}
