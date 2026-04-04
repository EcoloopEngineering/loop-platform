import { Controller, Get, Put, Post, Query, Body } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';
import { UserRole } from '@loop/shared';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { GetDashboardQuery } from '../application/queries/get-dashboard.handler';
import { GetScoreboardQuery } from '../application/queries/get-scoreboard.handler';
import { DashboardMetricsService } from '../application/services/dashboard-metrics.service';
import { ScoreboardEmailService } from '../application/services/scoreboard-email.service';
import { SendScoreboardEmailDto } from '../application/dto/send-scoreboard-email.dto';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

export class UpdateGoalDto {
  @IsNumber()
  @Min(0)
  amount: number;
}

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly metricsService: DashboardMetricsService,
    private readonly scoreboardEmailService: ScoreboardEmailService,
    private readonly prisma: PrismaService,
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

  @Post('scoreboard/send-email')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Send scoreboard report via email (admin only)' })
  async sendScoreboardEmail(@Body() dto: SendScoreboardEmailDto) {
    return this.scoreboardEmailService.sendScoreboardEmail(
      new Date(dto.startDate),
      new Date(dto.endDate),
      dto.recipients,
    );
  }

  @Get('goals')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Get current user annual goal' })
  async getGoal(@CurrentUser() user: AuthenticatedUser) {
    const goal = await this.prisma.userGoal.findUnique({
      where: { userId: user.id },
    });

    return goal ?? { annualGoal: 0 };
  }

  @Put('goals')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Set or update annual goal' })
  async updateGoal(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateGoalDto,
  ) {
    return this.prisma.userGoal.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        annualGoal: dto.amount,
      },
      update: {
        annualGoal: dto.amount,
      },
    });
  }
}
