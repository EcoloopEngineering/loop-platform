import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TaskTemplateService } from './task-template.service';
import { TASK_REPOSITORY, TaskRepositoryPort } from '../ports/task.repository.port';

describe('TaskTemplateService', () => {
  let service: TaskTemplateService;
  let taskRepo: jest.Mocked<Pick<
    TaskRepositoryPort,
    'findTemplates' | 'findTemplateById' | 'createTemplate' | 'updateTemplate' | 'deleteTemplate'
  >>;

  beforeEach(async () => {
    taskRepo = {
      findTemplates: jest.fn(),
      findTemplateById: jest.fn(),
      createTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskTemplateService,
        { provide: TASK_REPOSITORY, useValue: taskRepo },
      ],
    }).compile();

    service = module.get<TaskTemplateService>(TaskTemplateService);
  });

  describe('list', () => {
    it('should return all templates when no filter', async () => {
      const templates = [{ id: 'tmpl-1', stage: 'DESIGN_READY', title: 'Review design' }];
      taskRepo.findTemplates.mockResolvedValue(templates as any);

      const result = await service.list();

      expect(taskRepo.findTemplates).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(templates);
    });

    it('should filter templates by stage', async () => {
      taskRepo.findTemplates.mockResolvedValue([]);

      await service.list({ stage: 'DESIGN_READY' });

      expect(taskRepo.findTemplates).toHaveBeenCalledWith({ stage: 'DESIGN_READY' });
    });
  });

  describe('create', () => {
    it('should create a task template', async () => {
      const created = { id: 'tmpl-1', stage: 'CONNECTED', title: 'Schedule inspection' };
      taskRepo.createTemplate.mockResolvedValue(created as any);

      const result = await service.create({
        stage: 'CONNECTED',
        title: 'Schedule inspection',
      });

      expect(taskRepo.createTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'CONNECTED',
          title: 'Schedule inspection',
        }),
      );
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    it('should update a task template', async () => {
      taskRepo.findTemplateById.mockResolvedValue({ id: 'tmpl-1' } as any);
      taskRepo.updateTemplate.mockResolvedValue({ id: 'tmpl-1', title: 'Updated title' } as any);

      const result = await service.update('tmpl-1', { title: 'Updated title' });

      expect(taskRepo.updateTemplate).toHaveBeenCalledWith(
        'tmpl-1',
        expect.objectContaining({ title: 'Updated title' }),
      );
      expect(result).toEqual(expect.objectContaining({ title: 'Updated title' }));
    });

    it('should throw NotFoundException when template not found', async () => {
      taskRepo.findTemplateById.mockResolvedValue(null);
      await expect(service.update('bad-id', { title: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a task template', async () => {
      taskRepo.findTemplateById.mockResolvedValue({ id: 'tmpl-1' } as any);
      taskRepo.deleteTemplate.mockResolvedValue({ id: 'tmpl-1' } as any);

      await service.delete('tmpl-1');

      expect(taskRepo.deleteTemplate).toHaveBeenCalledWith('tmpl-1');
    });

    it('should throw NotFoundException when template not found', async () => {
      taskRepo.findTemplateById.mockResolvedValue(null);
      await expect(service.delete('bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});
