import { Inject, Injectable, Logger } from '@nestjs/common';
import { CoinService } from './coin.service';
import { LeadStageChangedPayload } from '../../../crm/application/events/lead-events.types';
import {
  GAMIFICATION_EVENT_REPOSITORY,
  GamificationEventRepositoryPort,
} from '../ports/gamification-event.repository.port';

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
export class GamificationScoringService {
  private readonly logger = new Logger(GamificationScoringService.name);

  constructor(
    @Inject(GAMIFICATION_EVENT_REPOSITORY)
    private readonly eventRepo: GamificationEventRepositoryPort,
    private readonly coinService: CoinService,
  ) {}

  async processStageChange(payload: LeadStageChangedPayload): Promise<void> {
    const stageConfig = STAGE_POINTS[payload.newStage];
    if (!stageConfig) return;

    const lead = await this.eventRepo.findLeadWithPrimaryAssignment(payload.leadId);

    if (!lead) return;

    const primaryAssignment = lead.assignments?.[0];
    if (!primaryAssignment) return;

    const userId = primaryAssignment.user.id;

    if (await this.isDuplicate(userId, stageConfig.eventType)) {
      return;
    }

    const coinsEarned = this.calculateCoins(payload.newStage, Number(lead.kw ?? 0));

    const event = await this.eventRepo.create({
      userId,
      leadId: payload.leadId,
      eventType: stageConfig.eventType,
      points: stageConfig.points,
      coins: coinsEarned,
      minuteBucket: Math.floor(Date.now() / 60000),
      metadata: {
        customerName: payload.customerName,
        previousStage: payload.previousStage,
        newStage: payload.newStage,
        kw: Number(lead.kw ?? 0),
      },
    });

    this.logger.log(
      `Gamification: ${stageConfig.eventType} for user ${userId} — ${stageConfig.points} pts, ${coinsEarned} coins`,
    );

    if (coinsEarned > 0) {
      await this.coinService.addCoins(
        userId,
        coinsEarned,
        `${stageConfig.eventType} — ${payload.customerName} (${Number(lead.kw ?? 0)} kW)`,
        event.id,
      );
    }
  }

  async isDuplicate(userId: string, eventType: string): Promise<boolean> {
    const minuteBucket = Math.floor(Date.now() / 60000);

    const existing = await this.eventRepo.findByUniqueKey(userId, eventType, minuteBucket);

    if (existing) {
      this.logger.debug(
        `Dedup: gamification event ${eventType} already exists for user ${userId} in minute ${minuteBucket}`,
      );
      return true;
    }

    return false;
  }

  calculateCoins(stage: string, systemSizeKw: number): number {
    const coinMultiplier = STAGE_COIN_MULTIPLIERS[stage] ?? 0;
    return coinMultiplier * systemSizeKw;
  }
}
