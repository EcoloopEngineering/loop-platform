import { PropertyEntity } from '../../domain/entities/property.entity';

export interface CreatePropertyData {
  customerId: string;
  propertyType?: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  latitude?: number | null;
  longitude?: number | null;
  roofCondition?: string;
  roofAgeYears?: number | null;
  electricalService?: string | null;
  hasPool?: boolean;
  hasEV?: boolean;
  monthlyBill?: number | null;
  annualKwhUsage?: number | null;
  utilityProvider?: string | null;
  isInsideServiceArea?: boolean | null;
  notes?: string | null;
}

export interface UpdatePropertyData {
  propertyType?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zip?: string;
  latitude?: number | null;
  longitude?: number | null;
  roofCondition?: string;
  roofAgeYears?: number | null;
  electricalService?: string | null;
  hasPool?: boolean;
  hasEV?: boolean;
  monthlyBill?: number | null;
  annualKwhUsage?: number | null;
  utilityProvider?: string | null;
  isInsideServiceArea?: boolean | null;
  notes?: string | null;
}

export interface PropertyRepositoryPort {
  create(data: CreatePropertyData): Promise<PropertyEntity>;
  findById(id: string): Promise<PropertyEntity | null>;
  findByCustomerId(customerId: string): Promise<PropertyEntity[]>;
  update(id: string, data: UpdatePropertyData): Promise<PropertyEntity>;
}

export const PROPERTY_REPOSITORY = Symbol('PROPERTY_REPOSITORY');
