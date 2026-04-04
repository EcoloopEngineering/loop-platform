import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  LeadChatRepositoryPort,
  LeadWithAssignments,
  ChatMessageWithUser,
} from '../../application/ports/lead-chat.repository.port';

const USER_SELECT = { id: true, firstName: true, lastName: true, profileImage: true } as const;

@Injectable()
export class PrismaLeadChatRepository implements LeadChatRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findLeadWithAssignments(leadId: string): Promise<LeadWithAssignments | null> {
    return this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        customer: { select: { firstName: true, lastName: true } },
        assignments: { select: { userId: true } },
      },
    }) as Promise<LeadWithAssignments | null>;
  }

  async createMessage(data: {
    leadId: string;
    userId: string;
    message: string;
  }): Promise<ChatMessageWithUser> {
    return this.prisma.leadChat.create({
      data,
      include: { user: { select: USER_SELECT } },
    }) as Promise<ChatMessageWithUser>;
  }

  async findMessagesByLead(leadId: string): Promise<ChatMessageWithUser[]> {
    return this.prisma.leadChat.findMany({
      where: { leadId },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: USER_SELECT } },
    }) as Promise<ChatMessageWithUser[]>;
  }

  async createActivity(data: {
    leadId: string;
    userId: string;
    type: string;
    description: string;
    metadata?: Record<string, unknown>;
  }): Promise<unknown> {
    return this.prisma.leadActivity.create({
      data: {
        leadId: data.leadId,
        userId: data.userId,
        type: data.type as any,
        description: data.description,
        metadata: data.metadata as any,
      },
    });
  }

  async upsertFollow(leadId: string, userId: string): Promise<void> {
    await this.prisma.leadChatFollow.upsert({
      where: { leadId_userId: { leadId, userId } },
      create: { leadId, userId },
      update: {},
    });
  }

  async deleteFollow(leadId: string, userId: string): Promise<void> {
    await this.prisma.leadChatFollow.deleteMany({
      where: { leadId, userId },
    });
  }

  async findFollow(
    leadId: string,
    userId: string,
  ): Promise<{ leadId: string; userId: string } | null> {
    return this.prisma.leadChatFollow.findUnique({
      where: { leadId_userId: { leadId, userId } },
    });
  }

  async findFollowersByLead(leadId: string): Promise<{ userId: string }[]> {
    return this.prisma.leadChatFollow.findMany({
      where: { leadId },
      select: { userId: true },
    });
  }
}
