import { Test } from '@nestjs/testing';
import { StageTaskListener } from './stage-task.listener';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { GoogleChatService } from '../../../../integrations/google-chat/google-chat.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('StageTaskListener', () => {
  let listener: StageTaskListener;
  let prisma: MockPrismaService;
  let googleChat: { isConfigured: jest.Mock; sendMessage: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    googleChat = {
      isConfigured: jest.fn().mockReturnValue(false),
      sendMessage: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        StageTaskListener,
        { provide: PrismaService, useValue: prisma },
        { provide: GoogleChatService, useValue: googleChat },
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
    prisma.task.create.mockResolvedValue({ id: 'task-1' });
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
    expect(prisma.task.create).toHaveBeenCalledTimes(1);
    expect(prisma.leadActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          leadId: 'lead-1',
          type: 'TASK_CREATED',
        }),
      }),
    );
  });

  it('should skip templates when conditions are not met', async () => {
    prisma.taskTemplate.findMany.mockResolvedValue([
      {
        id: 'tmpl-1',
        title: 'CT-only task',
        description: null,
        defaultAssigneeRole: null,
        defaultAssigneeEmail: null,
        subtasks: null,
        conditions: { state: 'CT' },
        sortOrder: 0,
      },
    ]);
    prisma.lead.findUnique.mockResolvedValue({
      id: 'lead-1',
      metadata: {},
      property: { state: 'NY' },
    });

    await listener.handleStageChanged({
      leadId: 'lead-1',
      customerName: 'Jane Doe',
      previousStage: 'NEW_LEAD',
      newStage: 'DESIGN_READY',
    });

    expect(prisma.task.create).not.toHaveBeenCalled();
  });

  it('should create subtasks when template has subtask definitions', async () => {
    prisma.taskTemplate.findMany.mockResolvedValue([
      {
        id: 'tmpl-1',
        title: 'Parent Task',
        description: null,
        defaultAssigneeRole: null,
        defaultAssigneeEmail: null,
        subtasks: [
          { title: 'Sub 1', description: 'First subtask' },
          { title: 'Sub 2', description: 'Second subtask' },
        ],
        conditions: null,
        sortOrder: 0,
      },
    ]);
    prisma.lead.findUnique.mockResolvedValue({
      id: 'lead-1',
      metadata: {},
      property: { state: 'CT' },
    });
    prisma.task.create.mockResolvedValue({ id: 'task-1' });
    prisma.leadActivity.create.mockResolvedValue({});

    await listener.handleStageChanged({
      leadId: 'lead-1',
      customerName: 'Bob',
      previousStage: 'NEW_LEAD',
      newStage: 'CONNECTED',
    });

    // 1 parent + 2 subtasks = 3 creates
    expect(prisma.task.create).toHaveBeenCalledTimes(3);
  });

  it('should do nothing when no templates exist for stage', async () => {
    prisma.taskTemplate.findMany.mockResolvedValue([]);

    await listener.handleStageChanged({
      leadId: 'lead-1',
      customerName: 'Nobody',
      previousStage: 'NEW_LEAD',
      newStage: 'DESIGN_READY',
    });

    expect(prisma.task.create).not.toHaveBeenCalled();
    expect(prisma.leadActivity.create).not.toHaveBeenCalled();
  });

  it('should resolve assignee by email', async () => {
    prisma.taskTemplate.findMany.mockResolvedValue([
      {
        id: 'tmpl-1',
        title: 'Assigned task',
        description: null,
        defaultAssigneeRole: null,
        defaultAssigneeEmail: 'john@ecoloop.us',
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
    prisma.user.findFirst.mockResolvedValue({ id: 'user-john' });
    prisma.task.create.mockResolvedValue({ id: 'task-1' });
    prisma.leadActivity.create.mockResolvedValue({});

    await listener.handleStageChanged({
      leadId: 'lead-1',
      customerName: 'Test',
      previousStage: 'NEW_LEAD',
      newStage: 'CONNECTED',
    });

    expect(prisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ assigneeId: 'user-john' }),
      }),
    );
  });

  describe('evaluateConditions', () => {
    it('should return true when no conditions', () => {
      expect(listener.evaluateConditions(null, {})).toBe(true);
      expect(listener.evaluateConditions({}, {})).toBe(true);
    });

    it('should check state condition', () => {
      const lead = { property: { state: 'CT' }, metadata: {} };
      expect(listener.evaluateConditions({ state: 'CT' }, lead)).toBe(true);
      expect(listener.evaluateConditions({ state: 'NY' }, lead)).toBe(false);
    });

    it('should check metadata conditions', () => {
      const lead = { property: { state: 'CT' }, metadata: { hasStructural: true } };
      expect(listener.evaluateConditions({ hasStructural: true }, lead)).toBe(true);
      expect(listener.evaluateConditions({ hasStructural: false }, lead)).toBe(false);
    });
  });
});
