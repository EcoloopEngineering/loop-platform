export const COIN_REPOSITORY = Symbol('COIN_REPOSITORY');

export interface CoinRepositoryPort {
  create(data: {
    userId: string;
    amount: number;
    reason: string;
    gamificationEventId?: string | null;
  }): Promise<any>;

  aggregateBalance(userId: string): Promise<number>;

  findByUser(userId: string, limit: number): Promise<any[]>;
}
