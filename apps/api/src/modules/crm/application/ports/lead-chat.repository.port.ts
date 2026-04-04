export const LEAD_CHAT_REPOSITORY = Symbol('LEAD_CHAT_REPOSITORY');

export interface LeadWithAssignments {
  id: string;
  customer: { firstName: string; lastName: string } | null;
  assignments: { userId: string }[];
}

export interface ChatMessageWithUser {
  id: string;
  leadId: string;
  userId: string;
  message: string;
  createdAt: Date;
  user: { id: string; firstName: string; lastName: string; profileImage: string | null };
}

export interface LeadChatRepositoryPort {
  findLeadWithAssignments(leadId: string): Promise<LeadWithAssignments | null>;

  createMessage(data: {
    leadId: string;
    userId: string;
    message: string;
  }): Promise<ChatMessageWithUser>;

  findMessagesByLead(leadId: string): Promise<ChatMessageWithUser[]>;

  createActivity(data: {
    leadId: string;
    userId: string;
    type: string;
    description: string;
    metadata?: Record<string, unknown>;
  }): Promise<unknown>;

  upsertFollow(leadId: string, userId: string): Promise<void>;
  deleteFollow(leadId: string, userId: string): Promise<void>;
  findFollow(leadId: string, userId: string): Promise<{ leadId: string; userId: string } | null>;
  findFollowersByLead(leadId: string): Promise<{ userId: string }[]>;
}
