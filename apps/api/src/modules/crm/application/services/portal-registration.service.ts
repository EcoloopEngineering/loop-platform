import {
  Inject,
  Injectable,
  ConflictException,
} from '@nestjs/common';
import {
  CUSTOMER_REPOSITORY,
  CustomerRepositoryPort,
} from '../ports/customer.repository.port';
import { PortalAuthService, CustomerMetadata } from './portal-auth.service';
import { normalizeName } from '../../../../common/utils/normalize-name';
import * as bcrypt from 'bcryptjs';

export interface PortalRegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
}

@Injectable()
export class PortalRegistrationService {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepo: CustomerRepositoryPort,
    private readonly portalAuth: PortalAuthService,
  ) {}

  async register(dto: PortalRegisterInput) {
    const existing = await this.customerRepo.findByEmailRaw(dto.email.toLowerCase());

    if (!existing) {
      return this.createNewCustomer(dto);
    }

    const meta = this.portalAuth.getMeta(existing.metadata);
    if (meta.passwordHash) {
      throw new ConflictException('An account with this email already exists. Please sign in.');
    }

    return this.attachPasswordToExisting(existing, dto, meta);
  }

  private async createNewCustomer(dto: PortalRegisterInput) {
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const customer = await this.customerRepo.createWithMetadata({
      firstName: normalizeName(dto.firstName),
      lastName: normalizeName(dto.lastName),
      email: dto.email.toLowerCase(),
      phone: dto.phone,
      metadata: { passwordHash },
    });

    return {
      token: this.portalAuth.generateToken(customer.id, customer.email ?? ''),
      customer: this.portalAuth.sanitize(customer),
    };
  }

  private async attachPasswordToExisting(
    existing: { id: string; firstName: string; lastName: string; email: string | null; phone: string | null },
    dto: PortalRegisterInput,
    meta: CustomerMetadata,
  ) {
    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.customerRepo.updateRaw(existing.id, {
      firstName: normalizeName(dto.firstName),
      lastName: normalizeName(dto.lastName),
      phone: dto.phone ?? existing.phone,
      metadata: { ...meta, passwordHash },
    });

    return {
      token: this.portalAuth.generateToken(existing.id, existing.email ?? ''),
      customer: this.portalAuth.sanitize({ ...existing, firstName: dto.firstName, lastName: dto.lastName }),
    };
  }
}
