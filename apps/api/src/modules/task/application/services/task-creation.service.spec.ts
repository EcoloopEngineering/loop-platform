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
    const mockLead = { id: 'lead-1', metadata: {}, financier: null, property: { state: 'CT' } };
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

    it('should add state-based subtasks when stateSubtasks matches lead state', async () => {
      const templates = [
        {
          id: 'tmpl-1',
          title: 'Design',
          description: null,
          defaultAssigneeRole: null,
          defaultAssigneeEmail: null,
          subtasks: [{ title: 'Standard Sub' }],
          conditions: {
            stateSubtasks: {
              CT: ['HES Audit', 'Check offset'],
              RI: ['Test on RI spreadsheet'],
            },
          },
          sortOrder: 1,
        },
      ];
      taskRepo.createTask.mockResolvedValue({ id: 'task-1' });

      const lead = { id: 'lead-1', metadata: {}, financier: null, property: { state: 'CT' } };
      const result = await service.createTasksFromTemplates(templates, lead, mockPayload);

      expect(result).toEqual(['task-1']);
      // 1 parent + 1 standard sub + 2 state subs = 4
      expect(taskRepo.createTask).toHaveBeenCalledTimes(4);
      expect(taskRepo.createTask).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'HES Audit', parentTaskId: 'task-1' }),
      );
      expect(taskRepo.createTask).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Check offset', parentTaskId: 'task-1' }),
      );
    });

    it('should NOT add state subtasks when lead state does not match', async () => {
      const templates = [
        {
          id: 'tmpl-1',
          title: 'Design',
          description: null,
          defaultAssigneeRole: null,
          defaultAssigneeEmail: null,
          subtasks: null,
          conditions: { stateSubtasks: { CT: ['HES Audit'] } },
          sortOrder: 1,
        },
      ];
      taskRepo.createTask.mockResolvedValue({ id: 'task-1' });

      const lead = { id: 'lead-1', metadata: {}, financier: null, property: { state: 'MA' } };
      const result = await service.createTasksFromTemplates(templates, lead, mockPayload);

      expect(result).toEqual(['task-1']);
      // Only the parent task, no state subtasks
      expect(taskRepo.createTask).toHaveBeenCalledTimes(1);
    });

    it('should override assignee role when stateOverride matches lead state', async () => {
      const templates = [
        {
          id: 'tmpl-1',
          title: 'Permit',
          description: null,
          defaultAssigneeRole: 'PERMIT_SPECIALIST',
          defaultAssigneeEmail: null,
          subtasks: null,
          conditions: { stateOverride: { CT: 'PM', RI: 'PM' } },
          sortOrder: 1,
        },
      ];
      taskRepo.createTask.mockResolvedValue({ id: 'task-1' });
      taskRepo.findLeadProjectManagerId.mockResolvedValue('pm-user-1');
      taskRepo.findActiveUserByRole.mockResolvedValue({ id: 'permit-user' });

      const lead = { id: 'lead-1', metadata: {}, financier: null, property: { state: 'CT' } };
      const result = await service.createTasksFromTemplates(templates, lead, mockPayload);

      expect(result).toEqual(['task-1']);
      // PM role was resolved, so findLeadProjectManagerId should have been called
      expect(taskRepo.findLeadProjectManagerId).toHaveBeenCalledWith('lead-1');
      // The task should be assigned to PM, not PERMIT_SPECIALIST
      expect(taskRepo.createTask).toHaveBeenCalledWith(
        expect.objectContaining({ assigneeId: 'pm-user-1' }),
      );
    });

    it('should NOT override assignee when stateOverride does not match lead state', async () => {
      const templates = [
        {
          id: 'tmpl-1',
          title: 'Permit',
          description: null,
          defaultAssigneeRole: 'PERMIT_SPECIALIST',
          defaultAssigneeEmail: null,
          subtasks: null,
          conditions: { stateOverride: { CT: 'PM', RI: 'PM' } },
          sortOrder: 1,
        },
      ];
      taskRepo.createTask.mockResolvedValue({ id: 'task-1' });
      taskRepo.findActiveUserByRole.mockResolvedValue({ id: 'permit-user' });

      const lead = { id: 'lead-1', metadata: {}, financier: null, property: { state: 'MA' } };
      const result = await service.createTasksFromTemplates(templates, lead, mockPayload);

      expect(result).toEqual(['task-1']);
      // PERMIT_SPECIALIST is not a system role, so falls back to PM → ADMIN
      // findLeadProjectManagerId IS called as part of the fallback chain
      expect(taskRepo.findActiveUserByRole).toHaveBeenCalled();
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
      expect(service.evaluateConditions(null, { id: '1', metadata: {}, financier: null, property: null })).toBe(true);
      expect(service.evaluateConditions({}, { id: '1', metadata: {}, financier: null, property: null })).toBe(true);
    });

    it('should check state condition', () => {
      const lead = { id: '1', metadata: {}, financier: null, property: { state: 'CT' } };
      expect(service.evaluateConditions({ state: 'CT' }, lead)).toBe(true);
      expect(service.evaluateConditions({ state: 'NY' }, lead)).toBe(false);
    });

    it('should check metadata conditions', () => {
      const lead = { id: '1', metadata: { hasStructural: true }, financier: null, property: { state: 'CT' } };
      expect(service.evaluateConditions({ hasStructural: true }, lead)).toBe(true);
      expect(service.evaluateConditions({ hasStructural: false }, lead)).toBe(false);
    });

    it('should skip directive keys (nextStage, stateOverride, stateSubtasks)', () => {
      const lead = { id: '1', metadata: {}, financier: null, property: { state: 'CT' } };
      // These are directives, not filter conditions — should return true
      expect(service.evaluateConditions({ nextStage: 'NTP' }, lead)).toBe(true);
      expect(service.evaluateConditions({ stateOverride: { CT: 'PM' } }, lead)).toBe(true);
      expect(service.evaluateConditions({ stateSubtasks: { CT: ['HES Audit'] } }, lead)).toBe(true);
    });

    it('should skip directive keys but still check other conditions', () => {
      const lead = { id: '1', metadata: {}, financier: 'Cash Deal - Sunrun', property: { state: 'CT' } };
      // nextStage is skipped, financierIncludes is checked
      expect(service.evaluateConditions({ nextStage: 'NTP', financierIncludes: 'Cash Deal' }, lead)).toBe(true);
      expect(service.evaluateConditions({ nextStage: 'NTP', financierIncludes: 'Mosaic' }, lead)).toBe(false);
    });

    describe('upgradesIncludes', () => {
      it('should match when upgrades is a string containing the value', () => {
        const lead = { id: '1', metadata: { upgrades: 'Structural' }, financier: null, property: null };
        expect(service.evaluateConditions({ upgradesIncludes: 'Structural' }, lead)).toBe(true);
      });

      it('should match when upgrades is an array containing the value', () => {
        const lead = { id: '1', metadata: { upgrades: ['Structural', 'Roofing'] }, financier: null, property: null };
        expect(service.evaluateConditions({ upgradesIncludes: 'Structural' }, lead)).toBe(true);
      });

      it('should match when upgrades is a comma-separated string', () => {
        const lead = { id: '1', metadata: { upgrades: 'Structural, Roofing' }, financier: null, property: null };
        expect(service.evaluateConditions({ upgradesIncludes: 'Structural' }, lead)).toBe(true);
      });

      it('should be case-insensitive', () => {
        const lead = { id: '1', metadata: { upgrades: ['structural'] }, financier: null, property: null };
        expect(service.evaluateConditions({ upgradesIncludes: 'Structural' }, lead)).toBe(true);
      });

      it('should return false when upgrades does not contain the value', () => {
        const lead = { id: '1', metadata: { upgrades: ['Roofing'] }, financier: null, property: null };
        expect(service.evaluateConditions({ upgradesIncludes: 'Structural' }, lead)).toBe(false);
      });

      it('should return false when upgrades is missing', () => {
        const lead = { id: '1', metadata: {}, financier: null, property: null };
        expect(service.evaluateConditions({ upgradesIncludes: 'Structural' }, lead)).toBe(false);
      });

      it('should match any value when conditionValue is an array', () => {
        const lead = { id: '1', metadata: { upgrades: ['ROOFING'] }, financier: null, property: null };
        expect(service.evaluateConditions({ upgradesIncludes: ['ROOFING', 'REROOF'] }, lead)).toBe(true);
      });

      it('should return false when none of the array values match', () => {
        const lead = { id: '1', metadata: { upgrades: ['Structural'] }, financier: null, property: null };
        expect(service.evaluateConditions({ upgradesIncludes: ['ROOFING', 'REROOF'] }, lead)).toBe(false);
      });
    });

    describe('financierIncludes', () => {
      it('should match when financier contains the substring', () => {
        const lead = { id: '1', metadata: {}, financier: 'Cash Deal - Direct', property: null };
        expect(service.evaluateConditions({ financierIncludes: 'Cash Deal' }, lead)).toBe(true);
      });

      it('should be case-insensitive', () => {
        const lead = { id: '1', metadata: {}, financier: 'cash deal', property: null };
        expect(service.evaluateConditions({ financierIncludes: 'Cash Deal' }, lead)).toBe(true);
      });

      it('should return false when financier does not contain the substring', () => {
        const lead = { id: '1', metadata: {}, financier: 'Sunrun Lease', property: null };
        expect(service.evaluateConditions({ financierIncludes: 'Cash Deal' }, lead)).toBe(false);
      });

      it('should return false when financier is null', () => {
        const lead = { id: '1', metadata: {}, financier: null, property: null };
        expect(service.evaluateConditions({ financierIncludes: 'Cash Deal' }, lead)).toBe(false);
      });
    });
  });
});
