import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  LEAD_CHAT_REPOSITORY,
  LeadChatRepositoryPort,
  ChatMessageWithUser,
} from '../ports/lead-chat.repository.port';
import { NotificationService } from '../../../notification/application/services/notification.service';

@Injectable()
export class LeadChatService {
  private readonly logger = new Logger(LeadChatService.name);

  constructor(
    @Inject(LEAD_CHAT_REPOSITORY)
    private readonly repo: LeadChatRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
    private readonly notificationService: NotificationService,
  ) {}

  async sendMessage(
    leadId: string,
    userId: string,
    message: string,
  ): Promise<ChatMessageWithUser> {
    const lead = await this.repo.findLeadWithAssignments(leadId);
    if (!lead) throw new NotFoundException('Lead not found');

    const chatMessage = await this.repo.createMessage({ leadId, userId, message });

    const truncated =
      message.length > 80 ? message.substring(0, 80) + '...' : message;

    await this.repo.createActivity({
      leadId,
      userId,
      type: 'NOTE_ADDED',
      description: `Team chat: ${truncated}`,
      metadata: { action: 'lead_chat', chatMessageId: chatMessage.id },
    });

    this.eventEmitter.emit('lead.chat.message', { leadId, message: chatMessage });

    this.notifyRecipients(leadId, userId, chatMessage.user, truncated, lead).catch(
      (err) => this.logger.warn(`Failed to notify chat recipients: ${err}`),
    );

    return chatMessage;
  }

  async getMessages(leadId: string): Promise<ChatMessageWithUser[]> {
    const lead = await this.repo.findLeadWithAssignments(leadId);
    if (!lead) throw new NotFoundException('Lead not found');

    return this.repo.findMessagesByLead(leadId);
  }

  async follow(leadId: string, userId: string): Promise<{ following: boolean }> {
    const lead = await this.repo.findLeadWithAssignments(leadId);
    if (!lead) throw new NotFoundException('Lead not found');

    await this.repo.upsertFollow(leadId, userId);
    return { following: true };
  }

  async unfollow(leadId: string, userId: string): Promise<{ following: boolean }> {
    await this.repo.deleteFollow(leadId, userId);
    return { following: false };
  }

  async isFollowing(leadId: string, userId: string): Promise<{ following: boolean }> {
    const follow = await this.repo.findFollow(leadId, userId);
    return { following: !!follow };
  }

  private async notifyRecipients(
    leadId: string,
    senderId: string,
    sender: { firstName: string; lastName: string },
    truncatedMessage: string,
    lead: {
      customer: { firstName: string; lastName: string } | null;
      assignments: { userId: string }[];
    },
  ) {
    const followers = await this.repo.findFollowersByLead(leadId);

    const recipientIds = new Set<string>();
    for (const a of lead.assignments) recipientIds.add(a.userId);
    for (const f of followers) recipientIds.add(f.userId);
    recipientIds.delete(senderId);

    if (recipientIds.size === 0) return;

    const senderName = `${sender.firstName} ${sender.lastName}`.trim();
    const customerName = lead.customer
      ? `${lead.customer.firstName} ${lead.customer.lastName}`.trim()
      : 'Unknown';

    const promises = Array.from(recipientIds).map((recipientId) =>
      this.notificationService.create({
        userId: recipientId,
        event: 'lead.chat.message',
        title: `New chat message on ${customerName}`,
        message: `${senderName}: ${truncatedMessage}`,
        data: { leadId, type: 'lead_chat' },
      }),
    );

    await Promise.allSettled(promises);
  }
}
