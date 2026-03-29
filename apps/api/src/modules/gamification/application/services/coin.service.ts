import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import {
  COIN_REPOSITORY,
  CoinRepositoryPort,
} from '../ports/coin.repository.port';

@Injectable()
export class CoinService {
  private readonly logger = new Logger(CoinService.name);

  constructor(
    @Inject(COIN_REPOSITORY)
    private readonly coinRepo: CoinRepositoryPort,
  ) {}

  /**
   * Add coins to a user's balance
   */
  async addCoins(
    userId: string,
    amount: number,
    reason: string,
    eventId?: string,
  ): Promise<void> {
    await this.coinRepo.create({
      userId,
      amount,
      reason,
      gamificationEventId: eventId ?? null,
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

    await this.coinRepo.create({
      userId,
      amount: -amount,
      reason,
    });

    this.logger.log(`Deducted ${amount} coins from user ${userId}: ${reason}`);
  }

  /**
   * Get total coin balance for a user
   */
  async getBalance(userId: string): Promise<number> {
    return this.coinRepo.aggregateBalance(userId);
  }

  /**
   * Get recent coin transactions for a user
   */
  async getHistory(userId: string, limit = 50) {
    return this.coinRepo.findByUser(userId, limit);
  }
}
