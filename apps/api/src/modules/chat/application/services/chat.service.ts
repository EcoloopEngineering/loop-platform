import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createConversation(params: {
    userId?: string;
    visitorName?: string;
    visitorEmail?: string;
    subject?: string;
  }) {
    return this.prisma.conversation.create({
      data: {
        userId: params.userId,
        visitorName: params.visitorName,
        visitorEmail: params.visitorEmail,
        subject: params.subject,
        status: 'OPEN',
      },
      include: { messages: true },
    });
  }

  async addMessage(params: {
    conversationId: string;
    senderId?: string;
    senderType: 'USER' | 'AGENT' | 'BOT';
    content: string;
    isAutoReply?: boolean;
  }) {
    const message = await this.prisma.message.create({
      data: {
        conversationId: params.conversationId,
        senderId: params.senderId,
        senderType: params.senderType as any,
        content: params.content,
        isAutoReply: params.isAutoReply ?? false,
      },
    });

    // Update conversation updatedAt
    await this.prisma.conversation.update({
      where: { id: params.conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  async getConversation(id: string) {
    return this.prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        agent: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async getConversations(params?: { status?: string; userId?: string }) {
    const where: any = {};
    if (params?.status) where.status = params.status;
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

  async assignAgent(conversationId: string, agentId: string) {
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: { assignedTo: agentId, status: 'WITH_AGENT' },
    });
  }

  async closeConversation(conversationId: string) {
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'CLOSED', closedAt: new Date() },
    });
  }

  async requestAgent(conversationId: string) {
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'WAITING_AGENT' },
    });
  }
}
