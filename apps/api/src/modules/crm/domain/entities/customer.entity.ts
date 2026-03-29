export class CustomerEntity {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<CustomerEntity>) {
    Object.assign(this, partial);
  }

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  updateContact(data: {
    firstName?: string;
    lastName?: string;
    email?: string | null;
    phone?: string | null;
  }): void {
    if (data.firstName !== undefined) this.firstName = data.firstName;
    if (data.lastName !== undefined) this.lastName = data.lastName;
    if (data.email !== undefined) this.email = data.email;
    if (data.phone !== undefined) this.phone = data.phone;
    this.updatedAt = new Date();
  }
}
