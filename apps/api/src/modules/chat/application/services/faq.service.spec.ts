import { Test, TestingModule } from '@nestjs/testing';
import { FaqService } from './faq.service';
import { FAQ_REPOSITORY } from '../ports/faq.repository.port';

describe('FaqService', () => {
  let service: FaqService;
  let mockRepo: {
    findAllActive: jest.Mock;
    findAllActiveSummary: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    mockRepo = {
      findAllActive: jest.fn(),
      findAllActiveSummary: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FaqService,
        { provide: FAQ_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<FaqService>(FaqService);
  });

  describe('findAnswer', () => {
    it('should return a match when keyword matches with score >= 2', async () => {
      mockRepo.findAllActive.mockResolvedValue([
        {
          id: '1',
          question: 'How do I install solar panels?',
          answer: 'Contact our team for installation.',
          keywords: ['install', 'solar', 'panels'],
          isActive: true,
          sortOrder: 1,
        },
      ]);

      const result = await service.findAnswer('install solar');

      expect(result).toEqual({
        question: 'How do I install solar panels?',
        answer: 'Contact our team for installation.',
      });
    });

    it('should return null when no FAQ entries match', async () => {
      mockRepo.findAllActive.mockResolvedValue([
        {
          id: '1',
          question: 'How do I install solar panels?',
          answer: 'Contact our team.',
          keywords: ['install', 'solar'],
          isActive: true,
          sortOrder: 1,
        },
      ]);

      const result = await service.findAnswer('xyz random unrelated');

      expect(result).toBeNull();
    });

    it('should return null when no FAQ entries exist', async () => {
      mockRepo.findAllActive.mockResolvedValue([]);

      const result = await service.findAnswer('anything');

      expect(result).toBeNull();
    });

    it('should return the best match when multiple entries match', async () => {
      mockRepo.findAllActive.mockResolvedValue([
        {
          id: '1',
          question: 'What is solar energy?',
          answer: 'Energy from the sun.',
          keywords: ['solar', 'energy'],
          isActive: true,
          sortOrder: 1,
        },
        {
          id: '2',
          question: 'How much does solar installation cost?',
          answer: 'It depends on system size.',
          keywords: ['solar', 'cost', 'price', 'installation'],
          isActive: true,
          sortOrder: 2,
        },
      ]);

      const result = await service.findAnswer('solar installation cost');

      expect(result).toEqual({
        question: 'How much does solar installation cost?',
        answer: 'It depends on system size.',
      });
    });

    it('should match when query contains the full question', async () => {
      mockRepo.findAllActive.mockResolvedValue([
        {
          id: '1',
          question: 'pricing',
          answer: 'Check our pricing page.',
          keywords: ['pricing'],
          isActive: true,
          sortOrder: 1,
        },
      ]);

      const result = await service.findAnswer('pricing');

      expect(result).toEqual({
        question: 'pricing',
        answer: 'Check our pricing page.',
      });
    });
  });

  describe('getAllFaqs', () => {
    it('should return all active FAQs', async () => {
      const faqs = [
        { id: '1', question: 'Q1', answer: 'A1', category: 'General' },
      ];
      mockRepo.findAllActiveSummary.mockResolvedValue(faqs);

      const result = await service.getAllFaqs();

      expect(result).toEqual(faqs);
      expect(mockRepo.findAllActiveSummary).toHaveBeenCalled();
    });
  });

  describe('createFaq', () => {
    it('should create a FAQ entry with defaults', async () => {
      const created = { id: '1', question: 'Q', answer: 'A', keywords: [], category: null };
      mockRepo.create.mockResolvedValue(created);

      const result = await service.createFaq({ question: 'Q', answer: 'A' });

      expect(result).toEqual(created);
      expect(mockRepo.create).toHaveBeenCalledWith({
        question: 'Q',
        answer: 'A',
        keywords: [],
        category: undefined,
      });
    });
  });

  describe('updateFaq', () => {
    it('should update a FAQ entry', async () => {
      mockRepo.update.mockResolvedValue({ id: '1', answer: 'Updated' });

      await service.updateFaq('1', { answer: 'Updated' });

      expect(mockRepo.update).toHaveBeenCalledWith('1', { answer: 'Updated' });
    });
  });

  describe('deleteFaq', () => {
    it('should delete a FAQ entry by id', async () => {
      mockRepo.delete.mockResolvedValue({ id: '1' });

      await service.deleteFaq('1');

      expect(mockRepo.delete).toHaveBeenCalledWith('1');
    });
  });
});
