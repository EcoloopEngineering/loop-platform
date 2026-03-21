import { CustomerEntity } from '../../domain/entities/customer.entity';

export interface CustomerRepositoryPort {
  create(data: {
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    source?: string | null;
  }): Promise<CustomerEntity>;
  findById(id: string): Promise<CustomerEntity | null>;
  findByEmail(email: string): Promise<CustomerEntity | null>;
  findAll(params: {
    page: number;
    limit: number;
    search?: string;
  }): Promise<{ data: CustomerEntity[]; total: number }>;
  update(id: string, data: Partial<CustomerEntity>): Promise<CustomerEntity>;
}

export const CUSTOMER_REPOSITORY = Symbol('CUSTOMER_REPOSITORY');
