import { Test, TestingModule } from '@nestjs/testing';
import { GamificationEventListener } from './gamification-event.listener';
import { GamificationScoringService } from '../services/gamification-scoring.service';

describe('GamificationEventListener', () => {
  let listener: GamificationEventListener;
  let scoringService: { processStageChange: jest.Mock };

  beforeEach(async () => {
    scoringService = { processStageChange: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamificationEventListener,
        { provide: GamificationScoringService, useValue: scoringService },
      ],
    }).compile();

    listener = module.get<GamificationEventListener>(GamificationEventListener);
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
  });

  it('should delegate to GamificationScoringService', async () => {
    const payload = {
      leadId: 'lead-1',
      customerName: 'Test Customer',
      previousStage: 'CONNECTED',
      newStage: 'WON',
    };

    await listener.handleStageChanged(payload);

    expect(scoringService.processStageChange).toHaveBeenCalledWith(payload);
  });

  it('should catch and log errors without throwing', async () => {
    scoringService.processStageChange.mockRejectedValue(new Error('DB error'));

    await expect(
      listener.handleStageChanged({
        leadId: 'lead-1',
        customerName: 'Test',
        previousStage: 'NEW_LEAD',
        newStage: 'WON',
      }),
    ).resolves.toBeUndefined();
  });
});
