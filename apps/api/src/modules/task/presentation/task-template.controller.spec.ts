import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TaskTemplateController } from './task-template.controller';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { createMockPrismaService, MockPrismaService } from '../../../test/prisma-mock.helper';

describe('TaskTemplateController', () => {
  let controller: TaskTemplateController;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskTemplateController],
      providers: [
        { provide: PrismaService, useValue: prisma },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TaskTemplateController>(TaskTemplateController);
  });

  describe('list', () => {
    it('should return all templates', async () => {
      const templates = [{ id: 'tmpl-1', stage: 'DESIGN_READY', title: 'Review design' }];
      prisma.taskTemplate.findMany.mockResolvedValue(templates);

      const result = await controller.list();

      expect(prisma.taskTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
      expect(result).toEqual(templates);
    });

    it('should filter templates by stage', async () => {
      prisma.taskTemplate.findMany.mockResolvedValue([]);

      await controller.list('DESIGN_READY');

      expect(prisma.taskTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stage: 'DESIGN_READY' },
        }),
      );
    });
  });

  describe('create', () => {
    it('should create a task template', async () => {
      const created = { id: 'tmpl-1', stage: 'CONNECTED', title: 'Schedule inspection' };
      prisma.taskTemplate.create.mockResolvedValue(created);

      const result = await controller.create({
        stage: 'CONNECTED',
        title: 'Schedule inspection',
      });

      expect(prisma.taskTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stage: 'CONNECTED',
            title: 'Schedule inspection',
          }),
        }),
      );
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    it('should update a task template', async () => {
      prisma.taskTemplate.findUnique.mockResolvedValue({ id: 'tmpl-1' });
      prisma.taskTemplate.update.mockResolvedValue({ id: 'tmpl-1', title: 'Updated title' });

      const result = await controller.update('tmpl-1', { title: 'Updated title' });

      expect(prisma.taskTemplate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tmpl-1' },
          data: expect.objectContaining({ title: 'Updated title' }),
        }),
      );
      expect(result.title).toBe('Updated title');
    });

    it('should throw NotFoundException when template not found', async () => {
      prisma.taskTemplate.findUnique.mockResolvedValue(null);
      await expect(controller.update('bad-id', { title: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a task template', async () => {
      prisma.taskTemplate.findUnique.mockResolvedValue({ id: 'tmpl-1' });
      prisma.taskTemplate.delete.mockResolvedValue({ id: 'tmpl-1' });

      const result = await controller.remove('tmpl-1');

      expect(prisma.taskTemplate.delete).toHaveBeenCalledWith({ where: { id: 'tmpl-1' } });
    });

    it('should throw NotFoundException when template not found', async () => {
      prisma.taskTemplate.findUnique.mockResolvedValue(null);
      await expect(controller.remove('bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});
