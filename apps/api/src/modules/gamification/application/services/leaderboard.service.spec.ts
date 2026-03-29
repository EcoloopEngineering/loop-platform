import { Test, TestingModule } from '@nestjs/testing';
import { LeaderboardService } from './leaderboard.service';
import { GAMIFICATION_EVENT_REPOSITORY } from '../ports/gamification-event.repository.port';

describe('LeaderboardService', () => {
  let service: LeaderboardService;
  let mockRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockRepo = {
      findByDateRange: jest.fn(),
      findScoreboardEvents: jest.fn(),
      findReferrals: jest.fn(),
      findUsersByIds: jest.fn(),
      upsertMonthlyRecord: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaderboardService,
        { provide: GAMIFICATION_EVENT_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<LeaderboardService>(LeaderboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getWeeklyLeaderboard', () => {
    it('should return leaderboard sorted by points descending', async () => {
      mockRepo.findByDateRange.mockResolvedValue([
        {
          userId: 'user-1',
          points: 4,
          user: { firstName: 'Alice', lastName: 'Smith' },
        },
        {
          userId: 'user-2',
          points: 8,
          user: { firstName: 'Bob', lastName: 'Jones' },
        },
        {
          userId: 'user-1',
          points: 2,
          user: { firstName: 'Alice', lastName: 'Smith' },
        },
      ]);

      const result = await service.getWeeklyLeaderboard();

      expect(result).toEqual([
        { userId: 'user-2', firstName: 'Bob', lastName: 'Jones', totalPoints: 8 },
        { userId: 'user-1', firstName: 'Alice', lastName: 'Smith', totalPoints: 6 },
      ]);
    });

    it('should return empty array when no events exist', async () => {
      mockRepo.findByDateRange.mockResolvedValue([]);

      const result = await service.getWeeklyLeaderboard();

      expect(result).toEqual([]);
    });
  });

  describe('getMonthlyLeaderboard', () => {
    it('should return leaderboard for the current month', async () => {
      mockRepo.findByDateRange.mockResolvedValue([
        {
          userId: 'user-1',
          points: 10,
          user: { firstName: 'Alice', lastName: 'Smith' },
        },
      ]);

      const result = await service.getMonthlyLeaderboard();

      expect(result).toHaveLength(1);
      expect(result[0].totalPoints).toBe(10);
    });
  });

  describe('getTeamLeaderboard', () => {
    it('should aggregate points by team lead', async () => {
      mockRepo.findByDateRange.mockResolvedValue([
        { userId: 'user-2', points: 4 },
        { userId: 'user-3', points: 6 },
      ]);

      mockRepo.findReferrals.mockResolvedValue([
        { inviterId: 'user-1', inviteeId: 'user-2' },
        { inviterId: 'user-1', inviteeId: 'user-3' },
      ]);

      mockRepo.findUsersByIds.mockResolvedValue([
        { id: 'user-1', firstName: 'Lead', lastName: 'Person' },
      ]);

      const result = await service.getTeamLeaderboard();

      expect(result).toHaveLength(1);
      expect(result[0].inviterId).toBe('user-1');
      expect(result[0].teamPoints).toBe(10);
    });

    it('should return empty array when no events exist', async () => {
      mockRepo.findByDateRange.mockResolvedValue([]);
      mockRepo.findReferrals.mockResolvedValue([]);

      const result = await service.getTeamLeaderboard();

      expect(result).toEqual([]);
    });
  });

  describe('recordMonthlyMvp', () => {
    it('should find top scorer and save as MVP', async () => {
      mockRepo.findByDateRange.mockResolvedValue([
        { userId: 'user-1', points: 10, coins: 20 },
        { userId: 'user-2', points: 4, coins: 8 },
        { userId: 'user-1', points: 6, coins: 12 },
      ]);

      mockRepo.upsertMonthlyRecord.mockResolvedValue({
        id: 'record-1',
        userId: 'user-1',
        points: 16,
        coins: 32,
        year: 2026,
        month: 3,
        isMvp: true,
      });

      const result = await service.recordMonthlyMvp(2026, 3);

      expect(result).toEqual({ userId: 'user-1', points: 16 });
      expect(mockRepo.upsertMonthlyRecord).toHaveBeenCalledWith({
        userId: 'user-1',
        year: 2026,
        month: 3,
        points: 16,
        coins: 32,
        isMvp: true,
      });
    });

    it('should return null when no events exist', async () => {
      mockRepo.findByDateRange.mockResolvedValue([]);

      const result = await service.recordMonthlyMvp(2026, 3);

      expect(result).toBeNull();
      expect(mockRepo.upsertMonthlyRecord).not.toHaveBeenCalled();
    });
  });
});
