import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UserRole } from '@loop/shared';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { CoinService } from '../application/services/coin.service';
import { LeaderboardService } from '../application/services/leaderboard.service';

@ApiTags('gamification')
@ApiBearerAuth()
@Controller('gamification')
export class GamificationController {
  constructor(
    private readonly coinService: CoinService,
    private readonly leaderboardService: LeaderboardService,
  ) {}

  @Get('balance')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP, UserRole.REFERRAL)
  @ApiOperation({ summary: 'Get current user coin balance' })
  async getBalance(@CurrentUser() user: AuthenticatedUser) {
    const balance = await this.coinService.getBalance(user.id);
    return { balance };
  }

  @Get('leaderboard')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Get points leaderboard' })
  @ApiQuery({ name: 'period', enum: ['weekly', 'monthly'], required: false })
  async getLeaderboard(@Query('period') period?: string) {
    if (period === 'monthly') return this.leaderboardService.getMonthlyLeaderboard();
    return this.leaderboardService.getWeeklyLeaderboard();
  }

  @Get('history')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Get coin transaction history' })
  @ApiQuery({ name: 'limit', required: false })
  async getHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: string,
  ) {
    return this.coinService.getHistory(user.id, limit ? parseInt(limit, 10) : 50);
  }

  @Get('scoreboard')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get recent milestone events' })
  @ApiQuery({ name: 'limit', required: false })
  async getScoreboard(@Query('limit') limit?: string) {
    return this.leaderboardService.getScoreboard(limit ? parseInt(limit, 10) : 20);
  }
}
