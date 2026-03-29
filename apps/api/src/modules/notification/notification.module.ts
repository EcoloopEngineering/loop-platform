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
    EmailProcessor,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
