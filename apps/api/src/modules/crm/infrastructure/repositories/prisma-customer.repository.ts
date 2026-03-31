import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { CustomerRepositoryPort, CustomerRaw } from '../../application/ports/customer.repository.port';
import { CustomerEntity } from '../../domain/entities/customer.entity';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaCustomerRepository implements CustomerRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    source?: string | null;
    type?: string;
    socialLink?: string | null;
  }): Promise<CustomerEntity> {
    const customer = await this.prisma.customer.create({ data: data as any });
    return new CustomerEntity(customer);
  }

  async findById(id: string): Promise<CustomerEntity | null> {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    return customer ? new CustomerEntity(customer) : null;
  }

  async findByEmail(email: string): Promise<CustomerEntity | null> {
    const customer = await this.prisma.customer.findFirst({
      where: { email },
    });
    return customer ? new CustomerEntity(customer) : null;
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    type?: string;
  }): Promise<{ data: CustomerEntity[]; total: number }> {
    const where: Prisma.CustomerWhereInput = {};

    if (params.type) {
      where.type = params.type as any;
    }

    if (params.search) {
      where.OR = [
        { firstName: { contains: params.search, mode: 'insensitive' } },
        { lastName: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const skip = (params.page - 1) * params.limit;

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: params.limit,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: customers.map((c) => new CustomerEntity(c)),
      total,
    };
  }

  async update(id: string, data: Partial<CustomerEntity>): Promise<CustomerEntity> {
    const { createdAt: _ca, updatedAt: _ua, ...updateData } = data as Record<string, unknown>;
    const customer = await this.prisma.customer.update({
      where: { id },
      data: updateData,
    });
    return new CustomerEntity(customer);
  }

  async createWithMetadata(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    metadata: Record<string, unknown>;
  }): Promise<CustomerRaw> {
    return this.prisma.customer.create({ data: { ...data, metadata: data.metadata as any } }) as unknown as CustomerRaw;
  }

  async findByEmailRaw(email: string): Promise<CustomerRaw | null> {
    return this.prisma.customer.findFirst({
      where: { email },
    }) as unknown as CustomerRaw | null;
  }

  async findByIdRaw(id: string): Promise<CustomerRaw | null> {
    return this.prisma.customer.findUnique({
      where: { id },
    }) as unknown as CustomerRaw | null;
  }

  async updateRaw(id: string, data: Record<string, unknown>): Promise<CustomerRaw> {
    return this.prisma.customer.update({
      where: { id },
      data,
    }) as unknown as CustomerRaw;
  }

  async findByMetadataPath(path: string[], value: string): Promise<CustomerRaw | null> {
    return this.prisma.customer.findFirst({
      where: { metadata: { path, equals: value } } as any,
    }) as unknown as CustomerRaw | null;
  }

  async findLatestLeadForCustomer(customerId: string): Promise<{
    id: string;
    currentStage: string;
    systemSize: number | null;
    property: { streetAddress: string; city: string; state: string } | null;
  } | null> {
    return this.prisma.lead.findFirst({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: { property: true },
    }) as any;
  }

  async findLatestLeadForCustomerWithRelations(customerId: string): Promise<{
    id: string;
    currentStage: string;
    systemSize: number | null;
    property: { streetAddress: string; city: string; state: string } | null;
    assignments: Array<{
      user: { firstName: string; lastName: string };
    }>;
    projectManager: { firstName: string; lastName: string } | null;
  } | null> {
    return this.prisma.lead.findFirst({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        property: true,
        assignments: { where: { isPrimary: true }, include: { user: true } },
        projectManager: true,
      },
    }) as any;
  }
}
