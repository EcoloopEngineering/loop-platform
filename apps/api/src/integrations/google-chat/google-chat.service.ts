import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, chat_v1 } from 'googleapis';

@Injectable()
export class GoogleChatService {
  private readonly logger = new Logger(GoogleChatService.name);
  private credentials: Record<string, unknown> | null = null;

  private readonly SCOPES = [
    'https://www.googleapis.com/auth/chat.app.spaces.create',
    'https://www.googleapis.com/auth/chat.app.spaces',
    'https://www.googleapis.com/auth/chat.app.memberships',
    'https://www.googleapis.com/auth/chat.app.messages',
    'https://www.googleapis.com/auth/chat.bot',
  ];

  constructor(private readonly config: ConfigService) {
    const credentialsB64 = this.config.get<string>('GOOGLE_ADMIN_CREDENTIALS');
    if (credentialsB64) {
      try {
        this.credentials = JSON.parse(
          Buffer.from(credentialsB64, 'base64').toString(),
        );
        this.logger.log('Google Chat service configured');
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        this.logger.warn(`Google Chat credentials invalid: ${message}`);
      }
    } else {
      this.logger.warn('Google Chat not configured — GOOGLE_ADMIN_CREDENTIALS missing');
    }
  }

  isConfigured(): boolean {
    return this.credentials !== null;
  }

  private async getClient(): Promise<chat_v1.Chat> {
    const auth = new google.auth.GoogleAuth({
      credentials: this.credentials as Record<string, unknown>,
      scopes: this.SCOPES,
    });
    return google.chat({ version: 'v1', auth });
  }

  /**
   * Create a Google Chat space for a deal/lead
   */
  async createSpace(params: {
    displayName: string;
    members?: string[]; // email addresses
  }): Promise<{ spaceName: string; displayName: string }> {
    if (!this.isConfigured()) {
      throw new Error('Google Chat not configured');
    }

    try {
      const chatClient = await this.getClient();

      // Create space
      const res = await chatClient.spaces.create({
        requestBody: {
          spaceType: 'SPACE',
          displayName: params.displayName,
          customer: 'customers/my_customer',
        },
      });

      const space = res.data;
      const spaceName = space.name!;

      this.logger.log(`Google Chat space created: ${spaceName} (${params.displayName})`);

      // Add members
      if (params.members?.length) {
        for (const email of params.members) {
          try {
            await chatClient.spaces.members.create({
              parent: spaceName,
              requestBody: {
                member: { name: `users/${email}`, type: 'HUMAN' },
              },
            });
            this.logger.debug(`Added ${email} to space ${spaceName}`);
          } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : String(err);
            this.logger.warn(`Failed to add ${email} to space: ${errMsg}`);
          }
          // Rate limit: 1 member per second
          await new Promise((r) => setTimeout(r, 1000));
        }
      }

      // Send welcome message
      await this.sendMessage(
        spaceName,
        `Welcome to the project space for *${params.displayName}*! Use @mentions to tag team members.`,
      );

      return { spaceName, displayName: params.displayName };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create Google Chat space: ${message}`);
      throw error;
    }
  }

  /**
   * Send a message to a Google Chat space
   */
  async sendMessage(spaceName: string, text: string): Promise<void> {
    if (!this.isConfigured()) {
      this.logger.debug('Google Chat not configured — skipping message');
      return;
    }

    if (!spaceName) {
      this.logger.debug('No space name provided — skipping message');
      return;
    }

    try {
      const chatClient = await this.getClient();
      await chatClient.spaces.messages.create({
        parent: spaceName,
        requestBody: { text },
      });
      this.logger.debug(`Message sent to ${spaceName}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to send Google Chat message: ${message}`);
    }
  }

  /**
   * Send a card message (rich format) to a Google Chat space
   */
  async sendCard(
    spaceName: string,
    title: string,
    subtitle: string,
    fields: { label: string; value: string }[],
    _color?: string,
  ): Promise<void> {
    if (!this.isConfigured() || !spaceName) return;

    try {
      const chatClient = await this.getClient();
      await chatClient.spaces.messages.create({
        parent: spaceName,
        requestBody: {
          cardsV2: [
            {
              cardId: `card-${Date.now()}`,
              card: {
                header: {
                  title,
                  subtitle,
                  imageUrl: 'https://ecoloop.us/logo.png',
                  imageType: 'CIRCLE',
                },
                sections: [
                  {
                    widgets: fields.map((f) => ({
                      decoratedText: {
                        topLabel: f.label,
                        text: f.value,
                      },
                    })),
                  },
                ],
              },
            },
          ],
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to send card to ${spaceName}: ${message}`);
    }
  }

  /**
   * Delete a space
   */
  async deleteSpace(spaceName: string): Promise<void> {
    if (!this.isConfigured() || !spaceName) return;

    try {
      const chatClient = await this.getClient();
      await chatClient.spaces.delete({ name: spaceName });
      this.logger.log(`Google Chat space deleted: ${spaceName}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to delete space ${spaceName}: ${message}`);
    }
  }
}
