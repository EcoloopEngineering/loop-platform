import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { LeadActivityRepositoryPort } from '../../application/ports/lead-activity.repository.port';
import {
  CreateActivityData,
  ActivityRecord,
  ActivityWithUser,
} from '../../application/ports/lead.repository.port';

@Injectable()
export class PrismaLeadActivityRepository implements LeadActivityRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

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
