import { Test, TestingModule } from '@nestjs/testing';
import { TaskTemplateController } from './task-template.controller';
import { TaskTemplateService } from '../application/services/task-template.service';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

describe('TaskTemplateController', () => {
  let controller: TaskTemplateController;
  let service: jest.Mocked<TaskTemplateService>;

  beforeEach(async () => {
    const mockService = {
      list: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskTemplateController],
      providers: [
        { provide: TaskTemplateService, useValue: mockService },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TaskTemplateController>(TaskTemplateController);
    service = module.get(TaskTemplateService);
  });

  describe('list', () => {
    it('should delegate to service.list', async () => {
      const templates = [{ id: 'tmpl-1', stage: 'DESIGN_READY', title: 'Review design' }];
      service.list.mockResolvedValue(templates as any);

      const result = await controller.list();

      expect(service.list).toHaveBeenCalledWith({ stage: undefined });
      expect(result).toEqual(templates);
    });

    it('should pass stage filter to service', async () => {
      service.list.mockResolvedValue([]);

      await controller.list('DESIGN_READY');

      expect(service.list).toHaveBeenCalledWith({ stage: 'DESIGN_READY' });
    });
  });

  describe('create', () => {
    it('should delegate to service.create', async () => {
      const created = { id: 'tmpl-1', stage: 'CONNECTED', title: 'Schedule inspection' };
      service.create.mockResolvedValue(created as any);

      const result = await controller.create({
        stage: 'CONNECTED',
        title: 'Schedule inspection',
      });

      expect(service.create).toHaveBeenCalledWith({
        stage: 'CONNECTED',
        title: 'Schedule inspection',
      });
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    it('should delegate to service.update', async () => {
      service.update.mockResolvedValue({ id: 'tmpl-1', title: 'Updated title' } as any);

      const result = await controller.update('tmpl-1', { title: 'Updated title' });

      expect(service.update).toHaveBeenCalledWith('tmpl-1', { title: 'Updated title' });
      expect(result.title).toBe('Updated title');
    });
  });

  describe('remove', () => {
    it('should delegate to service.delete', async () => {
      service.delete.mockResolvedValue({ id: 'tmpl-1' } as any);

      await controller.remove('tmpl-1');

      expect(service.delete).toHaveBeenCalledWith('tmpl-1');
    });
  });
});
