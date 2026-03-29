import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TaskTemplateService } from './task-template.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../../../test/prisma-mock.helper';

describe('TaskTemplateService', () => {
  let service: TaskTemplateService;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskTemplateService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TaskTemplateService>(TaskTemplateService);
  });

  describe('list', () => {
    it('should return all templates when no filter', async () => {
      const templates = [{ id: 'tmpl-1', stage: 'DESIGN_READY', title: 'Review design' }];
      prisma.taskTemplate.findMany.mockResolvedValue(templates);

      const result = await service.list();

      expect(prisma.taskTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
      expect(result).toEqual(templates);
    });

    it('should filter templates by stage', async () => {
      prisma.taskTemplate.findMany.mockResolvedValue([]);

      await service.list({ stage: 'DESIGN_READY' });

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

      const result = await service.create({
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

      const result = await service.update('tmpl-1', { title: 'Updated title' });

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
      await expect(service.update('bad-id', { title: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a task template', async () => {
      prisma.taskTemplate.findUnique.mockResolvedValue({ id: 'tmpl-1' });
      prisma.taskTemplate.delete.mockResolvedValue({ id: 'tmpl-1' });

      await service.delete('tmpl-1');

      expect(prisma.taskTemplate.delete).toHaveBeenCalledWith({ where: { id: 'tmpl-1' } });
    });

    it('should throw NotFoundException when template not found', async () => {
      prisma.taskTemplate.findUnique.mockResolvedValue(null);
      await expect(service.delete('bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});
