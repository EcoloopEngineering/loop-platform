import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { FormRepositoryPort } from '../../application/ports/form.repository.port';

@Injectable()
export class PrismaFormRepository implements FormRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<any[]> {
    return this.prisma.form.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUserId(userId: string): Promise<any[]> {
    return this.prisma.form.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: {
    name: string;
    slug: string;
    config: unknown;
    userId: string;
  }): Promise<any> {
    return this.prisma.form.create({
      data: {
        name: data.name,
        slug: data.slug,
        config: data.config as Prisma.InputJsonValue,
        userId: data.userId,
      },
    });
  }

  async update(id: string, data: Record<string, unknown>): Promise<any> {
    return this.prisma.form.update({
      where: { id },
      data: data as any,
    });
  }

  async findActiveBySlug(slug: string): Promise<any | null> {
    return this.prisma.form.findFirst({
      where: { slug, isActive: true },
    });
  }

  async createSubmission(data: { formId: string; data: unknown }): Promise<any> {
    return this.prisma.formSubmission.create({
      data: {
        formId: data.formId,
        data: data.data as Prisma.InputJsonValue,
      },
    });
  }
}
