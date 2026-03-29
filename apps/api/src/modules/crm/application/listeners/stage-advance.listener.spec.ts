import { Test, TestingModule } from '@nestjs/testing';
import { StageAdvanceListener } from './stage-advance.listener';
import { StageAdvanceService } from '../services/stage-advance.service';

describe('StageAdvanceListener', () => {
  let listener: StageAdvanceListener;
  let service: { handleStageChange: jest.Mock };

  beforeEach(async () => {
    service = { handleStageChange: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StageAdvanceListener,
        { provide: StageAdvanceService, useValue: service },
      ],
    }).compile();

    listener = module.get(StageAdvanceListener);
  });

  it('delegates to StageAdvanceService', async () => {
    const payload = { leadId: 'lead-1', suggestedStage: 'ENGINEERING' };
    await listener.handleStageAdvance(payload);
    expect(service.handleStageChange).toHaveBeenCalledWith(payload);
  });

  it('catches and logs errors without rethrowing', async () => {
    service.handleStageChange.mockRejectedValue(new Error('DB error'));
    await expect(
      listener.handleStageAdvance({ leadId: 'lead-1' }),
    ).resolves.toBeUndefined();
  });
});
