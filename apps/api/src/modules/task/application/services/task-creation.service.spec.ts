import { Test } from '@nestjs/testing';
import { TaskCreationService } from './task-creation.service';
import { TASK_REPOSITORY, TaskRepositoryPort } from '../ports/task.repository.port';

describe('TaskCreationService', () => {
  let service: TaskCreationService;
  let taskRepo: Record<keyof Pick<TaskRepositoryPort, 'createTask' | 'findActiveUserByEmail' | 'findActiveUserByRole' | 'findLeadProjectManagerId'>, jest.Mock>;

  beforeEach(async () => {
    taskRepo = {
      createTask: jest.fn(),
      findActiveUserByEmail: jest.fn(),
      findActiveUserByRole: jest.fn(),
      findLeadProjectManagerId: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        TaskCreationService,
        { provide: TASK_REPOSITORY, useValue: taskRepo },
      ],
    }).compile();

    service = module.get(TaskCreationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTasksFromTemplates', () => {
    const mockLead = { id: 'lead-1', metadata: {}, property: { state: 'CT' } };
    const mockPayload = { leadId: 'lead-1', customerName: 'John Doe', newStage: 'DESIGN_READY' };

    it('should create tasks from templates', async () => {
      const templates = [
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
      ];
      taskRepo.createTask.mockResolvedValue({ id: 'task-1' });

      const result = await service.createTasksFromTemplates(templates, mockLead, mockPayload);

      expect(result).toEqual(['task-1']);
      expect(taskRepo.createTask).toHaveBeenCalledTimes(1);
      expect(taskRepo.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: 'lead-1',
          title: 'Review design',
          templateKey: 'tmpl-1',
        }),
      );
    });

    it('should skip templates when conditions are not met', async () => {
      const templates = [
        {
          id: 'tmpl-1',
          title: 'CT-only task',
          description: null,
          defaultAssigneeRole: null,
          defaultAssigneeEmail: null,
          subtasks: null,
          conditions: { state: 'NY' },
          sortOrder: 0,
        },
      ];

      const result = await service.createTasksFromTemplates(templates, mockLead, mockPayload);

      expect(result).toEqual([]);
      expect(taskRepo.createTask).not.toHaveBeenCalled();
    });

    it('should create subtasks when template has subtask definitions', async () => {
      const templates = [
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
      ];
      taskRepo.createTask.mockResolvedValue({ id: 'task-1' });

      const result = await service.createTasksFromTemplates(templates, mockLead, mockPayload);

      expect(result).toEqual(['task-1']);
      // 1 parent + 2 subtasks = 3 creates
      expect(taskRepo.createTask).toHaveBeenCalledTimes(3);
    });

    it('should return empty array when no templates match conditions', async () => {
      const result = await service.createTasksFromTemplates([], mockLead, mockPayload);
      expect(result).toEqual([]);
    });
  });

  describe('resolveAssignee', () => {
    it('should resolve by email first', async () => {
      taskRepo.findActiveUserByEmail.mockResolvedValue({ id: 'user-john' });

      const result = await service.resolveAssignee(null, 'john@ecoloop.us');

      expect(result).toBe('user-john');
      expect(taskRepo.findActiveUserByEmail).toHaveBeenCalledWith('john@ecoloop.us');
    });

    it('should resolve PM role to lead project manager', async () => {
      taskRepo.findLeadProjectManagerId.mockResolvedValue('pm-1');

      const result = await service.resolveAssignee('PM', null, 'lead-1');

      expect(result).toBe('pm-1');
    });

    it('should fallback to MANAGER when PM has no project manager', async () => {
      taskRepo.findLeadProjectManagerId.mockResolvedValue(null);
      taskRepo.findActiveUserByRole.mockResolvedValue({ id: 'manager-1' });

      const result = await service.resolveAssignee('PM', null, 'lead-1');

      expect(result).toBe('manager-1');
    });

    it('should resolve by role', async () => {
      taskRepo.findActiveUserByRole.mockResolvedValue({ id: 'sales-1' });

      const result = await service.resolveAssignee('SALES_REP');

      expect(result).toBe('sales-1');
    });

    it('should return undefined when no assignee found', async () => {
      taskRepo.findActiveUserByRole.mockResolvedValue(null);

      const result = await service.resolveAssignee('ADMIN');

      expect(result).toBeUndefined();
    });
  });

  describe('createSubtasks', () => {
    it('should create subtasks for a parent task', async () => {
      taskRepo.createTask.mockResolvedValue({ id: 'sub-1' });

      await service.createSubtasks('parent-1', [
        { title: 'Sub 1', description: 'First' },
        { title: 'Sub 2' },
      ], { leadId: 'lead-1', assigneeId: 'user-1', templateKey: 'tmpl-1' });

      expect(taskRepo.createTask).toHaveBeenCalledTimes(2);
      expect(taskRepo.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          parentTaskId: 'parent-1',
          title: 'Sub 1',
        }),
      );
    });

    it('should do nothing when subtaskDefs is null', async () => {
      await service.createSubtasks('parent-1', null, {
        leadId: 'lead-1',
        assigneeId: 'user-1',
        templateKey: 'tmpl-1',
      });

      expect(taskRepo.createTask).not.toHaveBeenCalled();
    });
  });

  describe('evaluateConditions', () => {
    it('should return true when no conditions', () => {
      expect(service.evaluateConditions(null, { id: '1', metadata: {}, property: null })).toBe(true);
      expect(service.evaluateConditions({}, { id: '1', metadata: {}, property: null })).toBe(true);
    });

    it('should check state condition', () => {
      const lead = { id: '1', metadata: {}, property: { state: 'CT' } };
      expect(service.evaluateConditions({ state: 'CT' }, lead)).toBe(true);
      expect(service.evaluateConditions({ state: 'NY' }, lead)).toBe(false);
    });

    it('should check metadata conditions', () => {
      const lead = { id: '1', metadata: { hasStructural: true }, property: { state: 'CT' } };
      expect(service.evaluateConditions({ hasStructural: true }, lead)).toBe(true);
      expect(service.evaluateConditions({ hasStructural: false }, lead)).toBe(false);
    });
  });
});
