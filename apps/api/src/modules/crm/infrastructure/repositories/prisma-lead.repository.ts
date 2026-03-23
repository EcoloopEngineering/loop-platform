import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { LeadRepositoryPort } from '../../application/ports/lead.repository.port';
import { LeadEntity } from '../../domain/entities/lead.entity';
import { LeadFilterDto } from '../../application/dto/lead-filter.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaLeadRepository implements LeadRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any): Promise<LeadEntity> {
    const lead = await this.prisma.lead.create({ data });
    return new LeadEntity(lead as any);
  }

  async findById(id: string): Promise<LeadEntity | null> {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    return lead ? new LeadEntity(lead as any) : null;
  }

  async findByIdWithRelations(id: string): Promise<any | null> {
    return this.prisma.lead.findUnique({
      where: { id },
      include: {
        customer: true,
        property: true,
        score: true,
        assignments: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        projectManager: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        designRequests: true,
        appointments: {
          orderBy: { scheduledAt: 'desc' },
        },
      },
    });
  }

  async findAll(filter: LeadFilterDto): Promise<{ data: any[]; total: number }> {
    const where: Prisma.LeadWhereInput = {
      isActive: true,
    };

    if (filter.stage) {
      where.currentStage = filter.stage;
    }

    if (filter.source) {
      where.source = filter.source;
    }

    if (filter.dateFrom || filter.dateTo) {
      where.createdAt = {};
      if (filter.dateFrom) {
        where.createdAt.gte = new Date(filter.dateFrom);
      }
      if (filter.dateTo) {
        where.createdAt.lte = new Date(filter.dateTo);
      }
    }

    if (filter.assignedUserId) {
      where.assignments = {
        some: { userId: filter.assignedUserId },
      };
    }

    if (filter.search) {
      where.OR = [
        {
          customer: {
            OR: [
              { firstName: { contains: filter.search, mode: 'insensitive' } },
              { lastName: { contains: filter.search, mode: 'insensitive' } },
              { email: { contains: filter.search, mode: 'insensitive' } },
              { phone: { contains: filter.search, mode: 'insensitive' } },
            ],
          },
        },
        {
          property: {
            streetAddress: { contains: filter.search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: {
          customer: true,
          property: true,
          score: true,
          assignments: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: filter.skip,
        take: filter.limit,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return { data, total };
  }

  async findByStageGrouped(
    pipelineId?: string,
    filters?: { search?: string; source?: string; dateFrom?: string; dateTo?: string },
  ): Promise<Record<string, any[]>> {
    const where: Prisma.LeadWhereInput = { isActive: true };
    if (pipelineId) {
      where.pipelineId = pipelineId;
    }

    // Search by customer name (Postgres ILIKE)
    if (filters?.search) {
      where.customer = {
        OR: [
          { firstName: { contains: filters.search, mode: 'insensitive' } },
          { lastName: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
          { phone: { contains: filters.search } },
        ],
      };
    }

    if (filters?.source) {
      where.source = filters.source as any;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo + 'T23:59:59Z');
    }

    const leads = await this.prisma.lead.findMany({
      where,
      include: {
        customer: true,
        property: true,
        score: true,
        assignments: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        projectManager: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const grouped: Record<string, any[]> = {};
    for (const lead of leads) {
      const stage = lead.currentStage;
      if (!grouped[stage]) {
        grouped[stage] = [];
      }
      grouped[stage].push(lead);
    }

    return grouped;
  }

  async update(id: string, data: Partial<any>): Promise<LeadEntity> {
    const lead = await this.prisma.lead.update({ where: { id }, data });
    return new LeadEntity(lead as any);
  }

  async updateStage(id: string, stage: string): Promise<LeadEntity> {
    const lead = await this.prisma.lead.update({
      where: { id },
      data: { currentStage: stage as any },
    });
    return new LeadEntity(lead as any);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.lead.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
