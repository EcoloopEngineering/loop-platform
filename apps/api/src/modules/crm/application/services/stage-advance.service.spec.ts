import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StageAdvanceService } from './stage-advance.service';
import { LEAD_REPOSITORY } from '../ports/lead.repository.port';

describe('StageAdvanceService', () => {
  let service: StageAdvanceService;
  let leadRepo: {
    findById: jest.Mock;
    findByIdWithCustomer: jest.Mock;
    updateStage: jest.Mock;
    createActivity: jest.Mock;
  };
  let emitter: { emit: jest.Mock };

  beforeEach(async () => {
    leadRepo = {
      findById: jest.fn(),
      findByIdWithCustomer: jest.fn(),
      updateStage: jest.fn().mockResolvedValue({}),
      createActivity: jest.fn().mockResolvedValue({}),
    };
    emitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StageAdvanceService,
        { provide: LEAD_REPOSITORY, useValue: leadRepo },
        { provide: EventEmitter2, useValue: emitter },
      ],
    }).compile();

    service = module.get(StageAdvanceService);
  });

  it('advances to suggestedStage and emits stageChanged event', async () => {
    leadRepo.findByIdWithCustomer.mockResolvedValue({
      id: 'lead-1',
      customer: { firstName: 'John', lastName: 'Doe' },
    });
    leadRepo.findById.mockResolvedValue({
      id: 'lead-1',
      currentStage: 'PROGRESS_REVIEW',
      projectManagerId: 'pm-1',
      createdById: 'user-1',
    });

    await service.handleStageChange({
      leadId: 'lead-1',
      suggestedStage: 'ENGINEERING',
    });

    expect(leadRepo.updateStage).toHaveBeenCalledWith('lead-1', 'ENGINEERING');
    expect(leadRepo.createActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: 'lead-1',
        type: 'STAGE_CHANGE',
        description: expect.stringContaining('Auto-advanced from PROGRESS_REVIEW to ENGINEERING'),
      }),
    );
    expect(emitter.emit).toHaveBeenCalledWith('lead.stageChanged', {
      leadId: 'lead-1',
      customerName: 'John Doe',
      previousStage: 'PROGRESS_REVIEW',
      newStage: 'ENGINEERING',
    });
  });

  it('auto-determines next PM stage when no suggestedStage provided', async () => {
    leadRepo.findByIdWithCustomer.mockResolvedValue({
      id: 'lead-2',
      customer: { firstName: 'Jane', lastName: 'Smith' },
    });
    leadRepo.findById.mockResolvedValue({
      id: 'lead-2',
      currentStage: 'INSTALL_READY',
      projectManagerId: null,
      createdById: 'user-2',
    });

    await service.handleStageChange({ leadId: 'lead-2' });

    expect(leadRepo.updateStage).toHaveBeenCalledWith('lead-2', 'INSTALL');
  });

  it('skips when lead is not found', async () => {
    leadRepo.findByIdWithCustomer.mockResolvedValue(null);

    await service.handleStageChange({ leadId: 'nonexistent' });

    expect(leadRepo.updateStage).not.toHaveBeenCalled();
    expect(leadRepo.createActivity).not.toHaveBeenCalled();
    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it('skips when no next stage can be determined (last stage)', async () => {
    leadRepo.findByIdWithCustomer.mockResolvedValue({
      id: 'lead-3',
      customer: { firstName: 'Bob', lastName: 'Brown' },
    });
    leadRepo.findById.mockResolvedValue({
      id: 'lead-3',
      currentStage: 'CUSTOMER_SUCCESS',
      projectManagerId: null,
      createdById: 'user-3',
    });

    await service.handleStageChange({ leadId: 'lead-3' });

    expect(leadRepo.updateStage).not.toHaveBeenCalled();
    expect(emitter.emit).not.toHaveBeenCalled();
  });
});
