import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StageAdvanceListener } from './stage-advance.listener';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../../../test/prisma-mock.helper';

describe('StageAdvanceListener', () => {
  let listener: StageAdvanceListener;
  let prisma: MockPrismaService;
  let emitter: { emit: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    emitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StageAdvanceListener,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: emitter },
      ],
    }).compile();

    listener = module.get(StageAdvanceListener);
  });

  it('auto-advances to the next stage when suggestedStage is provided', async () => {
    prisma.lead.findUnique.mockResolvedValue({
      id: 'lead-1',
      currentStage: 'PROGRESS_REVIEW',
      projectManagerId: 'pm-1',
      createdById: 'user-1',
      customer: { firstName: 'John', lastName: 'Doe' },
    });
    prisma.lead.update.mockResolvedValue({});
    prisma.leadActivity.create.mockResolvedValue({});

    await listener.handleStageAdvance({
      leadId: 'lead-1',
      suggestedStage: 'ENGINEERING',
    });

    expect(prisma.lead.update).toHaveBeenCalledWith({
      where: { id: 'lead-1' },
      data: { currentStage: 'ENGINEERING' },
    });
    expect(prisma.leadActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          leadId: 'lead-1',
          type: 'STAGE_CHANGE',
          description: expect.stringContaining('Auto-advanced from PROGRESS_REVIEW to ENGINEERING'),
        }),
      }),
    );
    expect(emitter.emit).toHaveBeenCalledWith('lead.stageChanged', {
      leadId: 'lead-1',
      customerName: 'John Doe',
      previousStage: 'PROGRESS_REVIEW',
      newStage: 'ENGINEERING',
    });
  });

  it('auto-advances to the next PM stage when no suggestedStage is provided', async () => {
    prisma.lead.findUnique.mockResolvedValue({
      id: 'lead-2',
      currentStage: 'INSTALL_READY',
      projectManagerId: null,
      createdById: 'user-2',
      customer: { firstName: 'Jane', lastName: 'Smith' },
    });
    prisma.lead.update.mockResolvedValue({});
    prisma.leadActivity.create.mockResolvedValue({});

    await listener.handleStageAdvance({ leadId: 'lead-2' });

    expect(prisma.lead.update).toHaveBeenCalledWith({
      where: { id: 'lead-2' },
      data: { currentStage: 'INSTALL' },
    });
  });

  it('skips if no next stage can be determined', async () => {
    prisma.lead.findUnique.mockResolvedValue({
      id: 'lead-3',
      currentStage: 'CUSTOMER_SUCCESS', // Last stage
      projectManagerId: null,
      createdById: 'user-3',
      customer: { firstName: 'Bob', lastName: 'Brown' },
    });

    await listener.handleStageAdvance({ leadId: 'lead-3' });

    expect(prisma.lead.update).not.toHaveBeenCalled();
    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it('skips if lead is not found', async () => {
    prisma.lead.findUnique.mockResolvedValue(null);

    await listener.handleStageAdvance({ leadId: 'nonexistent' });

    expect(prisma.lead.update).not.toHaveBeenCalled();
    expect(prisma.leadActivity.create).not.toHaveBeenCalled();
    expect(emitter.emit).not.toHaveBeenCalled();
  });
});
