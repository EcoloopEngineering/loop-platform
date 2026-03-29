import { Test, TestingModule } from '@nestjs/testing';
import { PrismaFormRepository } from './prisma-form.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('PrismaFormRepository', () => {
  let repository: PrismaFormRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaFormRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<PrismaFormRepository>(PrismaFormRepository);
  });

  describe('findAll', () => {
    it('should return all forms ordered by createdAt', async () => {
      const forms = [{ id: 'f1', name: 'Contact Form' }];
      prisma.form.findMany.mockResolvedValue(forms);

      const result = await repository.findAll();

      expect(result).toEqual(forms);
      expect(prisma.form.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('create', () => {
    it('should create a form', async () => {
      const data = { name: 'Lead Form', slug: 'lead-form', config: { fields: [] }, userId: 'user-1' };
      prisma.form.create.mockResolvedValue({ id: 'f1', ...data });

      const result = await repository.create(data);

      expect(result).toEqual(expect.objectContaining({ id: 'f1' }));
      expect(prisma.form.create).toHaveBeenCalledWith({
        data: {
          name: 'Lead Form',
          slug: 'lead-form',
          config: { fields: [] },
          userId: 'user-1',
        },
      });
    });
  });

  describe('update', () => {
    it('should update a form', async () => {
      prisma.form.update.mockResolvedValue({ id: 'f1', name: 'Updated' });

      const result = await repository.update('f1', { name: 'Updated' });

      expect(result).toEqual(expect.objectContaining({ name: 'Updated' }));
      expect(prisma.form.update).toHaveBeenCalledWith({
        where: { id: 'f1' },
        data: { name: 'Updated' },
      });
    });
  });

  describe('findActiveBySlug', () => {
    it('should return active form by slug', async () => {
      const form = { id: 'f1', slug: 'lead-form', isActive: true };
      prisma.form.findFirst.mockResolvedValue(form);

      const result = await repository.findActiveBySlug('lead-form');

      expect(result).toEqual(form);
      expect(prisma.form.findFirst).toHaveBeenCalledWith({
        where: { slug: 'lead-form', isActive: true },
      });
    });

    it('should return null when form not found', async () => {
      prisma.form.findFirst.mockResolvedValue(null);

      const result = await repository.findActiveBySlug('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createSubmission', () => {
    it('should create a form submission', async () => {
      const data = { formId: 'f1', data: { firstName: 'John', email: 'john@test.com' } };
      prisma.formSubmission.create.mockResolvedValue({ id: 'sub-1', ...data });

      const result = await repository.createSubmission(data);

      expect(result).toEqual(expect.objectContaining({ id: 'sub-1' }));
      expect(prisma.formSubmission.create).toHaveBeenCalledWith({
        data: {
          formId: 'f1',
          data: { firstName: 'John', email: 'john@test.com' },
        },
      });
    });
  });
});
