export class Address {
  readonly streetAddress: string;
  readonly city: string;
  readonly state: string;
  readonly zip: string;
  readonly latitude: number | null;
  readonly longitude: number | null;

  constructor(props: {
    streetAddress: string;
    city: string;
    state: string;
    zip: string;
    latitude?: number | null;
    longitude?: number | null;
  }) {
    this.streetAddress = props.streetAddress;
    this.city = props.city;
    this.state = props.state;
    this.zip = props.zip;
    this.latitude = props.latitude ?? null;
    this.longitude = props.longitude ?? null;
  }

  get fullAddress(): string {
    return `${this.streetAddress}, ${this.city}, ${this.state} ${this.zip}`;
  }

  get hasCoordinates(): boolean {
    return this.latitude !== null && this.longitude !== null;
  }

  equals(other: Address): boolean {
    return (
      this.streetAddress === other.streetAddress &&
      this.city === other.city &&
      this.state === other.state &&
      this.zip === other.zip
    );
  }
}
