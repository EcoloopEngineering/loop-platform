export const CHAT_REPOSITORY = Symbol('CHAT_REPOSITORY');

export interface ChatRepositoryPort {
  createConversation(data: {
    userId?: string;
    visitorName?: string;
    visitorEmail?: string;
    subject?: string;
  }): Promise<any>;

  addMessage(data: {
    conversationId: string;
    senderId?: string;
    senderType: string;
    content: string;
    isAutoReply: boolean;
  }): Promise<any>;

  touchConversation(id: string): Promise<void>;

  findConversationById(id: string): Promise<any | null>;

  findConversations(params?: { status?: string; userId?: string }): Promise<any[]>;

  updateConversation(id: string, data: Record<string, unknown>): Promise<any>;
}
