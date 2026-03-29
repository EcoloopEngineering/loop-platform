import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { FormField } from '../domain/entities/form.entity';

export interface CreateFormDto {
  name: string;
  slug: string;
  description?: string;
  fields: FormField[];
}

export interface UpdateFormDto {
  name?: string;
  slug?: string;
  description?: string;
  fields?: FormField[];
  status?: string;
}

@Injectable()
export class FormService {
  constructor(private readonly prisma: PrismaService) {}

  async listForms() {
    return this.prisma.form.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createForm(dto: CreateFormDto, userId: string) {
    return this.prisma.form.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        config: dto.fields as unknown as import('@prisma/client').Prisma.InputJsonValue,
        userId,
      },
    });
  }

  async updateForm(id: string, dto: UpdateFormDto) {
    return this.prisma.form.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.fields !== undefined && { config: dto.fields as unknown as import('@prisma/client').Prisma.InputJsonValue }),
        ...(dto.status !== undefined && { isActive: dto.status === 'PUBLISHED' }),
      },
    });
  }

  async getPublicForm(slug: string) {
    const form = await this.prisma.form.findFirst({
      where: { slug, isActive: true },
    });
    if (!form) {
      throw new NotFoundException(`Form with slug "${slug}" not found`);
    }
    return form;
  }

  async submitPublicForm(slug: string, data: Record<string, unknown>) {
    const form = await this.prisma.form.findFirst({
      where: { slug, isActive: true },
    });
    if (!form) {
      throw new NotFoundException(`Form with slug "${slug}" not found`);
    }

    return this.prisma.formSubmission.create({
      data: {
        formId: form.id,
        data: data as unknown as import('@prisma/client').Prisma.InputJsonValue,
      },
    });
  }
}
