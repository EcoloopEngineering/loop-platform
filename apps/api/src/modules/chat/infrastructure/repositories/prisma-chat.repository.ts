import { Injectable } from '@nestjs/common';
import { Prisma, SenderType } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { ChatRepositoryPort } from '../../application/ports/chat.repository.port';

@Injectable()
export class PrismaChatRepository implements ChatRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async createConversation(data: {
    userId?: string;
    visitorName?: string;
    visitorEmail?: string;
    subject?: string;
  }): Promise<any> {
    return this.prisma.conversation.create({
      data: {
        userId: data.userId,
        visitorName: data.visitorName,
        visitorEmail: data.visitorEmail,
        subject: data.subject,
        status: 'OPEN',
      },
      include: { messages: true },
    });
  }

  async addMessage(data: {
    conversationId: string;
    senderId?: string;
    senderType: string;
    content: string;
    isAutoReply: boolean;
  }): Promise<any> {
    return this.prisma.message.create({
      data: {
        conversationId: data.conversationId,
        senderId: data.senderId,
        senderType: data.senderType as SenderType,
        content: data.content,
        isAutoReply: data.isAutoReply,
      },
    });
  }

  async touchConversation(id: string): Promise<void> {
    await this.prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });
  }

  async findConversationById(id: string): Promise<any | null> {
    return this.prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        agent: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async findConversations(params?: { status?: string; userId?: string }): Promise<any[]> {
    const where: Prisma.ConversationWhereInput = {};
    if (params?.status) where.status = params.status as Prisma.EnumConversationStatusFilter;
    if (params?.userId) where.userId = params.userId;

    return this.prisma.conversation.findMany({
      where,
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        user: { select: { firstName: true, lastName: true, email: true } },
        agent: { select: { firstName: true, lastName: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async updateConversation(id: string, data: Record<string, unknown>): Promise<any> {
    return this.prisma.conversation.update({
      where: { id },
      data: data as any,
    });
  }
}
