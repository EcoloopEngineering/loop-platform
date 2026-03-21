import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { GetDashboardQuery } from '../application/queries/get-dashboard.handler';
import { GetScoreboardQuery } from '../application/queries/get-scoreboard.handler';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get dashboard summary for the current user' })
  async getDashboard(
    @CurrentUser() user: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.queryBus.execute(
      new GetDashboardQuery(user.id, startDate, endDate),
    );
  }

  @Get('scoreboard')
  @ApiOperation({ summary: 'Get scoreboard ranking users by won deals and commission' })
  async getScoreboard(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('limit') limit?: string,
  ) {
    return this.queryBus.execute(
      new GetScoreboardQuery(startDate, endDate, limit ? parseInt(limit, 10) : 10),
    );
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get aggregated platform metrics' })
  async getMetrics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const dateFilter = {
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };

    const [totalLeads, wonLeads, totalCommission, activeUsers] =
      await Promise.all([
        this.prisma.lead.count({ where: dateFilter }),
        this.prisma.lead.count({ where: { stage: 'WON', ...dateFilter } }),
        this.prisma.commission.aggregate({
          where: { status: 'FINALIZED', ...dateFilter },
          _sum: { calculatedAmount: true },
        }),
        this.prisma.user.count({ where: { isActive: true } }),
      ]);

    return {
      totalLeads,
      wonLeads,
      conversionRate: totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0,
      totalCommission: totalCommission._sum.calculatedAmount ?? 0,
      activeUsers,
    };
  }
}
