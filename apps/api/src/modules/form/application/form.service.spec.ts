import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FormService } from './form.service';
import { FORM_REPOSITORY } from './ports/form.repository.port';

describe('FormService', () => {
  let service: FormService;
  let mockRepo: {
    findAll: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    findActiveBySlug: jest.Mock;
    createSubmission: jest.Mock;
  };

  beforeEach(async () => {
    mockRepo = {
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findActiveBySlug: jest.fn(),
      createSubmission: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormService,
        { provide: FORM_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<FormService>(FormService);
  });

  describe('listForms', () => {
    it('should return all forms', async () => {
      const forms = [{ id: 'f1', name: 'Form 1' }];
      mockRepo.findAll.mockResolvedValue(forms);

      const result = await service.listForms();

      expect(mockRepo.findAll).toHaveBeenCalled();
      expect(result).toEqual(forms);
    });
  });

  describe('createForm', () => {
    it('should create a form with the given data', async () => {
      const created = { id: 'f1', name: 'My Form', slug: 'my-form' };
      mockRepo.create.mockResolvedValue(created);

      const result = await service.createForm(
        { name: 'My Form', slug: 'my-form', fields: [] },
        'user-1',
      );

      expect(mockRepo.create).toHaveBeenCalledWith({
        name: 'My Form',
        slug: 'my-form',
        config: [],
        userId: 'user-1',
      });
      expect(result).toEqual(created);
    });
  });

  describe('updateForm', () => {
    it('should update only provided fields', async () => {
      mockRepo.update.mockResolvedValue({ id: 'f1', name: 'Updated' });

      const result = await service.updateForm('f1', { name: 'Updated' });

      expect(mockRepo.update).toHaveBeenCalledWith('f1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('should set isActive true when status is PUBLISHED', async () => {
      mockRepo.update.mockResolvedValue({ id: 'f1', isActive: true });

      await service.updateForm('f1', { status: 'PUBLISHED' });

      expect(mockRepo.update).toHaveBeenCalledWith('f1', { isActive: true });
    });
  });

  describe('getPublicForm', () => {
    it('should return a published form by slug', async () => {
      const form = { id: 'f1', slug: 'test', isActive: true };
      mockRepo.findActiveBySlug.mockResolvedValue(form);

      const result = await service.getPublicForm('test');

      expect(mockRepo.findActiveBySlug).toHaveBeenCalledWith('test');
      expect(result).toEqual(form);
    });

    it('should throw NotFoundException when form not found', async () => {
      mockRepo.findActiveBySlug.mockResolvedValue(null);

      await expect(service.getPublicForm('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('submitPublicForm', () => {
    it('should create a form submission', async () => {
      const form = { id: 'f1', slug: 'test', isActive: true };
      mockRepo.findActiveBySlug.mockResolvedValue(form);
      const submission = { id: 's1', formId: 'f1', data: { name: 'John' } };
      mockRepo.createSubmission.mockResolvedValue(submission);

      const result = await service.submitPublicForm('test', { name: 'John' });

      expect(mockRepo.createSubmission).toHaveBeenCalledWith({
        formId: 'f1',
        data: { name: 'John' },
      });
      expect(result).toEqual(submission);
    });

    it('should throw NotFoundException when form not found', async () => {
      mockRepo.findActiveBySlug.mockResolvedValue(null);

      await expect(
        service.submitPublicForm('missing', { name: 'John' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
