import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { CoinService } from './application/services/coin.service';
import { LeaderboardService } from './application/services/leaderboard.service';
import { RewardOrderService } from './application/services/reward-order.service';
import { GamificationScoringService } from './application/services/gamification-scoring.service';
import { GamificationEventListener } from './application/listeners/gamification-event.listener';
import { GamificationController } from './presentation/gamification.controller';
import { RewardsController } from './presentation/rewards.controller';
import { COIN_REPOSITORY } from './application/ports/coin.repository.port';
import { GAMIFICATION_EVENT_REPOSITORY } from './application/ports/gamification-event.repository.port';
import { REWARD_REPOSITORY } from './application/ports/reward.repository.port';
import { PrismaCoinRepository } from './infrastructure/repositories/prisma-coin.repository';
import { PrismaGamificationEventRepository } from './infrastructure/repositories/prisma-gamification-event.repository';
import { PrismaRewardRepository } from './infrastructure/repositories/prisma-reward.repository';

@Module({
  imports: [PrismaModule],
  controllers: [GamificationController, RewardsController],
  providers: [
    CoinService,
    LeaderboardService,
    RewardOrderService,
    GamificationScoringService,
    GamificationEventListener,
    { provide: COIN_REPOSITORY, useClass: PrismaCoinRepository },
    { provide: GAMIFICATION_EVENT_REPOSITORY, useClass: PrismaGamificationEventRepository },
    { provide: REWARD_REPOSITORY, useClass: PrismaRewardRepository },
  ],
  exports: [CoinService, LeaderboardService],
})
export class GamificationModule {}
