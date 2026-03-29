import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { CustomerRepositoryPort } from '../../application/ports/customer.repository.port';
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
  }): Promise<CustomerEntity> {
    const customer = await this.prisma.customer.create({ data });
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
  }): Promise<{ data: CustomerEntity[]; total: number }> {
    const where: Prisma.CustomerWhereInput = {};

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
}
