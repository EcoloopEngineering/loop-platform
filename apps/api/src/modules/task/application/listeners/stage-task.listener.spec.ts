import { Test } from '@nestjs/testing';
import { StageTaskListener } from './stage-task.listener';
import { TASK_REPOSITORY } from '../ports/task.repository.port';
import { GoogleChatService } from '../../../../integrations/google-chat/google-chat.service';
import { TaskCreationService } from '../services/task-creation.service';

describe('StageTaskListener', () => {
  let listener: StageTaskListener;
  let repo: Record<string, jest.Mock>;
  let googleChat: { isConfigured: jest.Mock; sendMessage: jest.Mock };
  let taskCreationService: { createTasksFromTemplates: jest.Mock; evaluateConditions: jest.Mock };

  beforeEach(async () => {
    repo = {
      findActiveTemplatesByStage: jest.fn(),
      findLeadWithMetadataAndState: jest.fn(),
      createLeadActivity: jest.fn().mockResolvedValue({}),
      findLeadMetadataOnly: jest.fn().mockResolvedValue(null),
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
      findTemplateById: jest.fn(),
      createTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      findSiblingTasks: jest.fn(),
      updateLeadMetadata: jest.fn(),
    };
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
        { provide: TASK_REPOSITORY, useValue: repo },
        { provide: GoogleChatService, useValue: googleChat },
        { provide: TaskCreationService, useValue: taskCreationService },
      ],
    }).compile();

    listener = module.get(StageTaskListener);
  });

  it('should create tasks from templates when stage changes', async () => {
    repo.findActiveTemplatesByStage.mockResolvedValue([
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
    repo.findLeadWithMetadataAndState.mockResolvedValue({
      id: 'lead-1',
      metadata: {},
      property: { state: 'CT' },
    });
    taskCreationService.createTasksFromTemplates.mockResolvedValue(['task-1']);

    await listener.handleStageChanged({
      leadId: 'lead-1',
      customerName: 'John Doe',
      previousStage: 'NEW_LEAD',
      newStage: 'DESIGN_READY',
    });

    expect(repo.findActiveTemplatesByStage).toHaveBeenCalledWith('DESIGN_READY');
    expect(taskCreationService.createTasksFromTemplates).toHaveBeenCalledTimes(1);
    expect(repo.createLeadActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: 'lead-1',
        type: 'STAGE_CHANGE',
      }),
    );
  });

  it('should skip when no templates exist for stage', async () => {
    repo.findActiveTemplatesByStage.mockResolvedValue([]);

    await listener.handleStageChanged({
      leadId: 'lead-1',
      customerName: 'Nobody',
      previousStage: 'NEW_LEAD',
      newStage: 'DESIGN_READY',
    });

    expect(taskCreationService.createTasksFromTemplates).not.toHaveBeenCalled();
    expect(repo.createLeadActivity).not.toHaveBeenCalled();
  });

  it('should skip when lead is not found', async () => {
    repo.findActiveTemplatesByStage.mockResolvedValue([{ id: 'tmpl-1' }]);
    repo.findLeadWithMetadataAndState.mockResolvedValue(null);

    await listener.handleStageChanged({
      leadId: 'lead-1',
      customerName: 'Nobody',
      previousStage: 'NEW_LEAD',
      newStage: 'DESIGN_READY',
    });

    expect(taskCreationService.createTasksFromTemplates).not.toHaveBeenCalled();
  });

  it('should not log activity when no tasks were created', async () => {
    repo.findActiveTemplatesByStage.mockResolvedValue([{ id: 'tmpl-1' }]);
    repo.findLeadWithMetadataAndState.mockResolvedValue({
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

    expect(repo.createLeadActivity).not.toHaveBeenCalled();
  });

  it('should send chat notification using googleChatSpaceName key', async () => {
    repo.findActiveTemplatesByStage.mockResolvedValue([{ id: 'tmpl-1' }]);
    repo.findLeadWithMetadataAndState.mockResolvedValue({
      id: 'lead-1',
      metadata: {},
      property: { state: 'CT' },
    });
    taskCreationService.createTasksFromTemplates.mockResolvedValue(['task-1']);
    googleChat.isConfigured.mockReturnValue(true);
    repo.findLeadMetadataOnly.mockResolvedValue({
      metadata: { googleChatSpaceName: 'spaces/test' },
    });

    await listener.handleStageChanged({
      leadId: 'lead-1',
      customerName: 'Test',
      previousStage: 'NEW_LEAD',
      newStage: 'DESIGN_READY',
    });

    expect(googleChat.sendMessage).toHaveBeenCalledWith(
      'spaces/test',
      expect.stringContaining('1 new task(s)'),
    );
  });

  describe('evaluateConditions', () => {
    it('should delegate to TaskCreationService', () => {
      taskCreationService.evaluateConditions.mockReturnValue(true);
      expect(listener.evaluateConditions(null, {})).toBe(true);
      expect(taskCreationService.evaluateConditions).toHaveBeenCalledWith(null, {});
    });
  });
});
