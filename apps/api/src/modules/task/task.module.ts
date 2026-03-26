import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { IntegrationsModule } from '../../integrations/integrations.module';
import { TaskController } from './presentation/task.controller';
import { TaskTemplateController } from './presentation/task-template.controller';
import { StageTaskListener } from './application/listeners/stage-task.listener';
import { TaskCompletedListener } from './application/listeners/task-completed.listener';

@Module({
  imports: [PrismaModule, CqrsModule, IntegrationsModule],
  controllers: [TaskController, TaskTemplateController],
  providers: [StageTaskListener, TaskCompletedListener],
})
export class TaskModule {}
