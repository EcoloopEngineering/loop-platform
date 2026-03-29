import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { CoinRepositoryPort } from '../../application/ports/coin.repository.port';

@Injectable()
export class PrismaCoinRepository implements CoinRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: string;
    amount: number;
    reason: string;
    gamificationEventId?: string | null;
  }): Promise<any> {
    return this.prisma.userCoin.create({
      data: {
        userId: data.userId,
        amount: data.amount,
        reason: data.reason,
        gamificationEventId: data.gamificationEventId ?? null,
      },
    });
  }

  async aggregateBalance(userId: string): Promise<number> {
    const result = await this.prisma.userCoin.aggregate({
      where: { userId },
      _sum: { amount: true },
    });
    return Number(result._sum?.amount ?? 0);
  }

  async findByUser(userId: string, limit: number): Promise<any[]> {
    return this.prisma.userCoin.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
