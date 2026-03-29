import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { FaqRepositoryPort } from '../../application/ports/faq.repository.port';

@Injectable()
export class PrismaFaqRepository implements FaqRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAllActive(): Promise<any[]> {
    return this.prisma.faqEntry.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      take: 200,
    });
  }

  async findAllActiveSummary(): Promise<{ id: string; question: string; answer: string; category: string | null }[]> {
    return this.prisma.faqEntry.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, question: true, answer: true, category: true },
    });
  }

  async create(data: {
    question: string;
    answer: string;
    keywords: string[];
    category?: string;
  }): Promise<any> {
    return this.prisma.faqEntry.create({
      data: {
        question: data.question,
        answer: data.answer,
        keywords: data.keywords,
        category: data.category,
      },
    });
  }

  async update(id: string, data: Record<string, unknown>): Promise<any> {
    return this.prisma.faqEntry.update({ where: { id }, data: data as any });
  }

  async delete(id: string): Promise<any> {
    return this.prisma.faqEntry.delete({ where: { id } });
  }
}
