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
import { DASHBOARD_REPOSITORY } from './application/ports/dashboard.repository.port';
import { SETTINGS_REPOSITORY } from './application/ports/settings.repository.port';
import { PrismaDashboardRepository } from './infrastructure/repositories/prisma-dashboard.repository';
import { PrismaSettingsRepository } from './infrastructure/repositories/prisma-settings.repository';
import { DashboardCacheInvalidationListener } from './application/listeners/dashboard-cache-invalidation.listener';

const QueryHandlers = [GetDashboardHandler, GetScoreboardHandler];

@Module({
  imports: [CqrsModule, PrismaModule, ConfigModule],
  controllers: [DashboardController, SettingsController],
  providers: [
    ...QueryHandlers,
    DashboardMetricsService,
    SettingsService,
    { provide: DASHBOARD_REPOSITORY, useClass: PrismaDashboardRepository },
    { provide: SETTINGS_REPOSITORY, useClass: PrismaSettingsRepository },
    DashboardCacheInvalidationListener,
  ],
})
export class DashboardModule {}
