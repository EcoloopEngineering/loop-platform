import { Test, TestingModule } from '@nestjs/testing';
import { LeadTransitionListener } from './lead-transition.listener';
import { PipelineTransitionService } from '../services/pipeline-transition.service';

describe('LeadTransitionListener', () => {
  let listener: LeadTransitionListener;
  let transitionService: { handleTransition: jest.Mock };

  beforeEach(async () => {
    transitionService = { handleTransition: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadTransitionListener,
        { provide: PipelineTransitionService, useValue: transitionService },
      ],
    }).compile();

    listener = module.get(LeadTransitionListener);
  });

  it('should delegate to PipelineTransitionService', async () => {
    const payload = {
      leadId: 'lead-1',
      customerName: 'John Doe',
      previousStage: 'DESIGN_READY',
      newStage: 'WON',
    };

    await listener.handleStageChanged(payload);

    expect(transitionService.handleTransition).toHaveBeenCalledWith(payload);
  });

  it('should catch and log errors without throwing', async () => {
    transitionService.handleTransition.mockRejectedValue(new Error('DB error'));

    await expect(
      listener.handleStageChanged({
        leadId: 'lead-1',
        customerName: 'Test',
        previousStage: 'DESIGN_READY',
        newStage: 'WON',
      }),
    ).resolves.toBeUndefined();
  });

  it('should pass through all payload fields', async () => {
    const payload = {
      leadId: 'lead-1',
      customerName: 'Jane Doe',
      previousStage: 'FINAL_SUBMISSION',
      newStage: 'CUSTOMER_SUCCESS',
      depth: 2,
    };

    await listener.handleStageChanged(payload);

    expect(transitionService.handleTransition).toHaveBeenCalledWith(payload);
  });
});
