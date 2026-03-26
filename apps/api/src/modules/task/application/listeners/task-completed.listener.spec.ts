import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TaskCompletedListener } from './task-completed.listener';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('TaskCompletedListener', () => {
  let listener: TaskCompletedListener;
  let prisma: MockPrismaService;
  let emitter: { emit: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    emitter = { emit: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        TaskCompletedListener,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: emitter },
      ],
    }).compile();

    listener = module.get(TaskCompletedListener);
  });

  it('should skip when no leadId or templateKey', async () => {
    await listener.handleTaskCompleted({
      taskId: 't1',
      leadId: null,
      templateKey: null,
      completedById: 'u1',
    });

    expect(prisma.task.findMany).not.toHaveBeenCalled();
  });

  it('should not emit stageAdvance when not all siblings completed', async () => {
    prisma.task.findMany.mockResolvedValue([
      { id: 't1', status: 'COMPLETED' },
      { id: 't2', status: 'OPEN' },
    ]);

    await listener.handleTaskCompleted({
      taskId: 't1',
      leadId: 'lead-1',
      templateKey: 'tmpl-1',
      completedById: 'u1',
    });

    expect(emitter.emit).not.toHaveBeenCalled();
    expect(prisma.leadActivity.create).not.toHaveBeenCalled();
  });

  it('should log activity when all siblings completed', async () => {
    prisma.task.findMany.mockResolvedValue([
      { id: 't1', status: 'COMPLETED' },
      { id: 't2', status: 'COMPLETED' },
    ]);
    prisma.taskTemplate.findUnique.mockResolvedValue({
      id: 'tmpl-1',
      title: 'Review design',
      conditions: {},
    });
    prisma.leadActivity.create.mockResolvedValue({});

    await listener.handleTaskCompleted({
      taskId: 't1',
      leadId: 'lead-1',
      templateKey: 'tmpl-1',
      completedById: 'u1',
    });

    expect(prisma.leadActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          leadId: 'lead-1',
          type: 'TASK_COMPLETED',
          userId: 'u1',
        }),
      }),
    );
  });

  it('should emit lead.stageAdvance when all completed and nextStage defined', async () => {
    prisma.task.findMany.mockResolvedValue([
      { id: 't1', status: 'COMPLETED' },
    ]);
    prisma.taskTemplate.findUnique.mockResolvedValue({
      id: 'tmpl-1',
      title: 'Review design',
      conditions: { nextStage: 'DESIGN_READY' },
    });
    prisma.leadActivity.create.mockResolvedValue({});

    await listener.handleTaskCompleted({
      taskId: 't1',
      leadId: 'lead-1',
      templateKey: 'tmpl-1',
      completedById: 'u1',
    });

    expect(emitter.emit).toHaveBeenCalledWith('lead.stageAdvance', {
      leadId: 'lead-1',
      suggestedStage: 'DESIGN_READY',
      reason: expect.stringContaining('Review design'),
    });
  });
});
