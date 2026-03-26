import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

@Injectable()
export class CoinService {
  private readonly logger = new Logger(CoinService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Add coins to a user's balance
   */
  async addCoins(
    userId: string,
    amount: number,
    reason: string,
    eventId?: string,
  ): Promise<void> {
    await this.prisma.userCoin.create({
      data: {
        userId,
        amount,
        reason,
        gamificationEventId: eventId ?? null,
      },
    });

    this.logger.log(`Added ${amount} coins to user ${userId}: ${reason}`);
  }

  /**
   * Deduct coins from a user's balance. Throws if insufficient balance.
   */
  async deductCoins(
    userId: string,
    amount: number,
    reason: string,
  ): Promise<void> {
    const balance = await this.getBalance(userId);

    if (balance < amount) {
      throw new BadRequestException(
        `Insufficient coin balance. Current: ${balance}, required: ${amount}`,
      );
    }

    await this.prisma.userCoin.create({
      data: {
        userId,
        amount: -amount,
        reason,
      },
    });

    this.logger.log(`Deducted ${amount} coins from user ${userId}: ${reason}`);
  }

  /**
   * Get total coin balance for a user
   */
  async getBalance(userId: string): Promise<number> {
    const result = await this.prisma.userCoin.aggregate({
      where: { userId },
      _sum: { amount: true },
    });

    return Number(result._sum?.amount ?? 0);
  }

  /**
   * Get recent coin transactions for a user
   */
  async getHistory(userId: string, limit = 50) {
    return this.prisma.userCoin.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
