import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TaskService } from './task.service';
import { TASK_REPOSITORY, TaskRepositoryPort } from '../ports/task.repository.port';

describe('TaskService', () => {
  let service: TaskService;
  let repo: jest.Mocked<TaskRepositoryPort>;
  let emitter: { emit: jest.Mock };

  beforeEach(async () => {
    repo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByIdSimple: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      complete: jest.fn(),
      cancel: jest.fn(),
    };
    emitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        { provide: TASK_REPOSITORY, useValue: repo },
        { provide: EventEmitter2, useValue: emitter },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
  });

  describe('list', () => {
    it('should return tasks from repository with filters', async () => {
      const tasks = [{ id: 't1', title: 'Task 1' }];
      repo.findAll.mockResolvedValue(tasks as any);

      const result = await service.list({ leadId: 'lead-1' });

      expect(repo.findAll).toHaveBeenCalledWith({ leadId: 'lead-1' });
      expect(result).toEqual(tasks);
    });

    it('should return all tasks when no filters', async () => {
      repo.findAll.mockResolvedValue([]);

      const result = await service.list({});

      expect(repo.findAll).toHaveBeenCalledWith({});
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return task from repository', async () => {
      const task = { id: 't1', title: 'Task', subtasks: [] };
      repo.findById.mockResolvedValue(task as any);

      const result = await service.findOne('t1');

      expect(repo.findById).toHaveBeenCalledWith('t1');
      expect(result).toEqual(task);
    });

    it('should throw NotFoundException when task not found', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a task via repository', async () => {
      const created = { id: 't1', title: 'New Task' };
      repo.create.mockResolvedValue(created as any);

      const result = await service.create({ title: 'New Task' });

      expect(repo.create).toHaveBeenCalledWith({ title: 'New Task' });
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    it('should update a task via repository', async () => {
      repo.findByIdSimple.mockResolvedValue({ id: 't1' } as any);
      repo.update.mockResolvedValue({ id: 't1', title: 'Updated' } as any);

      const result = await service.update('t1', { title: 'Updated' });

      expect(repo.findByIdSimple).toHaveBeenCalledWith('t1');
      expect(repo.update).toHaveBeenCalledWith('t1', { title: 'Updated' });
      expect(result).toEqual({ id: 't1', title: 'Updated' });
    });

    it('should throw NotFoundException when task not found', async () => {
      repo.findByIdSimple.mockResolvedValue(null);

      await expect(service.update('bad-id', { title: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('should convert dueDate string to Date object', async () => {
      repo.findByIdSimple.mockResolvedValue({ id: 't1' } as any);
      repo.update.mockResolvedValue({ id: 't1' } as any);

      await service.update('t1', { dueDate: '2026-04-01' });

      expect(repo.update).toHaveBeenCalledWith('t1', {
        dueDate: new Date('2026-04-01'),
      });
    });

    it('should only include defined fields in update data', async () => {
      repo.findByIdSimple.mockResolvedValue({ id: 't1' } as any);
      repo.update.mockResolvedValue({ id: 't1' } as any);

      await service.update('t1', { title: 'New', priority: 5 });

      expect(repo.update).toHaveBeenCalledWith('t1', { title: 'New', priority: 5 });
    });
  });

  describe('complete', () => {
    it('should mark task as completed and emit event', async () => {
      repo.findByIdSimple.mockResolvedValue({ id: 't1' } as any);
      repo.complete.mockResolvedValue({
        id: 't1',
        status: 'COMPLETED',
        leadId: 'lead-1',
        templateKey: 'tmpl-1',
      } as any);

      const result = await service.complete('t1', 'user-1');

      expect(repo.findByIdSimple).toHaveBeenCalledWith('t1');
      expect(repo.complete).toHaveBeenCalledWith('t1', 'user-1');
      expect(emitter.emit).toHaveBeenCalledWith('task.completed', {
        taskId: 't1',
        leadId: 'lead-1',
        templateKey: 'tmpl-1',
        completedById: 'user-1',
      });
      expect(result.status).toBe('COMPLETED');
    });

    it('should throw NotFoundException when task not found', async () => {
      repo.findByIdSimple.mockResolvedValue(null);

      await expect(service.complete('bad-id', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete by cancelling via repository', async () => {
      repo.findByIdSimple.mockResolvedValue({ id: 't1' } as any);
      repo.cancel.mockResolvedValue({ id: 't1', status: 'CANCELLED' } as any);

      const result = await service.remove('t1');

      expect(repo.findByIdSimple).toHaveBeenCalledWith('t1');
      expect(repo.cancel).toHaveBeenCalledWith('t1');
      expect(result.status).toBe('CANCELLED');
    });

    it('should throw NotFoundException when task not found', async () => {
      repo.findByIdSimple.mockResolvedValue(null);

      await expect(service.remove('bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});
