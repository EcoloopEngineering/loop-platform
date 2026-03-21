export enum FormStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'select' | 'checkbox' | 'textarea' | 'number';
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export class FormEntity {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  fields: FormField[];
  status: FormStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<FormEntity>) {
    Object.assign(this, partial);
  }

  publish(): void {
    this.status = FormStatus.PUBLISHED;
    this.updatedAt = new Date();
  }

  archive(): void {
    this.status = FormStatus.ARCHIVED;
    this.updatedAt = new Date();
  }
}
