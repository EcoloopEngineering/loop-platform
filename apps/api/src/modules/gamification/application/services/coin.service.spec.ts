import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CoinService } from './coin.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../../../test/prisma-mock.helper';

describe('CoinService', () => {
  let service: CoinService;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoinService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CoinService>(CoinService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addCoins', () => {
    it('should create a positive coin record', async () => {
      prisma.userCoin.create.mockResolvedValue({
        id: 'coin-1',
        userId: 'user-1',
        amount: 10,
        reason: 'SALE reward',
        gamificationEventId: 'event-1',
      });

      await service.addCoins('user-1', 10, 'SALE reward', 'event-1');

      expect(prisma.userCoin.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          amount: 10,
          reason: 'SALE reward',
          gamificationEventId: 'event-1',
        },
      });
    });

    it('should create a coin record without eventId', async () => {
      prisma.userCoin.create.mockResolvedValue({
        id: 'coin-2',
        userId: 'user-1',
        amount: 5,
        reason: 'Bonus',
        gamificationEventId: null,
      });

      await service.addCoins('user-1', 5, 'Bonus');

      expect(prisma.userCoin.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          amount: 5,
          reason: 'Bonus',
          gamificationEventId: null,
        },
      });
    });
  });

  describe('deductCoins', () => {
    it('should create a negative coin record when balance is sufficient', async () => {
      prisma.userCoin.aggregate.mockResolvedValue({
        _sum: { amount: 20 },
      });
      prisma.userCoin.create.mockResolvedValue({
        id: 'coin-3',
        userId: 'user-1',
        amount: -10,
        reason: 'Reward order',
      });

      await service.deductCoins('user-1', 10, 'Reward order');

      expect(prisma.userCoin.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          amount: -10,
          reason: 'Reward order',
        },
      });
    });

    it('should throw BadRequestException when balance is insufficient', async () => {
      prisma.userCoin.aggregate.mockResolvedValue({
        _sum: { amount: 5 },
      });

      await expect(
        service.deductCoins('user-1', 10, 'Reward order'),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.userCoin.create).not.toHaveBeenCalled();
    });
  });

  describe('getBalance', () => {
    it('should return the sum of all coin amounts', async () => {
      prisma.userCoin.aggregate.mockResolvedValue({
        _sum: { amount: 42.5 },
      });

      const balance = await service.getBalance('user-1');

      expect(balance).toBe(42.5);
      expect(prisma.userCoin.aggregate).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        _sum: { amount: true },
      });
    });

    it('should return 0 when no coins exist', async () => {
      prisma.userCoin.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      const balance = await service.getBalance('user-1');

      expect(balance).toBe(0);
    });
  });

  describe('getHistory', () => {
    it('should return recent coin transactions', async () => {
      const mockHistory = [
        { id: 'coin-1', amount: 10, reason: 'SALE', createdAt: new Date() },
        { id: 'coin-2', amount: -5, reason: 'Order', createdAt: new Date() },
      ];
      prisma.userCoin.findMany.mockResolvedValue(mockHistory);

      const result = await service.getHistory('user-1', 10);

      expect(result).toEqual(mockHistory);
      expect(prisma.userCoin.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    });

    it('should use default limit of 50', async () => {
      prisma.userCoin.findMany.mockResolvedValue([]);

      await service.getHistory('user-1');

      expect(prisma.userCoin.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });
  });
});
