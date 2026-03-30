import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { LeadQueryRepositoryPort } from '../../application/ports/lead-query.repository.port';
import { LeadFilterDto } from '../../application/dto/lead-filter.dto';
import { LeadDetail } from '../../application/dto/lead-data.types';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaLeadQueryRepository implements LeadQueryRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter: LeadFilterDto): Promise<{ data: LeadDetail[]; total: number }> {
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

    return { data: data as unknown as LeadDetail[], total };
  }

  async findByStageGrouped(
    pipelineId?: string,
    filters?: { search?: string; source?: string; dateFrom?: string; dateTo?: string },
    limitPerStage = 50,
  ): Promise<Record<string, { leads: LeadDetail[]; totalCount: number }>> {
    const where: Prisma.LeadWhereInput = { isActive: true, status: 'ACTIVE' };
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
      where.source = filters.source as Prisma.EnumLeadSourceFilter;
    }

    // Apply date filter; default to last 90 days if no date filter specified
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo + 'T23:59:59Z');
    } else {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      where.createdAt = { gte: ninetyDaysAgo };
    }

    // Get total counts per stage first (lightweight query)
    const stageCounts = await this.prisma.lead.groupBy({
      by: ['currentStage'],
      where,
      _count: { id: true },
    });

    const stageCountMap: Record<string, number> = {};
    for (const sc of stageCounts) {
      stageCountMap[sc.currentStage] = sc._count.id;
    }

    // Fetch leads with limit per stage — use one query ordered by stage + createdAt
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

    const grouped: Record<string, { leads: LeadDetail[]; totalCount: number }> = {};
    for (const lead of leads) {
      const stage = lead.currentStage;
      if (!grouped[stage]) {
        grouped[stage] = { leads: [], totalCount: stageCountMap[stage] ?? 0 };
      }
      if (grouped[stage].leads.length < limitPerStage) {
        grouped[stage].leads.push(lead as unknown as LeadDetail);
      }
    }

    // Ensure stages with counts but no leads still appear
    for (const [stage, count] of Object.entries(stageCountMap)) {
      if (!grouped[stage]) {
        grouped[stage] = { leads: [], totalCount: count };
      }
    }

    return grouped;
  }

  async findByStageWithCustomer(stage: string, take = 500): Promise<Array<{
    id: string;
    currentStage: string;
    createdById: string | null;
    metadata: unknown;
    customer: { firstName: string; lastName: string } | null;
  }>> {
    return this.prisma.lead.findMany({
      where: { currentStage: stage as any },
      include: { customer: { select: { firstName: true, lastName: true } } },
      take,
    }) as any;
  }
}
