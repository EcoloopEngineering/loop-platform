import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FormController } from './form.controller';
import { FormService } from '../application/form.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { UserRole } from '@loop/shared';

describe('FormController', () => {
  let controller: FormController;
  let prisma: {
    form: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    formSubmission: {
      create: jest.Mock;
    };
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
    prisma = {
      form: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      formSubmission: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FormController],
      providers: [
        FormService,
        { provide: PrismaService, useValue: prisma },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FormController>(FormController);
  });

  describe('listForms', () => {
    it('should return all forms ordered by createdAt desc', async () => {
      const forms = [{ id: 'f1', name: 'Contact Form' }];
      prisma.form.findMany.mockResolvedValue(forms);

      const result = await controller.listForms();

      expect(result).toEqual(forms);
      expect(prisma.form.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('createForm', () => {
    it('should create a new form', async () => {
      const dto = { name: 'New Form', slug: 'new-form', fields: [] };
      const created = { id: 'f1', ...dto };
      prisma.form.create.mockResolvedValue(created);

      const result = await controller.createForm(dto, mockUser);

      expect(result).toEqual(created);
      expect(prisma.form.create).toHaveBeenCalledWith({
        data: {
          name: 'New Form',
          slug: 'new-form',
          config: [],
          userId: 'user-1',
        },
      });
    });
  });

  describe('updateForm', () => {
    it('should update form fields', async () => {
      const updated = { id: 'f1', name: 'Updated' };
      prisma.form.update.mockResolvedValue(updated);

      const result = await controller.updateForm('f1', { name: 'Updated' });

      expect(result).toEqual(updated);
      expect(prisma.form.update).toHaveBeenCalledWith({
        where: { id: 'f1' },
        data: { name: 'Updated' },
      });
    });

    it('should set isActive true when status is PUBLISHED', async () => {
      prisma.form.update.mockResolvedValue({ id: 'f1', isActive: true });

      await controller.updateForm('f1', { status: 'PUBLISHED' });

      expect(prisma.form.update).toHaveBeenCalledWith({
        where: { id: 'f1' },
        data: { isActive: true },
      });
    });
  });

  describe('getPublicForm', () => {
    it('should return a published form by slug', async () => {
      const form = { id: 'f1', slug: 'contact', isActive: true };
      prisma.form.findFirst.mockResolvedValue(form);

      const result = await controller.getPublicForm('contact');

      expect(result).toEqual(form);
      expect(prisma.form.findFirst).toHaveBeenCalledWith({
        where: { slug: 'contact', isActive: true },
      });
    });

    it('should throw NotFoundException when form not found', async () => {
      prisma.form.findFirst.mockResolvedValue(null);

      await expect(controller.getPublicForm('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('submitPublicForm', () => {
    it('should create a form submission', async () => {
      const form = { id: 'f1', slug: 'contact', isActive: true };
      const submission = { id: 's1', formId: 'f1', data: { name: 'John' } };
      prisma.form.findFirst.mockResolvedValue(form);
      prisma.formSubmission.create.mockResolvedValue(submission);

      const result = await controller.submitPublicForm('contact', { name: 'John' });

      expect(result).toEqual(submission);
      expect(prisma.formSubmission.create).toHaveBeenCalledWith({
        data: { formId: 'f1', data: { name: 'John' } },
      });
    });

    it('should throw NotFoundException when submitting to non-existent form', async () => {
      prisma.form.findFirst.mockResolvedValue(null);

      await expect(
        controller.submitPublicForm('nonexistent', { name: 'John' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
