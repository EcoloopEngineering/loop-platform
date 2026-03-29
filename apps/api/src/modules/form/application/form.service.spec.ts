import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FormService } from './form.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../../test/prisma-mock.helper';

describe('FormService', () => {
  let service: FormService;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<FormService>(FormService);
  });

  describe('listForms', () => {
    it('should return all forms ordered by createdAt desc', async () => {
      const forms = [{ id: 'f1', name: 'Form 1' }];
      prisma.form.findMany.mockResolvedValue(forms);

      const result = await service.listForms();

      expect(prisma.form.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(forms);
    });
  });

  describe('createForm', () => {
    it('should create a form with the given data', async () => {
      const created = { id: 'f1', name: 'My Form', slug: 'my-form' };
      prisma.form.create.mockResolvedValue(created);

      const result = await service.createForm(
        { name: 'My Form', slug: 'my-form', fields: [] },
        'user-1',
      );

      expect(prisma.form.create).toHaveBeenCalledWith({
        data: {
          name: 'My Form',
          slug: 'my-form',
          config: [],
          userId: 'user-1',
        },
      });
      expect(result).toEqual(created);
    });
  });

  describe('updateForm', () => {
    it('should update only provided fields', async () => {
      prisma.form.update.mockResolvedValue({ id: 'f1', name: 'Updated' });

      const result = await service.updateForm('f1', { name: 'Updated' });

      expect(prisma.form.update).toHaveBeenCalledWith({
        where: { id: 'f1' },
        data: { name: 'Updated' },
      });
      expect(result.name).toBe('Updated');
    });

    it('should set isActive true when status is PUBLISHED', async () => {
      prisma.form.update.mockResolvedValue({ id: 'f1', isActive: true });

      await service.updateForm('f1', { status: 'PUBLISHED' });

      expect(prisma.form.update).toHaveBeenCalledWith({
        where: { id: 'f1' },
        data: { isActive: true },
      });
    });
  });

  describe('getPublicForm', () => {
    it('should return a published form by slug', async () => {
      const form = { id: 'f1', slug: 'test', isActive: true };
      prisma.form.findFirst.mockResolvedValue(form);

      const result = await service.getPublicForm('test');

      expect(prisma.form.findFirst).toHaveBeenCalledWith({
        where: { slug: 'test', isActive: true },
      });
      expect(result).toEqual(form);
    });

    it('should throw NotFoundException when form not found', async () => {
      prisma.form.findFirst.mockResolvedValue(null);

      await expect(service.getPublicForm('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('submitPublicForm', () => {
    it('should create a form submission', async () => {
      const form = { id: 'f1', slug: 'test', isActive: true };
      prisma.form.findFirst.mockResolvedValue(form);
      const submission = { id: 's1', formId: 'f1', data: { name: 'John' } };
      prisma.formSubmission.create.mockResolvedValue(submission);

      const result = await service.submitPublicForm('test', { name: 'John' });

      expect(prisma.formSubmission.create).toHaveBeenCalledWith({
        data: { formId: 'f1', data: { name: 'John' } },
      });
      expect(result).toEqual(submission);
    });

    it('should throw NotFoundException when form not found', async () => {
      prisma.form.findFirst.mockResolvedValue(null);

      await expect(
        service.submitPublicForm('missing', { name: 'John' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
