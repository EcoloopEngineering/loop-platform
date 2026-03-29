import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { CoinService } from './application/services/coin.service';
import { LeaderboardService } from './application/services/leaderboard.service';
import { RewardOrderService } from './application/services/reward-order.service';
import { GamificationEventListener } from './application/listeners/gamification-event.listener';
import { GamificationController } from './presentation/gamification.controller';
import { RewardsController } from './presentation/rewards.controller';

@Module({
  imports: [PrismaModule],
  controllers: [GamificationController, RewardsController],
  providers: [CoinService, LeaderboardService, RewardOrderService, GamificationEventListener],
  exports: [CoinService, LeaderboardService],
})
export class GamificationModule {}
