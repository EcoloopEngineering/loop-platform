export const FAQ_REPOSITORY = Symbol('FAQ_REPOSITORY');

export interface FaqRepositoryPort {
  findAllActive(): Promise<any[]>;

  findAllActiveSummary(): Promise<{ id: string; question: string; answer: string; category: string | null }[]>;

  create(data: {
    question: string;
    answer: string;
    keywords: string[];
    category?: string;
  }): Promise<any>;

  update(id: string, data: Record<string, unknown>): Promise<any>;

  delete(id: string): Promise<any>;
}
