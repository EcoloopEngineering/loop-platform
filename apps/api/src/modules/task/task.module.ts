import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { IntegrationsModule } from '../../integrations/integrations.module';
import { TaskController } from './presentation/task.controller';
import { TaskTemplateController } from './presentation/task-template.controller';
import { TaskService } from './application/services/task.service';
import { TASK_REPOSITORY } from './application/ports/task.repository.port';
import { PrismaTaskRepository } from './infrastructure/repositories/prisma-task.repository';
import { StageTaskListener } from './application/listeners/stage-task.listener';
import { TaskCompletedListener } from './application/listeners/task-completed.listener';

@Module({
  imports: [PrismaModule, CqrsModule, IntegrationsModule],
  controllers: [TaskController, TaskTemplateController],
  providers: [
    TaskService,
    {
      provide: TASK_REPOSITORY,
      useClass: PrismaTaskRepository,
    },
    StageTaskListener,
    TaskCompletedListener,
  ],
  exports: [TASK_REPOSITORY, TaskService],
})
export class TaskModule {}
