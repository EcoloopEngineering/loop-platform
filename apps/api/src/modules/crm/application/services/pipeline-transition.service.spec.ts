import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PipelineTransitionService } from './pipeline-transition.service';
import { LEAD_REPOSITORY } from '../ports/lead.repository.port';

describe('PipelineTransitionService', () => {
  let service: PipelineTransitionService;
  let leadRepo: Record<string, jest.Mock>;
  let emitter: { emit: jest.Mock };

  beforeEach(async () => {
    leadRepo = {
      findById: jest.fn(),
      updateStageAndPipeline: jest.fn(),
      createActivity: jest.fn(),
    };
    emitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PipelineTransitionService,
        { provide: LEAD_REPOSITORY, useValue: leadRepo },
        { provide: EventEmitter2, useValue: emitter },
      ],
    }).compile();

    service = module.get(PipelineTransitionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should auto-transition WON to SITE_AUDIT', async () => {
    leadRepo.findById.mockResolvedValue({
      id: 'lead-1',
      status: 'ACTIVE',
      projectManagerId: 'pm-1',
      createdById: 'user-1',
    });
    leadRepo.updateStageAndPipeline.mockResolvedValue({});
    leadRepo.createActivity.mockResolvedValue({});

    await service.handleTransition({
      leadId: 'lead-1',
      customerName: 'John Doe',
      previousStage: 'DESIGN_READY',
      newStage: 'WON',
    });

    expect(leadRepo.updateStageAndPipeline).toHaveBeenCalledWith(
      'lead-1',
      'SITE_AUDIT',
      '00000000-0000-0000-0000-000000000002',
    );
    expect(leadRepo.createActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: 'lead-1',
        type: 'STAGE_CHANGE',
        metadata: expect.objectContaining({ pipelineTransition: true }),
      }),
    );
    expect(emitter.emit).toHaveBeenCalledWith('lead.stageChanged', expect.objectContaining({
      newStage: 'SITE_AUDIT',
    }));
  });

  it('should auto-transition CUSTOMER_SUCCESS to FIN_TICKETS_OPEN', async () => {
    leadRepo.findById.mockResolvedValue({
      id: 'lead-2',
      status: 'ACTIVE',
      projectManagerId: null,
      createdById: 'user-1',
    });
    leadRepo.updateStageAndPipeline.mockResolvedValue({});
    leadRepo.createActivity.mockResolvedValue({});

    await service.handleTransition({
      leadId: 'lead-2',
      customerName: 'Jane Doe',
      previousStage: 'FINAL_SUBMISSION',
      newStage: 'CUSTOMER_SUCCESS',
    });

    expect(leadRepo.updateStageAndPipeline).toHaveBeenCalledWith(
      'lead-2',
      'FIN_TICKETS_OPEN',
      '00000000-0000-0000-0000-000000000003',
    );
  });

  it('should not transition non-terminal stages', async () => {
    await service.handleTransition({
      leadId: 'lead-3',
      customerName: 'Bob',
      previousStage: 'NEW_LEAD',
      newStage: 'ALREADY_CALLED',
    });

    expect(leadRepo.findById).not.toHaveBeenCalled();
  });

  it('should not transition LOST leads', async () => {
    leadRepo.findById.mockResolvedValue({
      id: 'lead-4',
      status: 'LOST',
      projectManagerId: null,
      createdById: 'user-1',
    });

    await service.handleTransition({
      leadId: 'lead-4',
      customerName: 'Lost Lead',
      previousStage: 'DESIGN_READY',
      newStage: 'WON',
    });

    expect(leadRepo.updateStageAndPipeline).not.toHaveBeenCalled();
  });

  it('should stop at max depth', async () => {
    await service.handleTransition({
      leadId: 'lead-5',
      customerName: 'Deep',
      previousStage: 'A',
      newStage: 'WON',
      depth: 5,
    });

    expect(leadRepo.findById).not.toHaveBeenCalled();
  });
});
