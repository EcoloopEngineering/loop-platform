import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TaskCompletedListener } from './task-completed.listener';
import { TASK_REPOSITORY } from '../ports/task.repository.port';

describe('TaskCompletedListener', () => {
  let listener: TaskCompletedListener;
  let repo: Record<string, jest.Mock>;
  let emitter: { emit: jest.Mock };

  beforeEach(async () => {
    repo = {
      findSiblingTasks: jest.fn(),
      findTemplateById: jest.fn(),
      createLeadActivity: jest.fn().mockResolvedValue({}),
      findAll: jest.fn(),
      findById: jest.fn(),
      findByIdSimple: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      complete: jest.fn(),
      cancel: jest.fn(),
      createTask: jest.fn(),
      findActiveUserByEmail: jest.fn(),
      findActiveUserByRole: jest.fn(),
      findLeadProjectManagerId: jest.fn(),
      findTemplates: jest.fn(),
      createTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      findActiveTemplatesByStage: jest.fn(),
      findLeadWithMetadataAndState: jest.fn(),
      findLeadMetadataOnly: jest.fn(),
      updateLeadMetadata: jest.fn(),
    };
    emitter = { emit: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        TaskCompletedListener,
        { provide: TASK_REPOSITORY, useValue: repo },
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

    expect(repo.findSiblingTasks).not.toHaveBeenCalled();
  });

  it('should not emit stageAdvance when not all siblings completed', async () => {
    repo.findSiblingTasks.mockResolvedValue([
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
    expect(repo.createLeadActivity).not.toHaveBeenCalled();
  });

  it('should log activity when all siblings completed', async () => {
    repo.findSiblingTasks.mockResolvedValue([
      { id: 't1', status: 'COMPLETED' },
      { id: 't2', status: 'COMPLETED' },
    ]);
    repo.findTemplateById.mockResolvedValue({
      id: 'tmpl-1',
      title: 'Review design',
      conditions: {},
    });

    await listener.handleTaskCompleted({
      taskId: 't1',
      leadId: 'lead-1',
      templateKey: 'tmpl-1',
      completedById: 'u1',
    });

    expect(repo.createLeadActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: 'lead-1',
        type: 'STAGE_CHANGE',
        userId: 'u1',
      }),
    );
  });

  it('should emit lead.stageAdvance when all completed and nextStage defined', async () => {
    repo.findSiblingTasks.mockResolvedValue([
      { id: 't1', status: 'COMPLETED' },
    ]);
    repo.findTemplateById.mockResolvedValue({
      id: 'tmpl-1',
      title: 'Review design',
      conditions: { nextStage: 'DESIGN_READY' },
    });

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
