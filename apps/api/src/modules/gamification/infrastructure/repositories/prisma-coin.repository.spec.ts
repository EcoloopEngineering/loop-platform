import { Test, TestingModule } from '@nestjs/testing';
import { PrismaCoinRepository } from './prisma-coin.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('PrismaCoinRepository', () => {
  let repository: PrismaCoinRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaCoinRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<PrismaCoinRepository>(PrismaCoinRepository);
  });

  describe('create', () => {
    it('should create a coin entry', async () => {
      const data = { userId: 'u1', amount: 10, reason: 'SALE', gamificationEventId: 'ev-1' };
      prisma.userCoin.create.mockResolvedValue({ id: 'coin-1', ...data });

      const result = await repository.create(data);

      expect(result).toEqual(expect.objectContaining({ id: 'coin-1' }));
      expect(prisma.userCoin.create).toHaveBeenCalledWith({
        data: {
          userId: 'u1',
          amount: 10,
          reason: 'SALE',
          gamificationEventId: 'ev-1',
        },
      });
    });

    it('should handle null gamificationEventId', async () => {
      const data = { userId: 'u1', amount: 5, reason: 'BONUS' };
      prisma.userCoin.create.mockResolvedValue({ id: 'coin-2', ...data });

      await repository.create(data);

      expect(prisma.userCoin.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ gamificationEventId: null }),
      });
    });
  });

  describe('aggregateBalance', () => {
    it('should return aggregated balance', async () => {
      prisma.userCoin.aggregate.mockResolvedValue({ _sum: { amount: 150 } });

      const result = await repository.aggregateBalance('u1');

      expect(result).toBe(150);
      expect(prisma.userCoin.aggregate).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        _sum: { amount: true },
      });
    });

    it('should return 0 when no coins exist', async () => {
      prisma.userCoin.aggregate.mockResolvedValue({ _sum: { amount: null } });

      const result = await repository.aggregateBalance('u1');

      expect(result).toBe(0);
    });
  });

  describe('findByUser', () => {
    it('should return coin entries for user', async () => {
      const coins = [{ id: 'c1', amount: 10 }, { id: 'c2', amount: 5 }];
      prisma.userCoin.findMany.mockResolvedValue(coins);

      const result = await repository.findByUser('u1', 50);

      expect(result).toEqual(coins);
      expect(prisma.userCoin.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });
  });
});
