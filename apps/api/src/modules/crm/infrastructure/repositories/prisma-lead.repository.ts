import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  LeadRepositoryPort,
  CreateActivityData,
  ActivityRecord,
  AssignmentRecord,
  UpsertAssignmentData,
  LeadWithCustomer,
  UserNameRecord,
  PipelineRecord,
  LeadWithCustomerAndProperty,
  ScoreRecord,
  ActivityWithUser,
} from '../../application/ports/lead.repository.port';
import { LeadEntity } from '../../domain/entities/lead.entity';
import { LeadFilterDto } from '../../application/dto/lead-filter.dto';
import { CreateLeadData, UpdateLeadData, LeadDetail } from '../../application/dto/lead-data.types';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaLeadRepository implements LeadRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  // ── Lead CRUD ────────────────────────────────────────────────────────────

  async create(data: CreateLeadData): Promise<LeadEntity> {
    const lead = await this.prisma.lead.create({ data: data as unknown as Prisma.LeadCreateInput });
    return new LeadEntity(lead as Partial<LeadEntity>);
  }

  async findById(id: string): Promise<LeadEntity | null> {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    return lead ? new LeadEntity(lead as Partial<LeadEntity>) : null;
  }

  async findByIdWithRelations(id: string): Promise<LeadDetail | null> {
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
    }) as Promise<LeadDetail | null>;
  }

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
  ): Promise<Record<string, LeadDetail[]>> {
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

    const grouped: Record<string, LeadDetail[]> = {};
    for (const lead of leads) {
      const stage = lead.currentStage;
      if (!grouped[stage]) grouped[stage] = [];
      grouped[stage].push(lead as unknown as LeadDetail);
    }

    return grouped;
  }

  async update(id: string, data: UpdateLeadData): Promise<LeadEntity> {
    const lead = await this.prisma.lead.update({
      where: { id },
      data: data as Prisma.LeadUpdateInput,
    });
    return new LeadEntity(lead as Partial<LeadEntity>);
  }

  async updateStage(id: string, stage: string): Promise<LeadEntity> {
    const lead = await this.prisma.lead.update({
      where: { id },
      data: { currentStage: stage as any },
    });
    return new LeadEntity(lead as Partial<LeadEntity>);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.lead.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ── Extended lead operations ─────────────────────────────────────────────

  async updateStageAndPipeline(id: string, stage: string, pipelineId: string): Promise<LeadEntity> {
    const lead = await this.prisma.lead.update({
      where: { id },
      data: { currentStage: stage as any, pipelineId },
    });
    return new LeadEntity(lead as Partial<LeadEntity>);
  }

  async findByIdWithCustomer(id: string): Promise<LeadWithCustomer | null> {
    return this.prisma.lead.findUnique({
      where: { id },
      include: {
        customer: { select: { firstName: true, lastName: true } },
        projectManager: { select: { firstName: true, lastName: true } },
      },
    }) as Promise<LeadWithCustomer | null>;
  }

  async updatePm(
    id: string,
    pmId: string | null,
  ): Promise<LeadWithCustomer & { projectManagerId: string | null }> {
    return this.prisma.lead.update({
      where: { id },
      data: { projectManagerId: pmId || null },
      include: {
        projectManager: { select: { firstName: true, lastName: true } },
        customer: { select: { firstName: true, lastName: true } },
      },
    }) as any;
  }

  async createLeadRaw(data: Record<string, unknown>): Promise<LeadEntity> {
    const lead = await this.prisma.lead.create({ data: data as any });
    return new LeadEntity(lead as Partial<LeadEntity>);
  }

  async deactivateByCustomerId(customerId: string): Promise<void> {
    await this.prisma.lead.updateMany({
      where: { customerId, isActive: true },
      data: { isActive: false, lostReason: 'Deleted from SalesRabbit' },
    });
  }

  // ── Activity operations ──────────────────────────────────────────────────

  async createActivity(data: CreateActivityData): Promise<ActivityRecord> {
    return this.prisma.leadActivity.create({ data: data as any }) as unknown as Promise<ActivityRecord>;
  }

  async findActivityByIdAndLead(
    id: string,
    leadId: string,
    type?: string,
  ): Promise<ActivityRecord | null> {
    const where: Record<string, unknown> = { id, leadId };
    if (type) where.type = type;
    return this.prisma.leadActivity.findFirst({ where }) as Promise<ActivityRecord | null>;
  }

  async updateActivity(
    id: string,
    data: { description: string; metadata?: unknown },
  ): Promise<ActivityRecord> {
    return this.prisma.leadActivity.update({ where: { id }, data: data as any }) as unknown as Promise<ActivityRecord>;
  }

  async findActivities(filter: {
    leadId: string;
    type?: string;
    orderBy?: Record<string, 'asc' | 'desc'>;
  }): Promise<ActivityRecord[]> {
    const where: Record<string, unknown> = { leadId: filter.leadId };
    if (filter.type) where.type = filter.type;
    return this.prisma.leadActivity.findMany({
      where,
      ...(filter.orderBy ? { orderBy: filter.orderBy } : {}),
    }) as Promise<ActivityRecord[]>;
  }

  // ── Assignment operations ────────────────────────────────────────────────

  async findAssignments(leadId: string): Promise<AssignmentRecord[]> {
    const assignments = await this.prisma.leadAssignment.findMany({ where: { leadId } });
    return assignments.map(a => ({ ...a, splitPct: Number(a.splitPct) })) as AssignmentRecord[];
  }

  async upsertAssignment(data: UpsertAssignmentData): Promise<AssignmentRecord> {
    const result = await this.prisma.leadAssignment.upsert({
      where: { leadId_userId: { leadId: data.leadId, userId: data.userId } },
      update: { splitPct: data.splitPct, isPrimary: data.isPrimary },
      create: data as any,
    });
    return { ...result, splitPct: Number(result.splitPct) } as AssignmentRecord;
  }

  // ── Enrichment ───────────────────────────────────────────────────────────

  async findUserNameById(userId: string): Promise<UserNameRecord | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    }) as Promise<UserNameRecord | null>;
  }

  // ── Pipeline ─────────────────────────────────────────────────────────────

  async findDefaultPipeline(): Promise<PipelineRecord | null> {
    return this.prisma.pipeline.findFirst({
      where: { isDefault: true },
    }) as Promise<PipelineRecord | null>;
  }

  // ── Scoring ─────────────────────────────────────────────────────────────

  async findByIdWithCustomerAndProperty(id: string): Promise<LeadWithCustomerAndProperty | null> {
    return this.prisma.lead.findUnique({
      where: { id },
      include: { customer: true, property: true },
    }) as Promise<LeadWithCustomerAndProperty | null>;
  }

  async upsertScore(
    leadId: string,
    update: Omit<ScoreRecord, 'id' | 'leadId'>,
    create: Omit<ScoreRecord, 'id'>,
  ): Promise<ScoreRecord> {
    return this.prisma.leadScore.upsert({
      where: { leadId },
      update,
      create: { ...create, leadId } as any,
    }) as unknown as Promise<ScoreRecord>;
  }

  // ── Timeline ────────────────────────────────────────────────────────────

  async findActivitiesWithUser(leadId: string): Promise<ActivityWithUser[]> {
    return this.prisma.leadActivity.findMany({
      where: { leadId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, profileImage: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }) as unknown as Promise<ActivityWithUser[]>;
  }
}
