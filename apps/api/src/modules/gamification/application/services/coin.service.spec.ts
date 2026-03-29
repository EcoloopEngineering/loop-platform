import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CoinService } from './coin.service';
import { COIN_REPOSITORY } from '../ports/coin.repository.port';

describe('CoinService', () => {
  let service: CoinService;
  let mockRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockRepo = {
      create: jest.fn(),
      aggregateBalance: jest.fn(),
      findByUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoinService,
        { provide: COIN_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<CoinService>(CoinService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addCoins', () => {
    it('should create a positive coin record', async () => {
      mockRepo.create.mockResolvedValue({
        id: 'coin-1',
        userId: 'user-1',
        amount: 10,
        reason: 'SALE reward',
        gamificationEventId: 'event-1',
      });

      await service.addCoins('user-1', 10, 'SALE reward', 'event-1');

      expect(mockRepo.create).toHaveBeenCalledWith({
        userId: 'user-1',
        amount: 10,
        reason: 'SALE reward',
        gamificationEventId: 'event-1',
      });
    });

    it('should create a coin record without eventId', async () => {
      mockRepo.create.mockResolvedValue({
        id: 'coin-2',
        userId: 'user-1',
        amount: 5,
        reason: 'Bonus',
        gamificationEventId: null,
      });

      await service.addCoins('user-1', 5, 'Bonus');

      expect(mockRepo.create).toHaveBeenCalledWith({
        userId: 'user-1',
        amount: 5,
        reason: 'Bonus',
        gamificationEventId: null,
      });
    });
  });

  describe('deductCoins', () => {
    it('should create a negative coin record when balance is sufficient', async () => {
      mockRepo.aggregateBalance.mockResolvedValue(20);
      mockRepo.create.mockResolvedValue({
        id: 'coin-3',
        userId: 'user-1',
        amount: -10,
        reason: 'Reward order',
      });

      await service.deductCoins('user-1', 10, 'Reward order');

      expect(mockRepo.create).toHaveBeenCalledWith({
        userId: 'user-1',
        amount: -10,
        reason: 'Reward order',
      });
    });

    it('should throw BadRequestException when balance is insufficient', async () => {
      mockRepo.aggregateBalance.mockResolvedValue(5);

      await expect(
        service.deductCoins('user-1', 10, 'Reward order'),
      ).rejects.toThrow(BadRequestException);

      expect(mockRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('getBalance', () => {
    it('should return the sum of all coin amounts', async () => {
      mockRepo.aggregateBalance.mockResolvedValue(42.5);

      const balance = await service.getBalance('user-1');

      expect(balance).toBe(42.5);
      expect(mockRepo.aggregateBalance).toHaveBeenCalledWith('user-1');
    });

    it('should return 0 when no coins exist', async () => {
      mockRepo.aggregateBalance.mockResolvedValue(0);

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
      mockRepo.findByUser.mockResolvedValue(mockHistory);

      const result = await service.getHistory('user-1', 10);

      expect(result).toEqual(mockHistory);
      expect(mockRepo.findByUser).toHaveBeenCalledWith('user-1', 10);
    });

    it('should use default limit of 50', async () => {
      mockRepo.findByUser.mockResolvedValue([]);

      await service.getHistory('user-1');

      expect(mockRepo.findByUser).toHaveBeenCalledWith('user-1', 50);
    });
  });
});
