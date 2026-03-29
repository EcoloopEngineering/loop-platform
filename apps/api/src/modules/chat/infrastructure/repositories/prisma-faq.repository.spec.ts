import { Test, TestingModule } from '@nestjs/testing';
import { PrismaFaqRepository } from './prisma-faq.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('PrismaFaqRepository', () => {
  let repository: PrismaFaqRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaFaqRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<PrismaFaqRepository>(PrismaFaqRepository);
  });

  describe('findAllActive', () => {
    it('should return active FAQs ordered by sortOrder', async () => {
      const faqs = [{ id: 'faq-1', question: 'Q1' }];
      prisma.faqEntry.findMany.mockResolvedValue(faqs);

      const result = await repository.findAllActive();

      expect(result).toEqual(faqs);
      expect(prisma.faqEntry.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        take: 200,
      });
    });
  });

  describe('findAllActiveSummary', () => {
    it('should return active FAQs with selected fields', async () => {
      const faqs = [{ id: 'faq-1', question: 'Q1', answer: 'A1', category: 'General' }];
      prisma.faqEntry.findMany.mockResolvedValue(faqs);

      const result = await repository.findAllActiveSummary();

      expect(result).toEqual(faqs);
      expect(prisma.faqEntry.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, question: true, answer: true, category: true },
      });
    });
  });

  describe('create', () => {
    it('should create a FAQ entry', async () => {
      const data = { question: 'What is solar?', answer: 'Clean energy', keywords: ['solar', 'energy'] };
      prisma.faqEntry.create.mockResolvedValue({ id: 'faq-1', ...data });

      const result = await repository.create(data);

      expect(result).toEqual(expect.objectContaining({ id: 'faq-1' }));
      expect(prisma.faqEntry.create).toHaveBeenCalledWith({
        data: {
          question: 'What is solar?',
          answer: 'Clean energy',
          keywords: ['solar', 'energy'],
          category: undefined,
        },
      });
    });

    it('should create with category', async () => {
      const data = { question: 'Q', answer: 'A', keywords: ['k'], category: 'General' };
      prisma.faqEntry.create.mockResolvedValue({ id: 'faq-2', ...data });

      await repository.create(data);

      expect(prisma.faqEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ category: 'General' }),
      });
    });
  });

  describe('update', () => {
    it('should update a FAQ entry', async () => {
      prisma.faqEntry.update.mockResolvedValue({ id: 'faq-1', answer: 'Updated answer' });

      const result = await repository.update('faq-1', { answer: 'Updated answer' });

      expect(result).toEqual(expect.objectContaining({ answer: 'Updated answer' }));
      expect(prisma.faqEntry.update).toHaveBeenCalledWith({
        where: { id: 'faq-1' },
        data: { answer: 'Updated answer' },
      });
    });
  });

  describe('delete', () => {
    it('should delete a FAQ entry', async () => {
      prisma.faqEntry.delete.mockResolvedValue({ id: 'faq-1' });

      const result = await repository.delete('faq-1');

      expect(result).toEqual({ id: 'faq-1' });
      expect(prisma.faqEntry.delete).toHaveBeenCalledWith({ where: { id: 'faq-1' } });
    });
  });
});
