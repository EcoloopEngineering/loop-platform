import { CustomerType } from '@loop/shared';

export class CustomerEntity {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  type: string;
  socialLink: string | null;
  properties?: unknown[];
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<CustomerEntity>) {
    Object.assign(this, partial);
  }

  get fullName(): string {
    return `${this.firstName ?? ''} ${this.lastName ?? ''}`.trim();
  }

  get isProspect(): boolean {
    return this.type === CustomerType.PROSPECT;
  }

  convertToLead(): void {
    this.type = CustomerType.LEAD;
    this.updatedAt = new Date();
  }

  updateContact(data: {
    firstName?: string;
    lastName?: string;
    email?: string | null;
    phone?: string | null;
    socialLink?: string | null;
  }): void {
    if (data.firstName !== undefined) this.firstName = data.firstName;
    if (data.lastName !== undefined) this.lastName = data.lastName;
    if (data.email !== undefined) this.email = data.email;
    if (data.phone !== undefined) this.phone = data.phone;
    if (data.socialLink !== undefined) this.socialLink = data.socialLink;
    this.updatedAt = new Date();
  }
}
