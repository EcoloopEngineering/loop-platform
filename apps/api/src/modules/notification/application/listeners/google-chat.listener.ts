import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { GoogleChatService } from '../../../../integrations/google-chat/google-chat.service';

@Injectable()
export class GoogleChatListener {
  private readonly logger = new Logger(GoogleChatListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatService: GoogleChatService,
  ) {}

  /**
   * When a lead is created, optionally create a Google Chat space
   */
  @OnEvent('lead.created')
  async handleLeadCreated(payload: {
    leadId: string;
    assignedTo: string;
    customerName: string;
  }): Promise<void> {
    if (!this.chatService.isConfigured()) return;

    try {
      const lead = await this.prisma.lead.findUnique({
        where: { id: payload.leadId },
        include: {
          property: { select: { streetAddress: true, city: true, state: true } },
          assignments: {
            include: { user: { select: { email: true } } },
          },
          projectManager: { select: { email: true } },
        },
      });

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
      await this.prisma.lead.update({
        where: { id: payload.leadId },
        data: {
          metadata: {
            ...((lead.metadata as Record<string, unknown>) ?? {}),
            googleChatSpaceName: space.spaceName,
          },
        },
      });

      this.logger.log(`Google Chat space created for lead ${payload.leadId}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to create Google Chat space: ${message}`);
    }
  }

  /**
   * When a lead stage changes, send a message to the space
   */
  @OnEvent('lead.stageChanged')
  async handleStageChanged(payload: {
    leadId: string;
    customerName: string;
    previousStage: string;
    newStage: string;
  }): Promise<void> {
    if (!this.chatService.isConfigured()) return;

    try {
      const lead = await this.prisma.lead.findUnique({
        where: { id: payload.leadId },
        select: { metadata: true },
      });

      const spaceName = (lead?.metadata as Record<string, unknown>)?.googleChatSpaceName as string | undefined;
      if (!spaceName) return;

      const formattedPrev = this.formatStage(payload.previousStage);
      const formattedNew = this.formatStage(payload.newStage);

      await this.chatService.sendMessage(
        spaceName,
        `📋 *Stage Update*: ${payload.customerName} moved from *${formattedPrev}* to *${formattedNew}*`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to send stage change to Google Chat: ${message}`);
    }
  }

  /**
   * When a note is added, notify the space
   */
  @OnEvent('lead.noteAdded')
  async handleNoteAdded(payload: {
    leadId: string;
    customerName: string;
    addedByName: string;
    notePreview: string;
  }): Promise<void> {
    if (!this.chatService.isConfigured()) return;

    try {
      const lead = await this.prisma.lead.findUnique({
        where: { id: payload.leadId },
        select: { metadata: true },
      });

      const spaceName = (lead?.metadata as Record<string, unknown>)?.googleChatSpaceName as string | undefined;
      if (!spaceName) return;

      await this.chatService.sendMessage(
        spaceName,
        `📝 *New Note* by ${payload.addedByName}: "${payload.notePreview}"`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to send note to Google Chat: ${message}`);
    }
  }

  /**
   * When PM is assigned, notify the space
   */
  @OnEvent('lead.pmAssigned')
  async handlePMAssigned(payload: {
    leadId: string;
    pmName: string;
    customerName: string;
  }): Promise<void> {
    if (!this.chatService.isConfigured()) return;

    try {
      const lead = await this.prisma.lead.findUnique({
        where: { id: payload.leadId },
        select: { metadata: true },
      });

      const spaceName = (lead?.metadata as Record<string, unknown>)?.googleChatSpaceName as string | undefined;
      if (!spaceName) return;

      await this.chatService.sendMessage(
        spaceName,
        `👤 *PM Assigned*: ${payload.pmName} is now the Project Manager for ${payload.customerName}`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to send PM assignment to Google Chat: ${message}`);
    }
  }

  /**
   * Scoreboard notification (replaces Discord)
   */
  @OnEvent('lead.stageChanged')
  async handleScoreboard(payload: {
    leadId: string;
    customerName: string;
    newStage: string;
  }): Promise<void> {
    if (!this.chatService.isConfigured()) return;

    // Only notify on milestone stages
    const milestones = ['WON', 'CUSTOMER_SUCCESS'];
    if (!milestones.includes(payload.newStage)) return;

    try {
      const lead = await this.prisma.lead.findUnique({
        where: { id: payload.leadId },
        include: {
          assignments: {
            where: { isPrimary: true },
            include: { user: { select: { firstName: true, lastName: true } } },
          },
        },
      });

      const repName = lead?.assignments?.[0]?.user
        ? `${lead.assignments[0].user.firstName} ${lead.assignments[0].user.lastName}`
        : 'Unknown';

      const stageEmoji: Record<string, string> = {
        WON: '🏆',
        CUSTOMER_SUCCESS: '☀️',
      };

      const emoji = stageEmoji[payload.newStage] ?? '📌';
      const message = `${emoji} *${this.formatStage(payload.newStage)}*: ${payload.customerName} by *${repName}*!`;

      // Send to a scoreboard space (configurable)
      // For now, log it — configure GOOGLE_CHAT_SCOREBOARD_SPACE in .env
      const scoreboardSpace = process.env.GOOGLE_CHAT_SCOREBOARD_SPACE;
      if (scoreboardSpace) {
        await this.chatService.sendCard(scoreboardSpace, `${emoji} ${this.formatStage(payload.newStage)}`, `${payload.customerName}`, [
          { label: 'Sales Rep', value: repName },
          { label: 'Stage', value: this.formatStage(payload.newStage) },
        ]);
      }

      this.logger.log(`Scoreboard: ${message}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Scoreboard notification failed: ${message}`);
    }
  }

  private formatStage(s: string): string {
    return (s || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
