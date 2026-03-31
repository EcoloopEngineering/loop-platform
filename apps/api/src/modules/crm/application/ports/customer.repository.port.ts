import { CustomerType } from '@loop/shared';
import { CustomerEntity } from '../../domain/entities/customer.entity';

export interface CustomerRaw {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  metadata: unknown;
}

export interface CustomerRepositoryPort {
  create(data: {
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    source?: string | null;
    type?: CustomerType;
    socialLink?: string | null;
  }): Promise<CustomerEntity>;
  findById(id: string): Promise<CustomerEntity | null>;
  findByEmail(email: string): Promise<CustomerEntity | null>;
  findAll(params: {
    page: number;
    limit: number;
    search?: string;
    type?: CustomerType;
  }): Promise<{ data: CustomerEntity[]; total: number }>;
  update(id: string, data: Partial<CustomerEntity>): Promise<CustomerEntity>;

  /** Portal-specific: create customer with metadata (password hash etc.) */
  createWithMetadata(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    metadata: Record<string, unknown>;
  }): Promise<CustomerRaw>;

  /** Portal-specific: find customer by email returning raw data with metadata */
  findByEmailRaw(email: string): Promise<CustomerRaw | null>;

  /** Portal-specific: find customer by id returning raw data with metadata */
  findByIdRaw(id: string): Promise<CustomerRaw | null>;

  /** Portal-specific: update customer returning raw data with metadata */
  updateRaw(id: string, data: Record<string, unknown>): Promise<CustomerRaw>;

  /** Portal-specific: find customer by metadata JSON path (e.g. resetTokenHash) */
  findByMetadataPath(path: string[], value: string): Promise<CustomerRaw | null>;

  /** Portal-specific: find the most recent lead for a customer with property */
  findLatestLeadForCustomer(customerId: string): Promise<{
    id: string;
    currentStage: string;
    systemSize: number | null;
    property: { streetAddress: string; city: string; state: string } | null;
  } | null>;

  /** Portal-specific: find latest lead with full relations (assignments, PM) */
  findLatestLeadForCustomerWithRelations(customerId: string): Promise<{
    id: string;
    currentStage: string;
    systemSize: number | null;
    property: { streetAddress: string; city: string; state: string } | null;
    assignments: Array<{
      user: { firstName: string; lastName: string };
    }>;
    projectManager: { firstName: string; lastName: string } | null;
  } | null>;
}

export const CUSTOMER_REPOSITORY = Symbol('CUSTOMER_REPOSITORY');
