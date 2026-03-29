import { Inject, Injectable, Logger } from '@nestjs/common';
import { GoogleChatService } from '../../../../integrations/google-chat/google-chat.service';
import {
  NOTIFICATION_REPOSITORY,
  NotificationRepositoryPort,
} from '../ports/notification.repository.port';

export interface LeadCreatedPayload {
  leadId: string;
  assignedTo: string;
  customerName: string;
}

export interface StageChangedPayload {
  leadId: string;
  customerName: string;
  previousStage: string;
  newStage: string;
}

export interface NoteAddedPayload {
  leadId: string;
  customerName: string;
  addedByName: string;
  notePreview: string;
}

export interface PMAssignedPayload {
  leadId: string;
  pmName: string;
  customerName: string;
}

export interface ScoreboardPayload {
  leadId: string;
  customerName: string;
  newStage: string;
}

@Injectable()
export class GoogleChatNotificationService {
  private readonly logger = new Logger(GoogleChatNotificationService.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepo: NotificationRepositoryPort,
    private readonly chatService: GoogleChatService,
  ) {}

  async handleLeadCreated(payload: LeadCreatedPayload): Promise<void> {
    if (!this.chatService.isConfigured()) return;

    const lead = await this.notificationRepo.findLeadWithStakeholders(payload.leadId);
    if (!lead) return;

    const address = lead.property
      ? `${lead.property.streetAddress}, ${lead.property.city}, ${lead.property.state}`
      : '';

    const displayName = address
      ? `${payload.customerName} | ${address}`
      : payload.customerName;

    // Collect team emails for the space
    const members = new Set<string>();
    for (const a of lead.assignments ?? []) {
      if (a.user?.email) members.add(a.user.email);
    }
    if (lead.projectManager?.email) members.add(lead.projectManager.email);

    const space = await this.chatService.createSpace({
      displayName,
      members: Array.from(members),
    });

    // Save space name to lead metadata
    const existingMetadata = (lead.metadata as Record<string, unknown>) ?? {};
    await this.notificationRepo.updateLeadMetadata(payload.leadId, {
      ...existingMetadata,
      googleChatSpaceName: space.spaceName,
    });

    this.logger.log(`Google Chat space created for lead ${payload.leadId}`);
  }

  async handleStageChanged(payload: StageChangedPayload): Promise<void> {
    if (!this.chatService.isConfigured()) return;

    const spaceName = await this.getSpaceName(payload.leadId);
    if (!spaceName) return;

    const formattedPrev = this.formatStage(payload.previousStage);
    const formattedNew = this.formatStage(payload.newStage);

    await this.chatService.sendMessage(
      spaceName,
      `📋 *Stage Update*: ${payload.customerName} moved from *${formattedPrev}* to *${formattedNew}*`,
    );
  }

  async handleNoteAdded(payload: NoteAddedPayload): Promise<void> {
    if (!this.chatService.isConfigured()) return;

    const spaceName = await this.getSpaceName(payload.leadId);
    if (!spaceName) return;

    await this.chatService.sendMessage(
      spaceName,
      `📝 *New Note* by ${payload.addedByName}: "${payload.notePreview}"`,
    );
  }

  async handlePMAssigned(payload: PMAssignedPayload): Promise<void> {
    if (!this.chatService.isConfigured()) return;

    const spaceName = await this.getSpaceName(payload.leadId);
    if (!spaceName) return;

    await this.chatService.sendMessage(
      spaceName,
      `👤 *PM Assigned*: ${payload.pmName} is now the Project Manager for ${payload.customerName}`,
    );
  }

  async handleScoreboard(payload: ScoreboardPayload): Promise<void> {
    if (!this.chatService.isConfigured()) return;

    const milestones = ['WON', 'CUSTOMER_SUCCESS'];
    if (!milestones.includes(payload.newStage)) return;

    const lead = await this.notificationRepo.findLeadWithPrimaryAssignment(payload.leadId);

    const repName = lead?.assignments?.[0]?.user
      ? `${lead.assignments[0].user.firstName} ${lead.assignments[0].user.lastName}`
      : 'Unknown';

    const stageEmoji: Record<string, string> = {
      WON: '🏆',
      CUSTOMER_SUCCESS: '☀️',
    };

    const emoji = stageEmoji[payload.newStage] ?? '📌';
    const message = `${emoji} *${this.formatStage(payload.newStage)}*: ${payload.customerName} by *${repName}*!`;

    const scoreboardSpace = process.env.GOOGLE_CHAT_SCOREBOARD_SPACE;
    if (scoreboardSpace) {
      await this.chatService.sendCard(
        scoreboardSpace,
        `${emoji} ${this.formatStage(payload.newStage)}`,
        `${payload.customerName}`,
        [
          { label: 'Sales Rep', value: repName },
          { label: 'Stage', value: this.formatStage(payload.newStage) },
        ],
      );
    }

    this.logger.log(`Scoreboard: ${message}`);
  }

  private async getSpaceName(leadId: string): Promise<string | undefined> {
    const lead = await this.notificationRepo.findLeadMetadata(leadId);
    return (lead?.metadata as Record<string, unknown>)?.googleChatSpaceName as string | undefined;
  }

  private formatStage(s: string): string {
    return (s || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
