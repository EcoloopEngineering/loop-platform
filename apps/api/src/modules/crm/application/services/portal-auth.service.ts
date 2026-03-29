import {
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CUSTOMER_REPOSITORY,
  CustomerRepositoryPort,
  CustomerRaw,
} from '../ports/customer.repository.port';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

export interface CustomerMetadata {
  passwordHash?: string;
  resetTokenHash?: string;
  resetTokenExpiry?: string;
  [key: string]: unknown;
}

export interface PortalLoginInput {
  email: string;
  password: string;
}

@Injectable()
export class PortalAuthService {
  private readonly jwtSecret: string;

  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepo: CustomerRepositoryPort,
    private readonly config: ConfigService,
  ) {
    this.jwtSecret = this.config.get<string>('JWT_SECRET', 'loop-platform-jwt-secret-change-in-prod');
    const env = this.config.get<string>('NODE_ENV', 'development');
    if (this.jwtSecret === 'loop-platform-jwt-secret-change-in-prod' && env === 'production') {
      throw new Error('JWT_SECRET must be configured in production');
    }
  }

  async login(dto: PortalLoginInput) {
    const customer = await this.customerRepo.findByEmailRaw(dto.email.toLowerCase());
    const meta = customer ? this.getMeta(customer.metadata) : null;

    if (!customer || !meta?.passwordHash) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const valid = await bcrypt.compare(dto.password, meta.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const lead = await this.customerRepo.findLatestLeadForCustomer(customer.id);

    return {
      token: this.generateToken(customer.id, customer.email ?? ''),
      customer: {
        ...this.sanitize(customer),
        leadId: lead?.id,
        currentStage: lead?.currentStage ?? 'NEW_LEAD',
        address: lead?.property
          ? `${lead.property.streetAddress}, ${lead.property.city}, ${lead.property.state}`
          : undefined,
      },
    };
  }

  async getMe(authHeader: string | undefined) {
    if (!authHeader) {
      throw new UnauthorizedException('Not authenticated');
    }

    const rawToken = authHeader.replace('Bearer ', '');
    const payload = this.verifyPortalToken(rawToken);

    const customer = await this.customerRepo.findByIdRaw(payload.sub);
    if (!customer) {
      throw new UnauthorizedException('Customer not found');
    }

    const lead = await this.customerRepo.findLatestLeadForCustomerWithRelations(customer.id);

    return {
      ...this.sanitize(customer),
      leadId: lead?.id,
      currentStage: lead?.currentStage ?? 'NEW_LEAD',
      address: lead?.property
        ? `${lead.property.streetAddress}, ${lead.property.city}, ${lead.property.state}`
        : undefined,
      salesRep: lead?.assignments?.[0]?.user
        ? `${lead.assignments[0].user.firstName} ${lead.assignments[0].user.lastName}`
        : undefined,
      projectManager: lead?.projectManager
        ? `${lead.projectManager.firstName} ${lead.projectManager.lastName}`
        : undefined,
      systemSize: lead?.systemSize,
    };
  }

  verifyPortalToken(rawToken: string): { sub: string; type: string } {
    let payload: { sub: string; type: string };
    try {
      payload = jwt.verify(rawToken, this.jwtSecret) as { sub: string; type: string };
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (payload.type !== 'portal') {
      throw new UnauthorizedException('Invalid token');
    }

    return payload;
  }

  getMeta(raw: unknown): CustomerMetadata {
    return (raw as CustomerMetadata) ?? {};
  }

  generateToken(customerId: string, email: string): string {
    return jwt.sign(
      { sub: customerId, email, type: 'portal' },
      this.jwtSecret,
      { expiresIn: '30d' },
    );
  }

  sanitize(customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  }) {
    return {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      name: `${customer.firstName} ${customer.lastName}`,
      email: customer.email,
      phone: customer.phone,
    };
  }
}
