import { Test, TestingModule } from '@nestjs/testing';
import { TaskController } from './task.controller';
import { TaskService } from '../application/services/task.service';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

describe('TaskController', () => {
  let controller: TaskController;
  let taskService: jest.Mocked<TaskService>;

  beforeEach(async () => {
    taskService = {
      list: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      complete: jest.fn(),
      remove: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskController],
      providers: [{ provide: TaskService, useValue: taskService }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TaskController>(TaskController);
  });

  describe('list', () => {
    it('should delegate to TaskService with filters', async () => {
      const tasks = [{ id: 't1', title: 'Task 1' }];
      taskService.list.mockResolvedValue(tasks as any);

      const result = await controller.list('lead-1', undefined, undefined);

      expect(taskService.list).toHaveBeenCalledWith({
        leadId: 'lead-1',
        assigneeId: undefined,
        status: undefined,
      });
      expect(result).toEqual(tasks);
    });

    it('should pass all filter params to service', async () => {
      taskService.list.mockResolvedValue([]);

      await controller.list(undefined, 'user-1', 'OPEN');

      expect(taskService.list).toHaveBeenCalledWith({
        leadId: undefined,
        assigneeId: 'user-1',
        status: 'OPEN',
      });
    });
  });

  describe('findOne', () => {
    it('should delegate to TaskService', async () => {
      const task = { id: 't1', title: 'Task', subtasks: [] };
      taskService.findOne.mockResolvedValue(task as any);

      const result = await controller.findOne('t1');

      expect(taskService.findOne).toHaveBeenCalledWith('t1');
      expect(result).toEqual(task);
    });
  });

  describe('create', () => {
    it('should delegate to TaskService', async () => {
      const created = { id: 't1', title: 'New Task' };
      taskService.create.mockResolvedValue(created as any);

      const result = await controller.create({ title: 'New Task' });

      expect(taskService.create).toHaveBeenCalledWith({ title: 'New Task' });
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    it('should delegate to TaskService', async () => {
      taskService.update.mockResolvedValue({ id: 't1', title: 'Updated' } as any);

      const result = await controller.update('t1', { title: 'Updated' });

      expect(taskService.update).toHaveBeenCalledWith('t1', { title: 'Updated' });
      expect(result).toEqual({ id: 't1', title: 'Updated' });
    });
  });

  describe('complete', () => {
    it('should delegate to TaskService with userId', async () => {
      taskService.complete.mockResolvedValue({
        id: 't1',
        status: 'COMPLETED',
      } as any);

      const result = await controller.complete('t1', 'user-1');

      expect(taskService.complete).toHaveBeenCalledWith('t1', 'user-1');
      expect(result.status).toBe('COMPLETED');
    });
  });

  describe('remove', () => {
    it('should delegate to TaskService', async () => {
      taskService.remove.mockResolvedValue({ id: 't1', status: 'CANCELLED' } as any);

      const result = await controller.remove('t1');

      expect(taskService.remove).toHaveBeenCalledWith('t1');
      expect(result.status).toBe('CANCELLED');
    });
  });
});
