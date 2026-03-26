import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CoinService } from '../application/services/coin.service';
import { LeaderboardService } from '../application/services/leaderboard.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@ApiTags('gamification')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
@Controller('gamification')
export class GamificationController {
  constructor(
    private readonly coinService: CoinService,
    private readonly leaderboardService: LeaderboardService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('balance')
  @ApiOperation({ summary: 'Get current user coin balance' })
  async getBalance(@CurrentUser() user: any) {
    const balance = await this.coinService.getBalance(user.id);
    return { balance };
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get points leaderboard' })
  @ApiQuery({ name: 'period', enum: ['weekly', 'monthly'], required: false })
  async getLeaderboard(@Query('period') period?: string) {
    if (period === 'monthly') {
      return this.leaderboardService.getMonthlyLeaderboard();
    }
    return this.leaderboardService.getWeeklyLeaderboard();
  }

  @Get('history')
  @ApiOperation({ summary: 'Get coin transaction history' })
  @ApiQuery({ name: 'limit', required: false })
  async getHistory(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
  ) {
    const take = limit ? parseInt(limit, 10) : 50;
    return this.coinService.getHistory(user.id, take);
  }

  @Get('scoreboard')
  @ApiOperation({ summary: 'Get recent milestone events' })
  @ApiQuery({ name: 'limit', required: false })
  async getScoreboard(@Query('limit') limit?: string) {
    const take = limit ? parseInt(limit, 10) : 20;

    return this.prisma.gamificationEvent.findMany({
      where: {
        eventType: { in: ['CONNECTED', 'SALE', 'CUSTOMER_SUCCESS'] },
      },
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        user: { select: { firstName: true, lastName: true, closedDealEmoji: true } },
        lead: {
          select: {
            customer: { select: { firstName: true, lastName: true } },
            kw: true,
          },
        },
      },
    });
  }
}
