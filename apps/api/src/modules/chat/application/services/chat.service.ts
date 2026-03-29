import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  CHAT_REPOSITORY,
  ChatRepositoryPort,
} from '../ports/chat.repository.port';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepo: ChatRepositoryPort,
  ) {}

  async createConversation(params: {
    userId?: string;
    visitorName?: string;
    visitorEmail?: string;
    subject?: string;
  }) {
    return this.chatRepo.createConversation(params);
  }

  async addMessage(params: {
    conversationId: string;
    senderId?: string;
    senderType: 'USER' | 'AGENT' | 'BOT';
    content: string;
    isAutoReply?: boolean;
  }) {
    const message = await this.chatRepo.addMessage({
      conversationId: params.conversationId,
      senderId: params.senderId,
      senderType: params.senderType,
      content: params.content,
      isAutoReply: params.isAutoReply ?? false,
    });

    // Update conversation updatedAt
    await this.chatRepo.touchConversation(params.conversationId);

    return message;
  }

  async getConversation(id: string) {
    return this.chatRepo.findConversationById(id);
  }

  async getConversations(params?: { status?: string; userId?: string }) {
    return this.chatRepo.findConversations(params);
  }

  async assignAgent(conversationId: string, agentId: string) {
    return this.chatRepo.updateConversation(conversationId, {
      assignedTo: agentId,
      status: 'WITH_AGENT',
    });
  }

  async closeConversation(conversationId: string) {
    return this.chatRepo.updateConversation(conversationId, {
      status: 'CLOSED',
      closedAt: new Date(),
    });
  }

  async requestAgent(conversationId: string) {
    return this.chatRepo.updateConversation(conversationId, {
      status: 'WAITING_AGENT',
    });
  }
}
