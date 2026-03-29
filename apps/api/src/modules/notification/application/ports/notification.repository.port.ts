export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');

export interface LeadStakeholders {
  id: string;
  customer: { id: string; firstName: string; email: string | null } | null;
  assignments: Array<{
    isPrimary: boolean;
    user: { email: string; firstName: string } | null;
  }>;
  projectManager: { email: string; firstName: string } | null;
  metadata?: unknown;
  property?: { streetAddress: string; city: string; state: string } | null;
}

export interface NotificationRepositoryPort {
  create(data: {
    userId: string;
    event: string;
    title: string;
    message: string;
    data?: Record<string, any>;
    isRead: boolean;
  }): Promise<any>;

  markRead(id: string): Promise<any>;

  markAllRead(userId: string): Promise<any>;

  findByUser(userId: string, skip: number, take: number): Promise<any[]>;

  countByUser(userId: string): Promise<number>;

  countUnread(userId: string): Promise<number>;

  findDeviceToken(userId: string): Promise<{ token: string } | null>;

  // ── Lead stakeholder lookups (for email/chat notifications) ───────────
  findLeadWithStakeholders(leadId: string): Promise<LeadStakeholders | null>;

  findLeadMetadata(leadId: string): Promise<{ metadata: unknown } | null>;

  findLeadWithPrimaryAssignment(leadId: string): Promise<{
    id: string;
    assignments: Array<{
      isPrimary: boolean;
      user: { firstName: string; lastName: string } | null;
    }>;
  } | null>;

  updateLeadMetadata(leadId: string, metadata: Record<string, unknown>): Promise<void>;

  // ── Settings ──────────────────────────────────────────────────────────
  findNotificationSetting(): Promise<Record<string, boolean> | null>;

  // ── Stakeholder lookups (for notification listeners) ──────────────────
  findLeadStakeholderIds(leadId: string, excludeIds?: string[]): Promise<string[]>;
}
