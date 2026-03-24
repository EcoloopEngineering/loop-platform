import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { DashboardController } from './presentation/dashboard.controller';
import { SettingsController } from './presentation/settings.controller';
import { GetDashboardHandler } from './application/queries/get-dashboard.handler';
import { GetScoreboardHandler } from './application/queries/get-scoreboard.handler';

const QueryHandlers = [GetDashboardHandler, GetScoreboardHandler];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [DashboardController, SettingsController],
  providers: [...QueryHandlers],
})
export class DashboardModule {}
