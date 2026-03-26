import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { CoinService } from '../services/coin.service';
import { GoogleChatService } from '../../../../integrations/google-chat/google-chat.service';

interface LeadStageChangedPayload {
  leadId: string;
  customerName: string;
  previousStage: string;
  newStage: string;
}

/** Points awarded per milestone stage */
const STAGE_POINTS: Record<string, { eventType: string; points: number }> = {
  CONNECTED: { eventType: 'CONNECTED', points: 2 },
  WON: { eventType: 'SALE', points: 4 },
  CUSTOMER_SUCCESS: { eventType: 'CUSTOMER_SUCCESS', points: 8 },
};

/** Coin multipliers: coins = multiplier * kw */
const STAGE_COIN_MULTIPLIERS: Record<string, number> = {
  WON: 2,
  CUSTOMER_SUCCESS: 5,
};

@Injectable()
export class GamificationEventListener {
  private readonly logger = new Logger(GamificationEventListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly coinService: CoinService,
    private readonly chatService: GoogleChatService,
  ) {}

  @OnEvent('lead.stageChanged')
  async handleStageChanged(payload: LeadStageChangedPayload): Promise<void> {
    const stageConfig = STAGE_POINTS[payload.newStage];
    if (!stageConfig) return;

    try {
      // Get lead with primary assignment
      const lead = await this.prisma.lead.findUnique({
        where: { id: payload.leadId },
        include: {
          assignments: {
            where: { isPrimary: true },
            include: { user: { select: { id: true, firstName: true, lastName: true, closedDealEmoji: true } } },
          },
        },
      });

      if (!lead) return;

      const primaryAssignment = lead.assignments?.[0];
      if (!primaryAssignment) return;

      const userId = primaryAssignment.user.id;
      const minuteBucket = Math.floor(Date.now() / 60000);

      // Dedup: check if event already exists for this user+type+minuteBucket
      const existing = await this.prisma.gamificationEvent.findUnique({
        where: {
          userId_eventType_minuteBucket: {
            userId,
            eventType: stageConfig.eventType,
            minuteBucket,
          },
        },
      });

      if (existing) {
        this.logger.debug(
          `Dedup: gamification event ${stageConfig.eventType} already exists for user ${userId} in minute ${minuteBucket}`,
        );
        return;
      }

      // Calculate coins based on kw
      const kw = Number(lead.kw ?? 0);
      const coinMultiplier = STAGE_COIN_MULTIPLIERS[payload.newStage] ?? 0;
      const coinsEarned = coinMultiplier * kw;

      // Create gamification event
      const event = await this.prisma.gamificationEvent.create({
        data: {
          userId,
          leadId: payload.leadId,
          eventType: stageConfig.eventType,
          points: stageConfig.points,
          coins: coinsEarned,
          minuteBucket,
          metadata: {
            customerName: payload.customerName,
            previousStage: payload.previousStage,
            newStage: payload.newStage,
            kw,
          },
        },
      });

      this.logger.log(
        `Gamification: ${stageConfig.eventType} for user ${userId} — ${stageConfig.points} pts, ${coinsEarned} coins`,
      );

      // Award coins if applicable
      if (coinsEarned > 0) {
        await this.coinService.addCoins(
          userId,
          coinsEarned,
          `${stageConfig.eventType} — ${payload.customerName} (${kw} kW)`,
          event.id,
        );
      }

      // Send Google Chat scoreboard message
      await this.sendScoreboardMessage(
        payload,
        primaryAssignment.user,
        stageConfig,
        coinsEarned,
        kw,
      );
    } catch (error: any) {
      this.logger.error(
        `Gamification event failed for lead ${payload.leadId}: ${error.message}`,
        error.stack,
      );
    }
  }

  private async sendScoreboardMessage(
    payload: LeadStageChangedPayload,
    user: { firstName: string; lastName: string; closedDealEmoji: string | null },
    stageConfig: { eventType: string; points: number },
    coinsEarned: number,
    kw: number,
  ): Promise<void> {
    if (!this.chatService.isConfigured()) return;

    const scoreboardSpace = process.env.GOOGLE_CHAT_SCOREBOARD_SPACE;
    if (!scoreboardSpace) return;

    const emoji = user.closedDealEmoji ?? '🎉';
    const repName = `${user.firstName} ${user.lastName}`;

    const stageEmoji: Record<string, string> = {
      CONNECTED: '🤝',
      WON: '🏆',
      CUSTOMER_SUCCESS: '☀️',
    };

    try {
      await this.chatService.sendCard(
        scoreboardSpace,
        `${stageEmoji[payload.newStage] ?? '📌'} ${this.formatStage(payload.newStage)}`,
        payload.customerName,
        [
          { label: 'Sales Rep', value: `${emoji} ${repName}` },
          { label: 'Points', value: `+${stageConfig.points}` },
          ...(coinsEarned > 0
            ? [{ label: 'Coins', value: `+${coinsEarned} (${kw} kW)` }]
            : []),
        ],
      );
    } catch (error: any) {
      this.logger.warn(`Scoreboard notification failed: ${error.message}`);
    }
  }

  private formatStage(s: string): string {
    return (s || '')
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
