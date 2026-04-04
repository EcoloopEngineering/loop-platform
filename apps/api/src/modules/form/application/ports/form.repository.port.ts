export const FORM_REPOSITORY = Symbol('FORM_REPOSITORY');

export interface FormRepositoryPort {
  findAll(): Promise<any[]>;
  findByUserId(userId: string): Promise<any[]>;

  create(data: {
    name: string;
    slug: string;
    config: unknown;
    userId: string;
  }): Promise<any>;

  update(id: string, data: Record<string, unknown>): Promise<any>;

  findActiveBySlug(slug: string): Promise<any | null>;

  createSubmission(data: { formId: string; data: unknown }): Promise<any>;
}
