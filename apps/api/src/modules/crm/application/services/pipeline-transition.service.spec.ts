import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PipelineTransitionService } from './pipeline-transition.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService } from '../../../../test/prisma-mock.helper';

describe('PipelineTransitionService', () => {
  let service: PipelineTransitionService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let emitter: { emit: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    emitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PipelineTransitionService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: emitter },
      ],
    }).compile();

    service = module.get(PipelineTransitionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should auto-transition WON to SITE_AUDIT', async () => {
    prisma.lead.findUnique.mockResolvedValue({
      id: 'lead-1',
      status: 'ACTIVE',
      projectManagerId: 'pm-1',
      createdById: 'user-1',
    });
    prisma.lead.update.mockResolvedValue({});
    prisma.leadActivity.create.mockResolvedValue({});

    await service.handleTransition({
      leadId: 'lead-1',
      customerName: 'John Doe',
      previousStage: 'DESIGN_READY',
      newStage: 'WON',
    });

    expect(prisma.lead.update).toHaveBeenCalledWith({
      where: { id: 'lead-1' },
      data: {
        currentStage: 'SITE_AUDIT',
        pipelineId: '00000000-0000-0000-0000-000000000002',
      },
    });
    expect(emitter.emit).toHaveBeenCalledWith('lead.stageChanged', expect.objectContaining({
      newStage: 'SITE_AUDIT',
    }));
  });

  it('should auto-transition CUSTOMER_SUCCESS to FIN_TICKETS_OPEN', async () => {
    prisma.lead.findUnique.mockResolvedValue({
      id: 'lead-2',
      status: 'ACTIVE',
      projectManagerId: null,
      createdById: 'user-1',
    });
    prisma.lead.update.mockResolvedValue({});
    prisma.leadActivity.create.mockResolvedValue({});

    await service.handleTransition({
      leadId: 'lead-2',
      customerName: 'Jane Doe',
      previousStage: 'FINAL_SUBMISSION',
      newStage: 'CUSTOMER_SUCCESS',
    });

    expect(prisma.lead.update).toHaveBeenCalledWith({
      where: { id: 'lead-2' },
      data: {
        currentStage: 'FIN_TICKETS_OPEN',
        pipelineId: '00000000-0000-0000-0000-000000000003',
      },
    });
  });

  it('should not transition non-terminal stages', async () => {
    await service.handleTransition({
      leadId: 'lead-3',
      customerName: 'Bob',
      previousStage: 'NEW_LEAD',
      newStage: 'ALREADY_CALLED',
    });

    expect(prisma.lead.findUnique).not.toHaveBeenCalled();
  });

  it('should not transition LOST leads', async () => {
    prisma.lead.findUnique.mockResolvedValue({
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

    expect(prisma.lead.update).not.toHaveBeenCalled();
  });

  it('should stop at max depth', async () => {
    await service.handleTransition({
      leadId: 'lead-5',
      customerName: 'Deep',
      previousStage: 'A',
      newStage: 'WON',
      depth: 5,
    });

    expect(prisma.lead.findUnique).not.toHaveBeenCalled();
  });
});
