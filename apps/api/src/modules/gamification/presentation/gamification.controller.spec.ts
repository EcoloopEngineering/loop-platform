import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Test, TestingModule } from '@nestjs/testing';
import { GamificationController } from './gamification.controller';
import { CoinService } from '../application/services/coin.service';
import { LeaderboardService } from '../application/services/leaderboard.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../../test/prisma-mock.helper';

describe('GamificationController', () => {
  let controller: GamificationController;
  let prisma: MockPrismaService;
  let coinService: {
    getBalance: jest.Mock;
    getHistory: jest.Mock;
  };
  let leaderboardService: {
    getWeeklyLeaderboard: jest.Mock;
    getMonthlyLeaderboard: jest.Mock;
    getScoreboard: jest.Mock;
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    coinService = {
      getBalance: jest.fn(),
      getHistory: jest.fn(),
    };
    leaderboardService = {
      getWeeklyLeaderboard: jest.fn(),
      getMonthlyLeaderboard: jest.fn(),
      getScoreboard: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GamificationController],
      providers: [
        { provide: CoinService, useValue: coinService },
        { provide: LeaderboardService, useValue: leaderboardService },
        { provide: PrismaService, useValue: prisma },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<GamificationController>(GamificationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getBalance', () => {
    it('should return current user coin balance', async () => {
      coinService.getBalance.mockResolvedValue(42);

      const result = await controller.getBalance({ id: 'user-1', email: 'user@ecoloop.us', firstName: 'Test', lastName: 'User', phone: null, role: 'SALES_REP' as any, isActive: true, profileImage: null });

      expect(result).toEqual({ balance: 42 });
      expect(coinService.getBalance).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getLeaderboard', () => {
    it('should return weekly leaderboard by default', async () => {
      const mockBoard = [
        { userId: 'u1', firstName: 'A', lastName: 'B', totalPoints: 10 },
      ];
      leaderboardService.getWeeklyLeaderboard.mockResolvedValue(mockBoard);

      const result = await controller.getLeaderboard();

      expect(result).toEqual(mockBoard);
      expect(leaderboardService.getWeeklyLeaderboard).toHaveBeenCalled();
    });

    it('should return monthly leaderboard when period=monthly', async () => {
      const mockBoard = [
        { userId: 'u1', firstName: 'A', lastName: 'B', totalPoints: 30 },
      ];
      leaderboardService.getMonthlyLeaderboard.mockResolvedValue(mockBoard);

      const result = await controller.getLeaderboard('monthly');

      expect(result).toEqual(mockBoard);
      expect(leaderboardService.getMonthlyLeaderboard).toHaveBeenCalled();
    });
  });

  describe('getHistory', () => {
    it('should return coin transaction history', async () => {
      const mockHistory = [
        { id: 'c1', amount: 10, reason: 'SALE' },
      ];
      coinService.getHistory.mockResolvedValue(mockHistory);

      const result = await controller.getHistory({ id: 'user-1', email: 'user@ecoloop.us', firstName: 'Test', lastName: 'User', phone: null, role: 'SALES_REP' as any, isActive: true, profileImage: null }, '20');

      expect(result).toEqual(mockHistory);
      expect(coinService.getHistory).toHaveBeenCalledWith('user-1', 20);
    });

    it('should use default limit when not provided', async () => {
      coinService.getHistory.mockResolvedValue([]);

      await controller.getHistory({ id: 'user-1', email: 'user@ecoloop.us', firstName: 'Test', lastName: 'User', phone: null, role: 'SALES_REP' as any, isActive: true, profileImage: null });

      expect(coinService.getHistory).toHaveBeenCalledWith('user-1', 50);
    });
  });

  describe('getScoreboard', () => {
    it('should return recent milestone events', async () => {
      const mockEvents = [
        {
          id: 'e1',
          eventType: 'SALE',
          points: 4,
          user: { firstName: 'John', lastName: 'Doe', closedDealEmoji: '🎉' },
          lead: { customer: { firstName: 'Jane', lastName: 'Client' }, kw: 8 },
        },
      ];
      leaderboardService.getScoreboard.mockResolvedValue(mockEvents);

      const result = await controller.getScoreboard('10');

      expect(result).toEqual(mockEvents);
      expect(leaderboardService.getScoreboard).toHaveBeenCalledWith(10);
    });
  });
});
