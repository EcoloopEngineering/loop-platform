import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { PropertyRepositoryPort, CreatePropertyData, UpdatePropertyData } from '../../application/ports/property.repository.port';
import { PropertyEntity } from '../../domain/entities/property.entity';

@Injectable()
export class PrismaPropertyRepository implements PropertyRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePropertyData): Promise<PropertyEntity> {
    const property = await this.prisma.property.create({ data: data as unknown as Prisma.PropertyCreateInput });
    return new PropertyEntity(property as unknown as Partial<PropertyEntity>);
  }

  async findById(id: string): Promise<PropertyEntity | null> {
    const property = await this.prisma.property.findUnique({ where: { id } });
    return property ? new PropertyEntity(property as unknown as Partial<PropertyEntity>) : null;
  }

  async findByCustomerId(customerId: string): Promise<PropertyEntity[]> {
    const properties = await this.prisma.property.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
    return properties.map((p) => new PropertyEntity(p as unknown as Partial<PropertyEntity>));
  }

  async update(id: string, data: UpdatePropertyData): Promise<PropertyEntity> {
    const property = await this.prisma.property.update({
      where: { id },
      data: data as unknown as Prisma.PropertyUpdateInput,
    });
    return new PropertyEntity(property as unknown as Partial<PropertyEntity>);
  }
}
