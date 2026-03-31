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

  async update(id: string, data: UpdateLeadData): Promise<LeadEntity> {
    const lead = await this.prisma.lead.update({
      where: { id },
      data: data as Prisma.LeadUpdateInput,
    });
    return new LeadEntity(lead as Partial<LeadEntity>);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.task.deleteMany({ where: { leadId: id } });
    await this.prisma.leadActivity.deleteMany({ where: { leadId: id } });
    await this.prisma.leadAssignment.deleteMany({ where: { leadId: id } });
    await this.prisma.leadScore.deleteMany({ where: { leadId: id } });
    await this.prisma.lead.delete({ where: { id } });
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

  // ── Status changes ─────────────────────────────────────────────────────

  async findByIdWithCustomerName(id: string): Promise<{
    id: string;
    currentStage: string;
    status: string;
    metadata: unknown;
    createdById: string | null;
    customer: { firstName: string; lastName: string };
  } | null> {
    return this.prisma.lead.findUnique({
      where: { id },
      include: { customer: { select: { firstName: true, lastName: true } } },
    }) as any;
  }

  async updateStatus(id: string, data: {
    status: string;
    lostAt?: Date | null;
    lostReason?: string | null;
    currentStage?: string;
  }): Promise<unknown> {
    return this.prisma.lead.update({ where: { id }, data: data as any });
  }

  // ── Metadata ───────────────────────────────────────────────────────────

  async findLeadMetadata(id: string): Promise<{ id: string; metadata: unknown } | null> {
    return this.prisma.lead.findUnique({
      where: { id },
      select: { id: true, metadata: true },
    });
  }

  async updateMetadata(id: string, metadata: Record<string, unknown>): Promise<unknown> {
    return this.prisma.lead.update({
      where: { id },
      data: { metadata: metadata as Prisma.InputJsonValue },
    });
  }

  // ── Batch queries ──────────────────────────────────────────────────────

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

  // ── Owner resolution ──────────────────────────────────────────────────

  async findUserEmailById(userId: string): Promise<{ id: string; email: string } | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
  }

  async findReferralByInvitee(inviteeId: string): Promise<{ inviterId: string } | null> {
    return this.prisma.referral.findFirst({
      where: { inviteeId },
      orderBy: { createdAt: 'desc' },
      select: { inviterId: true },
    });
  }

  // ── Transaction-based lead creation helpers ───────────────────────────

  async createScoreAndAssignments(data: {
    leadId: string;
    score: { totalScore: number; roofScore: number; energyScore: number; contactScore: number; propertyScore: number };
    primaryOwnerId: string;
    creatorId: string;
    designType?: string;
    designNotes?: string;
    initialStage: string;
    source: string;
  }): Promise<{ designRequest: { id: string } | null }> {
    return this.prisma.$transaction(async (tx) => {
      await tx.leadScore.create({
        data: {
          leadId: data.leadId,
          totalScore: data.score.totalScore,
          roofScore: data.score.roofScore,
          energyScore: data.score.energyScore,
          contactScore: data.score.contactScore,
          propertyScore: data.score.propertyScore,
        },
      });

      await tx.leadAssignment.create({
        data: { leadId: data.leadId, userId: data.primaryOwnerId, splitPct: 100, isPrimary: true },
      });

      if (data.primaryOwnerId !== data.creatorId) {
        await tx.leadAssignment.create({
          data: { leadId: data.leadId, userId: data.creatorId, splitPct: 0, isPrimary: false },
        });
      }

      let designRequest: { id: string } | null = null;
      if (data.designType) {
        const isAiDesign = data.designType === 'AI_DESIGN';
        designRequest = await tx.designRequest.create({
          data: {
            leadId: data.leadId,
            designType: data.designType as any,
            notes: data.designNotes,
            status: isAiDesign ? 'COMPLETED' : 'PENDING',
            completedAt: isAiDesign ? new Date() : null,
          },
        });
      }

      await tx.leadActivity.create({
        data: {
          leadId: data.leadId,
          userId: data.creatorId,
          type: 'STAGE_CHANGE',
          description: `Lead created via wizard${data.designType === 'AI_DESIGN' ? ' (AI Design → Design Ready)' : ''}`,
          metadata: { stage: data.initialStage, source: data.source, designType: data.designType },
        },
      });

      return { designRequest };
    });
  }

  // ── Stakeholder lookups ────────────────────────────────────────────────

  async findLeadStakeholderIds(leadId: string, excludeIds: string[] = []): Promise<string[]> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        createdById: true,
        projectManagerId: true,
        assignments: { select: { userId: true } },
      },
    });

    if (!lead) return [];

    const userIds = new Set<string>();
    for (const assignment of lead.assignments) {
      userIds.add(assignment.userId);
    }
    if (lead.projectManagerId) userIds.add(lead.projectManagerId);
    if (lead.createdById) userIds.add(lead.createdById);

    for (const id of excludeIds) {
      userIds.delete(id);
    }

    return Array.from(userIds);
  }

  // ── Lead metadata for task listeners ──────────────────────────────────

  async findLeadWithMetadataAndState(leadId: string): Promise<{
    id: string;
    metadata: unknown;
    property: { state: string } | null;
  } | null> {
    return this.prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        metadata: true,
        property: { select: { state: true } },
      },
    }) as any;
  }
}
