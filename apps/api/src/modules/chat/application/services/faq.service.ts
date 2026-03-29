import { Injectable, Inject, Logger } from '@nestjs/common';
import { FaqEntry } from '@prisma/client';
import { TtlCache } from '../../../../common/utils/ttl-cache';
import {
  FAQ_REPOSITORY,
  FaqRepositoryPort,
} from '../ports/faq.repository.port';

export interface FaqSummary {
  id: string;
  question: string;
  answer: string;
  category: string | null;
}

@Injectable()
export class FaqService {
  private readonly logger = new Logger(FaqService.name);
  private readonly faqCache = new TtlCache<FaqEntry[]>(5 * 60 * 1000); // 5 min

  constructor(
    @Inject(FAQ_REPOSITORY)
    private readonly faqRepo: FaqRepositoryPort,
  ) {}

  async findAnswer(query: string): Promise<{ question: string; answer: string } | null> {
    const q = query.toLowerCase().trim();

    // 1. Try exact keyword match (with cache)
    let entries = this.faqCache.get();
    if (!entries) {
      entries = await this.faqRepo.findAllActive();
      this.faqCache.set(entries);
    }

    // Score each FAQ entry by keyword match
    let bestMatch: { entry: FaqEntry; score: number } | null = null;

    for (const entry of entries) {
      let score = 0;
      const keywords = entry.keywords.map((k: string) => k.toLowerCase());
      const questionWords = entry.question.toLowerCase().split(/\s+/);

      // Check keywords
      for (const kw of keywords) {
        if (q.includes(kw)) score += 3;
      }

      // Check question words
      for (const word of questionWords) {
        if (word.length > 3 && q.includes(word)) score += 1;
      }

      // Check if query contains significant part of the question
      if (entry.question.toLowerCase().includes(q) || q.includes(entry.question.toLowerCase())) {
        score += 5;
      }

      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { entry, score };
      }
    }

    if (bestMatch && bestMatch.score >= 2) {
      return { question: bestMatch.entry.question, answer: bestMatch.entry.answer };
    }

    return null;
  }

  async getAllFaqs(): Promise<FaqSummary[]> {
    return this.faqRepo.findAllActiveSummary();
  }

  async createFaq(data: { question: string; answer: string; keywords?: string[]; category?: string }) {
    const result = await this.faqRepo.create({
      question: data.question,
      answer: data.answer,
      keywords: data.keywords ?? [],
      category: data.category,
    });
    this.faqCache.invalidate();
    return result;
  }

  async updateFaq(id: string, data: { question?: string; answer?: string; keywords?: string[]; category?: string; isActive?: boolean }) {
    const result = await this.faqRepo.update(id, data);
    this.faqCache.invalidate();
    return result;
  }

  async deleteFaq(id: string) {
    const result = await this.faqRepo.delete(id);
    this.faqCache.invalidate();
    return result;
  }
}
