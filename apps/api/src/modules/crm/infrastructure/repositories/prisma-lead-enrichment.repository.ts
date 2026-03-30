import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { LeadEnrichmentRepositoryPort } from '../../application/ports/lead-enrichment.repository.port';
import {
  UserNameRecord,
  PipelineRecord,
  LeadWithCustomer,
  AssignmentRecord,
  UpsertAssignmentData,
} from '../../application/ports/lead.repository.port';

@Injectable()
export class PrismaLeadEnrichmentRepository implements LeadEnrichmentRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findUserNameById(userId: string): Promise<UserNameRecord | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    }) as Promise<UserNameRecord | null>;
  }

  async findDefaultPipeline(): Promise<PipelineRecord | null> {
    return this.prisma.pipeline.findFirst({
      where: { isDefault: true },
    }) as Promise<PipelineRecord | null>;
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
}
