import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { NotificationController } from './presentation/notification.controller';
import { NotificationService } from './application/services/notification.service';
import { LeadCreatedNotificationListener } from './application/listeners/lead-created-notification.listener';
import { LeadStageNotificationListener } from './application/listeners/lead-stage-notification.listener';
import { LeadAssignmentNotificationListener } from './application/listeners/lead-assignment-notification.listener';
import { StageEmailListener } from './application/listeners/stage-email.listener';
import { GoogleChatListener } from './application/listeners/google-chat.listener';
import { IntegrationsModule } from '../../integrations/integrations.module';
import { EmailProcessor } from '../../infrastructure/queue/processors/email.processor';
import { NOTIFICATION_REPOSITORY } from './application/ports/notification.repository.port';
import { PrismaNotificationRepository } from './infrastructure/repositories/prisma-notification.repository';
import { StageEmailService } from './application/services/stage-email.service';
import { GoogleChatNotificationService } from './application/services/google-chat-notification.service';

@Module({
  imports: [CqrsModule, PrismaModule, IntegrationsModule],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    LeadCreatedNotificationListener,
    LeadStageNotificationListener,
    LeadAssignmentNotificationListener,
    StageEmailListener,
    GoogleChatListener,
    StageEmailService,
    GoogleChatNotificationService,
    EmailProcessor,
    { provide: NOTIFICATION_REPOSITORY, useClass: PrismaNotificationRepository },
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
