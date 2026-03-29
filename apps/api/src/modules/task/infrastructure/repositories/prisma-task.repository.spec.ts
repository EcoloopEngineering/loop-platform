import { Test, TestingModule } from '@nestjs/testing';
import { PrismaTaskRepository } from './prisma-task.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('PrismaTaskRepository', () => {
  let repository: PrismaTaskRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaTaskRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<PrismaTaskRepository>(PrismaTaskRepository);
  });

  describe('findAll', () => {
    it('should return tasks with includes', async () => {
      const tasks = [{ id: 'task-1', title: 'Test' }];
      prisma.task.findMany.mockResolvedValue(tasks);

      const result = await repository.findAll({});

      expect(result).toEqual(tasks);
      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          include: expect.objectContaining({ assignee: expect.any(Object) }),
          orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        }),
      );
    });

    it('should apply filters', async () => {
      prisma.task.findMany.mockResolvedValue([]);

      await repository.findAll({ leadId: 'lead-1', assigneeId: 'user-1', status: 'PENDING' });

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { leadId: 'lead-1', assigneeId: 'user-1', status: 'PENDING' },
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return task with full includes', async () => {
      const task = { id: 'task-1', title: 'Test', subtasks: [] };
      prisma.task.findUnique.mockResolvedValue(task);

      const result = await repository.findById('task-1');

      expect(result).toEqual(task);
      expect(prisma.task.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'task-1' },
          include: expect.objectContaining({
            subtasks: expect.any(Object),
            parentTask: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe('findByIdSimple', () => {
    it('should return task without includes', async () => {
      const task = { id: 'task-1' };
      prisma.task.findUnique.mockResolvedValue(task);

      const result = await repository.findByIdSimple('task-1');

      expect(result).toEqual(task);
      expect(prisma.task.findUnique).toHaveBeenCalledWith({ where: { id: 'task-1' } });
    });
  });

  describe('create', () => {
    it('should create task with dto data', async () => {
      const dto = { title: 'New Task', leadId: 'lead-1', assigneeId: 'user-1' };
      const created = { id: 'task-1', ...dto };
      prisma.task.create.mockResolvedValue(created);

      const result = await repository.create(dto as any);

      expect(result).toEqual(created);
      expect(prisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: 'New Task', leadId: 'lead-1' }),
        }),
      );
    });
  });

  describe('update', () => {
    it('should update task and return with assignee', async () => {
      const updated = { id: 'task-1', title: 'Updated' };
      prisma.task.update.mockResolvedValue(updated);

      const result = await repository.update('task-1', { title: 'Updated' });

      expect(result).toEqual(updated);
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { title: 'Updated' },
        include: expect.objectContaining({ assignee: expect.any(Object) }),
      });
    });
  });

  describe('complete', () => {
    it('should mark task as COMPLETED', async () => {
      const completed = { id: 'task-1', status: 'COMPLETED' };
      prisma.task.update.mockResolvedValue(completed);

      const result = await repository.complete('task-1', 'user-1');

      expect(result).toEqual(completed);
      expect(prisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'task-1' },
          data: expect.objectContaining({
            status: 'COMPLETED',
            completedById: 'user-1',
          }),
        }),
      );
    });
  });

  describe('cancel', () => {
    it('should mark task as CANCELLED', async () => {
      const cancelled = { id: 'task-1', status: 'CANCELLED' };
      prisma.task.update.mockResolvedValue(cancelled);

      const result = await repository.cancel('task-1');

      expect(result).toEqual(cancelled);
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { status: 'CANCELLED' },
      });
    });
  });

  describe('createTask', () => {
    it('should create task with minimal data', async () => {
      const data = { leadId: 'lead-1', title: 'Auto Task' };
      prisma.task.create.mockResolvedValue({ id: 'task-2', ...data });

      const result = await repository.createTask(data);

      expect(result).toEqual(expect.objectContaining({ id: 'task-2' }));
      expect(prisma.task.create).toHaveBeenCalledWith({ data });
    });
  });

  describe('findActiveUserByEmail', () => {
    it('should find active user by email', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'user-1' });

      const result = await repository.findActiveUserByEmail('test@example.com');

      expect(result).toEqual({ id: 'user-1' });
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'test@example.com', isActive: true },
        select: { id: true },
      });
    });
  });

  describe('findActiveUserByRole', () => {
    it('should find active user by role', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'user-1' });

      const result = await repository.findActiveUserByRole('ADMIN');

      expect(result).toEqual({ id: 'user-1' });
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { role: 'ADMIN', isActive: true },
        select: { id: true },
      });
    });
  });

  describe('findLeadProjectManagerId', () => {
    it('should return PM id from lead', async () => {
      prisma.lead.findUnique.mockResolvedValue({ projectManagerId: 'pm-1' });

      const result = await repository.findLeadProjectManagerId('lead-1');

      expect(result).toBe('pm-1');
      expect(prisma.lead.findUnique).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        select: { projectManagerId: true },
      });
    });

    it('should return null when lead has no PM', async () => {
      prisma.lead.findUnique.mockResolvedValue({ projectManagerId: null });

      const result = await repository.findLeadProjectManagerId('lead-1');

      expect(result).toBeNull();
    });
  });

  describe('findTemplates', () => {
    it('should return all templates ordered', async () => {
      const templates = [{ id: 't1', stage: 'NEW_LEAD' }];
      prisma.taskTemplate.findMany.mockResolvedValue(templates);

      const result = await repository.findTemplates();

      expect(result).toEqual(templates);
      expect(prisma.taskTemplate.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ stage: 'asc' }, { sortOrder: 'asc' }],
      });
    });

    it('should filter by stage', async () => {
      prisma.taskTemplate.findMany.mockResolvedValue([]);

      await repository.findTemplates({ stage: 'NEW_LEAD' });

      expect(prisma.taskTemplate.findMany).toHaveBeenCalledWith({
        where: { stage: 'NEW_LEAD' },
        orderBy: [{ stage: 'asc' }, { sortOrder: 'asc' }],
      });
    });
  });

  describe('findTemplateById', () => {
    it('should return template by id', async () => {
      const template = { id: 't1', title: 'Template' };
      prisma.taskTemplate.findUnique.mockResolvedValue(template);

      const result = await repository.findTemplateById('t1');

      expect(result).toEqual(template);
    });
  });

  describe('createTemplate', () => {
    it('should create a template', async () => {
      const data = { title: 'New Template', stage: 'NEW_LEAD' };
      prisma.taskTemplate.create.mockResolvedValue({ id: 't1', ...data });

      const result = await repository.createTemplate(data);

      expect(result).toEqual(expect.objectContaining({ id: 't1' }));
    });
  });

  describe('updateTemplate', () => {
    it('should update a template', async () => {
      prisma.taskTemplate.update.mockResolvedValue({ id: 't1', title: 'Updated' });

      const result = await repository.updateTemplate('t1', { title: 'Updated' });

      expect(result).toEqual(expect.objectContaining({ title: 'Updated' }));
      expect(prisma.taskTemplate.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { title: 'Updated' },
      });
    });
  });

  describe('deleteTemplate', () => {
    it('should delete a template', async () => {
      prisma.taskTemplate.delete.mockResolvedValue({ id: 't1' });

      const result = await repository.deleteTemplate('t1');

      expect(result).toEqual({ id: 't1' });
      expect(prisma.taskTemplate.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
    });
  });
});
