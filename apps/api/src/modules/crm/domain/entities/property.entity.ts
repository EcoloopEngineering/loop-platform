export class PropertyEntity {
  id: string;
  customerId: string;
  propertyType: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  latitude: number | null;
  longitude: number | null;
  roofCondition: string;
  roofAgeYears: number | null;
  electricalService: string | null;
  hasPool: boolean;
  hasEV: boolean;
  monthlyBill: number | null;
  annualKwhUsage: number | null;
  utilityProvider: string | null;
  isInsideServiceArea: boolean | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<PropertyEntity>) {
    Object.assign(this, partial);
  }

  get fullAddress(): string {
    return `${this.streetAddress}, ${this.city}, ${this.state} ${this.zip}`;
  }
}
