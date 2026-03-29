import { Test } from '@nestjs/testing';
import { StageTaskListener } from './stage-task.listener';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { GoogleChatService } from '../../../../integrations/google-chat/google-chat.service';
import { TaskCreationService } from '../services/task-creation.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('StageTaskListener', () => {
  let listener: StageTaskListener;
  let prisma: MockPrismaService;
  let googleChat: { isConfigured: jest.Mock; sendMessage: jest.Mock };
  let taskCreationService: { createTasksFromTemplates: jest.Mock; evaluateConditions: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    googleChat = {
      isConfigured: jest.fn().mockReturnValue(false),
      sendMessage: jest.fn().mockResolvedValue(undefined),
    };
    taskCreationService = {
      createTasksFromTemplates: jest.fn().mockResolvedValue([]),
      evaluateConditions: jest.fn().mockReturnValue(true),
    };

    const module = await Test.createTestingModule({
      providers: [
        StageTaskListener,
        { provide: PrismaService, useValue: prisma },
        { provide: GoogleChatService, useValue: googleChat },
        { provide: TaskCreationService, useValue: taskCreationService },
      ],
    }).compile();

    listener = module.get(StageTaskListener);
  });

  it('should create tasks from templates when stage changes', async () => {
    prisma.taskTemplate.findMany.mockResolvedValue([
      {
        id: 'tmpl-1',
        title: 'Review design',
        description: 'Check the design',
        defaultAssigneeRole: null,
        defaultAssigneeEmail: null,
        subtasks: null,
        conditions: null,
        sortOrder: 0,
      },
    ]);
    prisma.lead.findUnique.mockResolvedValue({
      id: 'lead-1',
      metadata: {},
      property: { state: 'CT' },
    });
    taskCreationService.createTasksFromTemplates.mockResolvedValue(['task-1']);
    prisma.leadActivity.create.mockResolvedValue({});

    await listener.handleStageChanged({
      leadId: 'lead-1',
      customerName: 'John Doe',
      previousStage: 'NEW_LEAD',
      newStage: 'DESIGN_READY',
    });

    expect(prisma.taskTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stage: 'DESIGN_READY', isActive: true },
      }),
    );
    expect(taskCreationService.createTasksFromTemplates).toHaveBeenCalledTimes(1);
    expect(prisma.leadActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          leadId: 'lead-1',
          type: 'STAGE_CHANGE',
        }),
      }),
    );
  });

  it('should skip when no templates exist for stage', async () => {
    prisma.taskTemplate.findMany.mockResolvedValue([]);

    await listener.handleStageChanged({
      leadId: 'lead-1',
      customerName: 'Nobody',
      previousStage: 'NEW_LEAD',
      newStage: 'DESIGN_READY',
    });

    expect(taskCreationService.createTasksFromTemplates).not.toHaveBeenCalled();
    expect(prisma.leadActivity.create).not.toHaveBeenCalled();
  });

  it('should skip when lead is not found', async () => {
    prisma.taskTemplate.findMany.mockResolvedValue([{ id: 'tmpl-1' }]);
    prisma.lead.findUnique.mockResolvedValue(null);

    await listener.handleStageChanged({
      leadId: 'lead-1',
      customerName: 'Nobody',
      previousStage: 'NEW_LEAD',
      newStage: 'DESIGN_READY',
    });

    expect(taskCreationService.createTasksFromTemplates).not.toHaveBeenCalled();
  });

  it('should not log activity when no tasks were created', async () => {
    prisma.taskTemplate.findMany.mockResolvedValue([{ id: 'tmpl-1' }]);
    prisma.lead.findUnique.mockResolvedValue({
      id: 'lead-1',
      metadata: {},
      property: { state: 'CT' },
    });
    taskCreationService.createTasksFromTemplates.mockResolvedValue([]);

    await listener.handleStageChanged({
      leadId: 'lead-1',
      customerName: 'Test',
      previousStage: 'NEW_LEAD',
      newStage: 'DESIGN_READY',
    });

    expect(prisma.leadActivity.create).not.toHaveBeenCalled();
  });

  describe('evaluateConditions', () => {
    it('should delegate to TaskCreationService', () => {
      taskCreationService.evaluateConditions.mockReturnValue(true);
      expect(listener.evaluateConditions(null, {})).toBe(true);
      expect(taskCreationService.evaluateConditions).toHaveBeenCalledWith(null, {});
    });
  });
});
