import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { DashboardController } from './presentation/dashboard.controller';
import { SettingsController } from './presentation/settings.controller';
import { GetDashboardHandler } from './application/queries/get-dashboard.handler';
import { GetScoreboardHandler } from './application/queries/get-scoreboard.handler';
import { DashboardMetricsService } from './application/services/dashboard-metrics.service';
import { SettingsService } from './application/services/settings.service';

const QueryHandlers = [GetDashboardHandler, GetScoreboardHandler];

@Module({
  imports: [CqrsModule, PrismaModule, ConfigModule],
  controllers: [DashboardController, SettingsController],
  providers: [...QueryHandlers, DashboardMetricsService, SettingsService],
})
export class DashboardModule {}
