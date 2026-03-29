import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@loop/shared';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { GetDashboardQuery } from '../application/queries/get-dashboard.handler';
import { GetScoreboardQuery } from '../application/queries/get-scoreboard.handler';
import { DashboardMetricsService } from '../application/services/dashboard-metrics.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly metricsService: DashboardMetricsService,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get dashboard summary for the current user' })
  async getDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.queryBus.execute(
      new GetDashboardQuery(user.id, startDate, endDate),
    );
  }

  @Get('scoreboard')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
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
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get aggregated platform metrics' })
  async getMetrics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.metricsService.getMetrics(startDate, endDate);
  }
}
