import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FormController } from './form.controller';
import { FormService } from '../application/form.service';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { UserRole } from '@loop/shared';

describe('FormController', () => {
  let controller: FormController;
  let mockFormService: {
    listForms: jest.Mock;
    createForm: jest.Mock;
    updateForm: jest.Mock;
    getPublicForm: jest.Mock;
    submitPublicForm: jest.Mock;
  };

  const mockUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'test@ecoloop.us',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.ADMIN,
    isActive: true,
    profileImage: null,
  };

  beforeEach(async () => {
    mockFormService = {
      listForms: jest.fn(),
      createForm: jest.fn(),
      updateForm: jest.fn(),
      getPublicForm: jest.fn(),
      submitPublicForm: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FormController],
      providers: [
        { provide: FormService, useValue: mockFormService },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FormController>(FormController);
  });

  describe('listForms', () => {
    it('should return all forms', async () => {
      const forms = [{ id: 'f1', name: 'Contact Form' }];
      mockFormService.listForms.mockResolvedValue(forms);

      const result = await controller.listForms();

      expect(result).toEqual(forms);
      expect(mockFormService.listForms).toHaveBeenCalled();
    });
  });

  describe('createForm', () => {
    it('should create a new form', async () => {
      const dto = { name: 'New Form', slug: 'new-form', fields: [] };
      const created = { id: 'f1', ...dto };
      mockFormService.createForm.mockResolvedValue(created);

      const result = await controller.createForm(dto, mockUser);

      expect(result).toEqual(created);
      expect(mockFormService.createForm).toHaveBeenCalledWith(dto, 'user-1');
    });
  });

  describe('updateForm', () => {
    it('should update form fields', async () => {
      const updated = { id: 'f1', name: 'Updated' };
      mockFormService.updateForm.mockResolvedValue(updated);

      const result = await controller.updateForm('f1', { name: 'Updated' });

      expect(result).toEqual(updated);
      expect(mockFormService.updateForm).toHaveBeenCalledWith('f1', { name: 'Updated' });
    });

    it('should set isActive true when status is PUBLISHED', async () => {
      mockFormService.updateForm.mockResolvedValue({ id: 'f1', isActive: true });

      await controller.updateForm('f1', { status: 'PUBLISHED' });

      expect(mockFormService.updateForm).toHaveBeenCalledWith('f1', { status: 'PUBLISHED' });
    });
  });

  describe('getPublicForm', () => {
    it('should return a published form by slug', async () => {
      const form = { id: 'f1', slug: 'contact', isActive: true };
      mockFormService.getPublicForm.mockResolvedValue(form);

      const result = await controller.getPublicForm('contact');

      expect(result).toEqual(form);
      expect(mockFormService.getPublicForm).toHaveBeenCalledWith('contact');
    });

    it('should throw NotFoundException when form not found', async () => {
      mockFormService.getPublicForm.mockRejectedValue(new NotFoundException());

      await expect(controller.getPublicForm('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('submitPublicForm', () => {
    it('should create a form submission', async () => {
      const submission = { id: 's1', formId: 'f1', data: { name: 'John' } };
      mockFormService.submitPublicForm.mockResolvedValue(submission);

      const result = await controller.submitPublicForm('contact', { name: 'John' });

      expect(result).toEqual(submission);
      expect(mockFormService.submitPublicForm).toHaveBeenCalledWith('contact', { name: 'John' });
    });

    it('should throw NotFoundException when submitting to non-existent form', async () => {
      mockFormService.submitPublicForm.mockRejectedValue(new NotFoundException());

      await expect(
        controller.submitPublicForm('nonexistent', { name: 'John' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
