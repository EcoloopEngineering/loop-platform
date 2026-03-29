import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  GoogleChatNotificationService,
  LeadCreatedPayload,
  StageChangedPayload,
  NoteAddedPayload,
  PMAssignedPayload,
  ScoreboardPayload,
} from '../services/google-chat-notification.service';

@Injectable()
export class GoogleChatListener {
  private readonly logger = new Logger(GoogleChatListener.name);

  constructor(
    private readonly googleChatNotificationService: GoogleChatNotificationService,
  ) {}

  @OnEvent('lead.created')
  async handleLeadCreated(payload: LeadCreatedPayload): Promise<void> {
    try {
      await this.googleChatNotificationService.handleLeadCreated(payload);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to create Google Chat space: ${message}`);
    }
  }

  @OnEvent('lead.stageChanged')
  async handleStageChanged(payload: StageChangedPayload): Promise<void> {
    try {
      await this.googleChatNotificationService.handleStageChanged(payload);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to send stage change to Google Chat: ${message}`);
    }
  }

  @OnEvent('lead.noteAdded')
  async handleNoteAdded(payload: NoteAddedPayload): Promise<void> {
    try {
      await this.googleChatNotificationService.handleNoteAdded(payload);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to send note to Google Chat: ${message}`);
    }
  }

  @OnEvent('lead.pmAssigned')
  async handlePMAssigned(payload: PMAssignedPayload): Promise<void> {
    try {
      await this.googleChatNotificationService.handlePMAssigned(payload);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to send PM assignment to Google Chat: ${message}`);
    }
  }

  @OnEvent('lead.stageChanged')
  async handleScoreboard(payload: ScoreboardPayload): Promise<void> {
    try {
      await this.googleChatNotificationService.handleScoreboard(payload);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Scoreboard notification failed: ${message}`);
    }
  }
}
