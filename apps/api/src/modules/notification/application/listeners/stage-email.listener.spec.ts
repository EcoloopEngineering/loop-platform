import { Test, TestingModule } from '@nestjs/testing';
import { StageEmailListener } from './stage-email.listener';
import { StageEmailService } from '../services/stage-email.service';

describe('StageEmailListener', () => {
  let listener: StageEmailListener;
  let service: { handleStageChanged: jest.Mock };

  beforeEach(async () => {
    service = { handleStageChanged: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StageEmailListener,
        { provide: StageEmailService, useValue: service },
      ],
    }).compile();

    listener = module.get(StageEmailListener);
  });

  it('delegates to StageEmailService', async () => {
    const payload = {
      leadId: 'lead-1',
      customerName: 'John',
      previousStage: 'NEW_LEAD',
      newStage: 'WON',
    };

    await listener.handleStageChanged(payload);

    expect(service.handleStageChanged).toHaveBeenCalledWith(payload);
  });

  it('catches and logs errors without rethrowing', async () => {
    service.handleStageChanged.mockRejectedValue(new Error('Queue error'));

    await expect(
      listener.handleStageChanged({
        leadId: 'lead-1',
        customerName: 'John',
        previousStage: 'NEW_LEAD',
        newStage: 'WON',
      }),
    ).resolves.toBeUndefined();
  });
});
