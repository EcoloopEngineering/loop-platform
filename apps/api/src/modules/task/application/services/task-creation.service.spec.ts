import { Test } from '@nestjs/testing';
import { TaskCreationService } from './task-creation.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('TaskCreationService', () => {
  let service: TaskCreationService;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module = await Test.createTestingModule({
      providers: [
        TaskCreationService,
        { provide: PrismaService, useValue: prisma },
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
      prisma.task.create.mockResolvedValue({ id: 'task-1' });

      const result = await service.createTasksFromTemplates(templates, mockLead, mockPayload);

      expect(result).toEqual(['task-1']);
      expect(prisma.task.create).toHaveBeenCalledTimes(1);
      expect(prisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            leadId: 'lead-1',
            title: 'Review design',
            templateKey: 'tmpl-1',
          }),
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
      expect(prisma.task.create).not.toHaveBeenCalled();
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
      prisma.task.create.mockResolvedValue({ id: 'task-1' });

      const result = await service.createTasksFromTemplates(templates, mockLead, mockPayload);

      expect(result).toEqual(['task-1']);
      // 1 parent + 2 subtasks = 3 creates
      expect(prisma.task.create).toHaveBeenCalledTimes(3);
    });

    it('should return empty array when no templates match conditions', async () => {
      const result = await service.createTasksFromTemplates([], mockLead, mockPayload);
      expect(result).toEqual([]);
    });
  });

  describe('resolveAssignee', () => {
    it('should resolve by email first', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'user-john' });

      const result = await service.resolveAssignee(null, 'john@ecoloop.us');

      expect(result).toBe('user-john');
      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'john@ecoloop.us', isActive: true },
        }),
      );
    });

    it('should resolve PM role to lead project manager', async () => {
      prisma.lead.findUnique.mockResolvedValue({ projectManagerId: 'pm-1' });

      const result = await service.resolveAssignee('PM', null, 'lead-1');

      expect(result).toBe('pm-1');
    });

    it('should fallback to MANAGER when PM has no project manager', async () => {
      prisma.lead.findUnique.mockResolvedValue({ projectManagerId: null });
      prisma.user.findFirst.mockResolvedValue({ id: 'manager-1' });

      const result = await service.resolveAssignee('PM', null, 'lead-1');

      expect(result).toBe('manager-1');
    });

    it('should resolve by role', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'sales-1' });

      const result = await service.resolveAssignee('SALES_REP');

      expect(result).toBe('sales-1');
    });

    it('should return undefined when no assignee found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      const result = await service.resolveAssignee('ADMIN');

      expect(result).toBeUndefined();
    });
  });

  describe('createSubtasks', () => {
    it('should create subtasks for a parent task', async () => {
      prisma.task.create.mockResolvedValue({ id: 'sub-1' });

      await service.createSubtasks('parent-1', [
        { title: 'Sub 1', description: 'First' },
        { title: 'Sub 2' },
      ], { leadId: 'lead-1', assigneeId: 'user-1', templateKey: 'tmpl-1' });

      expect(prisma.task.create).toHaveBeenCalledTimes(2);
      expect(prisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            parentTaskId: 'parent-1',
            title: 'Sub 1',
          }),
        }),
      );
    });

    it('should do nothing when subtaskDefs is null', async () => {
      await service.createSubtasks('parent-1', null, {
        leadId: 'lead-1',
        assigneeId: 'user-1',
        templateKey: 'tmpl-1',
      });

      expect(prisma.task.create).not.toHaveBeenCalled();
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
