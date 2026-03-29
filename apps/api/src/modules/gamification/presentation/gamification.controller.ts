import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { CoinService } from '../application/services/coin.service';
import { LeaderboardService } from '../application/services/leaderboard.service';

@ApiTags('gamification')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
@Controller('gamification')
export class GamificationController {
  constructor(
    private readonly coinService: CoinService,
    private readonly leaderboardService: LeaderboardService,
  ) {}

  @Get('balance')
  @ApiOperation({ summary: 'Get current user coin balance' })
  async getBalance(@CurrentUser() user: AuthenticatedUser) {
    const balance = await this.coinService.getBalance(user.id);
    return { balance };
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get points leaderboard' })
  @ApiQuery({ name: 'period', enum: ['weekly', 'monthly'], required: false })
  async getLeaderboard(@Query('period') period?: string) {
    if (period === 'monthly') return this.leaderboardService.getMonthlyLeaderboard();
    return this.leaderboardService.getWeeklyLeaderboard();
  }

  @Get('history')
  @ApiOperation({ summary: 'Get coin transaction history' })
  @ApiQuery({ name: 'limit', required: false })
  async getHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: string,
  ) {
    return this.coinService.getHistory(user.id, limit ? parseInt(limit, 10) : 50);
  }

  @Get('scoreboard')
  @ApiOperation({ summary: 'Get recent milestone events' })
  @ApiQuery({ name: 'limit', required: false })
  async getScoreboard(@Query('limit') limit?: string) {
    return this.leaderboardService.getScoreboard(limit ? parseInt(limit, 10) : 20);
  }
}
