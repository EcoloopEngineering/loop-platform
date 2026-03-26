import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TaskController } from './task.controller';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { createMockPrismaService, MockPrismaService } from '../../../test/prisma-mock.helper';

describe('TaskController', () => {
  let controller: TaskController;
  let prisma: MockPrismaService;
  let emitter: { emit: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    emitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: emitter },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TaskController>(TaskController);
  });

  describe('list', () => {
    it('should return tasks filtered by leadId', async () => {
      const tasks = [{ id: 't1', title: 'Task 1' }];
      prisma.task.findMany.mockResolvedValue(tasks);

      const result = await controller.list('lead-1', undefined, undefined);

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { leadId: 'lead-1' },
        }),
      );
      expect(result).toEqual(tasks);
    });

    it('should return tasks filtered by assigneeId and status', async () => {
      prisma.task.findMany.mockResolvedValue([]);

      await controller.list(undefined, 'user-1', 'OPEN');

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { assigneeId: 'user-1', status: 'OPEN' },
        }),
      );
    });

    it('should return all tasks when no filters', async () => {
      prisma.task.findMany.mockResolvedValue([]);

      await controller.list(undefined, undefined, undefined);

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });
  });

  describe('findOne', () => {
    it('should return task with subtasks', async () => {
      const task = { id: 't1', title: 'Task', subtasks: [] };
      prisma.task.findUnique.mockResolvedValue(task);

      const result = await controller.findOne('t1');
      expect(result).toEqual(task);
    });

    it('should throw NotFoundException when task not found', async () => {
      prisma.task.findUnique.mockResolvedValue(null);
      await expect(controller.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a task', async () => {
      const created = { id: 't1', title: 'New Task' };
      prisma.task.create.mockResolvedValue(created);

      const result = await controller.create({ title: 'New Task' });

      expect(prisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: 'New Task' }),
        }),
      );
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    it('should update a task', async () => {
      prisma.task.findUnique.mockResolvedValue({ id: 't1' });
      prisma.task.update.mockResolvedValue({ id: 't1', title: 'Updated' });

      const result = await controller.update('t1', { title: 'Updated' });

      expect(prisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 't1' },
          data: expect.objectContaining({ title: 'Updated' }),
        }),
      );
      expect(result).toEqual({ id: 't1', title: 'Updated' });
    });

    it('should throw NotFoundException when task not found', async () => {
      prisma.task.findUnique.mockResolvedValue(null);
      await expect(controller.update('bad-id', { title: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('complete', () => {
    it('should mark task as completed and emit event', async () => {
      prisma.task.findUnique.mockResolvedValue({ id: 't1' });
      prisma.task.update.mockResolvedValue({
        id: 't1',
        status: 'COMPLETED',
        leadId: 'lead-1',
        templateKey: 'tmpl-1',
      });

      const result = await controller.complete('t1', 'user-1');

      expect(prisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 't1' },
          data: expect.objectContaining({
            status: 'COMPLETED',
            completedById: 'user-1',
          }),
        }),
      );
      expect(emitter.emit).toHaveBeenCalledWith('task.completed', {
        taskId: 't1',
        leadId: 'lead-1',
        templateKey: 'tmpl-1',
        completedById: 'user-1',
      });
    });

    it('should throw NotFoundException when task not found', async () => {
      prisma.task.findUnique.mockResolvedValue(null);
      await expect(controller.complete('bad-id', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete by setting status to CANCELLED', async () => {
      prisma.task.findUnique.mockResolvedValue({ id: 't1' });
      prisma.task.update.mockResolvedValue({ id: 't1', status: 'CANCELLED' });

      const result = await controller.remove('t1');

      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { status: 'CANCELLED' },
      });
      expect(result.status).toBe('CANCELLED');
    });

    it('should throw NotFoundException when task not found', async () => {
      prisma.task.findUnique.mockResolvedValue(null);
      await expect(controller.remove('bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});
