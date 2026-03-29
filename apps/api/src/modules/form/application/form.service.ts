import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { FormField } from '../domain/entities/form.entity';
import {
  FORM_REPOSITORY,
  FormRepositoryPort,
} from './ports/form.repository.port';

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
  constructor(
    @Inject(FORM_REPOSITORY)
    private readonly formRepo: FormRepositoryPort,
  ) {}

  async listForms() {
    return this.formRepo.findAll();
  }

  async createForm(dto: CreateFormDto, userId: string) {
    return this.formRepo.create({
      name: dto.name,
      slug: dto.slug,
      config: dto.fields,
      userId,
    });
  }

  async updateForm(id: string, dto: UpdateFormDto) {
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.fields !== undefined) data.config = dto.fields;
    if (dto.status !== undefined) data.isActive = dto.status === 'PUBLISHED';

    return this.formRepo.update(id, data);
  }

  async getPublicForm(slug: string) {
    const form = await this.formRepo.findActiveBySlug(slug);
    if (!form) {
      throw new NotFoundException(`Form with slug "${slug}" not found`);
    }
    return form;
  }

  async submitPublicForm(slug: string, data: Record<string, unknown>) {
    const form = await this.formRepo.findActiveBySlug(slug);
    if (!form) {
      throw new NotFoundException(`Form with slug "${slug}" not found`);
    }

    return this.formRepo.createSubmission({
      formId: form.id,
      data,
    });
  }
}
