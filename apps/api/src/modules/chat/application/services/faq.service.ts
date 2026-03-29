import { Injectable, Logger } from '@nestjs/common';
import { FaqEntry } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

export interface FaqSummary {
  id: string;
  question: string;
  answer: string;
  category: string | null;
}

@Injectable()
export class FaqService {
  private readonly logger = new Logger(FaqService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAnswer(query: string): Promise<{ question: string; answer: string } | null> {
    const q = query.toLowerCase().trim();

    // 1. Try exact keyword match
    const entries = await this.prisma.faqEntry.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

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
    return this.prisma.faqEntry.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, question: true, answer: true, category: true },
    });
  }

  async createFaq(data: { question: string; answer: string; keywords?: string[]; category?: string }) {
    return this.prisma.faqEntry.create({
      data: {
        question: data.question,
        answer: data.answer,
        keywords: data.keywords ?? [],
        category: data.category,
      },
    });
  }

  async updateFaq(id: string, data: { question?: string; answer?: string; keywords?: string[]; category?: string; isActive?: boolean }) {
    return this.prisma.faqEntry.update({ where: { id }, data });
  }

  async deleteFaq(id: string) {
    return this.prisma.faqEntry.delete({ where: { id } });
  }
}
