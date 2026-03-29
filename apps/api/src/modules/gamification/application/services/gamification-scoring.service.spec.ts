import { Test } from '@nestjs/testing';
import { GamificationScoringService } from './gamification-scoring.service';
import { CoinService } from './coin.service';
import { GAMIFICATION_EVENT_REPOSITORY } from '../ports/gamification-event.repository.port';

describe('GamificationScoringService', () => {
  let service: GamificationScoringService;
  let eventRepo: {
    create: jest.Mock;
    findByUniqueKey: jest.Mock;
    findLeadWithPrimaryAssignment: jest.Mock;
  };
  let coinService: { addCoins: jest.Mock };

  beforeEach(async () => {
    eventRepo = {
      create: jest.fn(),
      findByUniqueKey: jest.fn(),
      findLeadWithPrimaryAssignment: jest.fn(),
    };
    coinService = { addCoins: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        GamificationScoringService,
        { provide: GAMIFICATION_EVENT_REPOSITORY, useValue: eventRepo },
        { provide: CoinService, useValue: coinService },
      ],
    }).compile();

    service = module.get(GamificationScoringService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const mockLead = {
    id: 'lead-1',
    kw: 8.5,
    assignments: [
      {
        user: {
          id: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
          closedDealEmoji: null,
        },
      },
    ],
  };

  describe('processStageChange', () => {
    it('should create gamification event for WON stage with coins', async () => {
      eventRepo.findLeadWithPrimaryAssignment.mockResolvedValue(mockLead);
      eventRepo.findByUniqueKey.mockResolvedValue(null);
      eventRepo.create.mockResolvedValue({ id: 'event-1' });

      await service.processStageChange({
        leadId: 'lead-1',
        customerName: 'Test Customer',
        previousStage: 'CONNECTED',
        newStage: 'WON',
      });

      expect(eventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          eventType: 'SALE',
          points: 4,
          coins: 17, // 2 * 8.5
        }),
      );

      expect(coinService.addCoins).toHaveBeenCalledWith(
        'user-1',
        17,
        expect.stringContaining('SALE'),
        'event-1',
      );
    });

    it('should skip non-milestone stages', async () => {
      await service.processStageChange({
        leadId: 'lead-1',
        customerName: 'Test',
        previousStage: 'NEW_LEAD',
        newStage: 'REQUEST_DESIGN',
      });

      expect(eventRepo.findLeadWithPrimaryAssignment).not.toHaveBeenCalled();
    });

    it('should skip if lead not found', async () => {
      eventRepo.findLeadWithPrimaryAssignment.mockResolvedValue(null);

      await service.processStageChange({
        leadId: 'lead-1',
        customerName: 'Test',
        previousStage: 'CONNECTED',
        newStage: 'WON',
      });

      expect(eventRepo.create).not.toHaveBeenCalled();
    });

    it('should skip if no primary assignment', async () => {
      eventRepo.findLeadWithPrimaryAssignment.mockResolvedValue({ ...mockLead, assignments: [] });

      await service.processStageChange({
        leadId: 'lead-1',
        customerName: 'Test',
        previousStage: 'CONNECTED',
        newStage: 'WON',
      });

      expect(eventRepo.create).not.toHaveBeenCalled();
    });

    it('should skip duplicate events', async () => {
      eventRepo.findLeadWithPrimaryAssignment.mockResolvedValue(mockLead);
      eventRepo.findByUniqueKey.mockResolvedValue({ id: 'existing' });

      await service.processStageChange({
        leadId: 'lead-1',
        customerName: 'Test',
        previousStage: 'CONNECTED',
        newStage: 'WON',
      });

      expect(eventRepo.create).not.toHaveBeenCalled();
    });

    it('should not award coins for CONNECTED stage', async () => {
      eventRepo.findLeadWithPrimaryAssignment.mockResolvedValue(mockLead);
      eventRepo.findByUniqueKey.mockResolvedValue(null);
      eventRepo.create.mockResolvedValue({ id: 'event-1' });

      await service.processStageChange({
        leadId: 'lead-1',
        customerName: 'Test',
        previousStage: 'DESIGN_READY',
        newStage: 'CONNECTED',
      });

      expect(eventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'CONNECTED',
          points: 2,
          coins: 0,
        }),
      );
      expect(coinService.addCoins).not.toHaveBeenCalled();
    });
  });

  describe('calculateCoins', () => {
    it('should return 2 * kw for WON', () => {
      expect(service.calculateCoins('WON', 8.5)).toBe(17);
    });

    it('should return 5 * kw for CUSTOMER_SUCCESS', () => {
      expect(service.calculateCoins('CUSTOMER_SUCCESS', 8.5)).toBe(42.5);
    });

    it('should return 0 for non-coin stages', () => {
      expect(service.calculateCoins('CONNECTED', 8.5)).toBe(0);
    });
  });

  describe('isDuplicate', () => {
    it('should return true when event exists', async () => {
      eventRepo.findByUniqueKey.mockResolvedValue({ id: 'existing' });
      expect(await service.isDuplicate('user-1', 'SALE')).toBe(true);
    });

    it('should return false when no existing event', async () => {
      eventRepo.findByUniqueKey.mockResolvedValue(null);
      expect(await service.isDuplicate('user-1', 'SALE')).toBe(false);
    });
  });
});
