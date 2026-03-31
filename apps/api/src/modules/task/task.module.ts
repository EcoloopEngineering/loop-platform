import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { IntegrationsModule } from '../../integrations/integrations.module';
import { TaskController } from './presentation/task.controller';
import { TaskTemplateController } from './presentation/task-template.controller';
import { TaskService } from './application/services/task.service';
import { TaskTemplateService } from './application/services/task-template.service';
import { TaskCreationService } from './application/services/task-creation.service';
import { TASK_REPOSITORY } from './application/ports/task.repository.port';
import { PrismaTaskRepository } from './infrastructure/repositories/prisma-task.repository';
import { StageTaskListener } from './application/listeners/stage-task.listener';
import { TaskCompletedListener } from './application/listeners/task-completed.listener';
import { TaskStatusChangedListener } from './application/listeners/task-status-changed.listener';

@Module({
  imports: [PrismaModule, CqrsModule, IntegrationsModule],
  controllers: [TaskController, TaskTemplateController],
  providers: [
    TaskService,
    TaskTemplateService,
    TaskCreationService,
    {
      provide: TASK_REPOSITORY,
      useClass: PrismaTaskRepository,
    },
    StageTaskListener,
    TaskCompletedListener,
    TaskStatusChangedListener,
  ],
  exports: [TASK_REPOSITORY, TaskService, TaskTemplateService],
})
export class TaskModule {}
