import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { NotificationController } from './presentation/notification.controller';
import { NotificationService } from './application/services/notification.service';
import { LeadEventListener } from './application/listeners/lead-event.listener';
import { StageEmailListener } from './application/listeners/stage-email.listener';
import { GoogleChatListener } from './application/listeners/google-chat.listener';
import { IntegrationsModule } from '../../integrations/integrations.module';

@Module({
  imports: [CqrsModule, PrismaModule, IntegrationsModule],
  controllers: [NotificationController],
  providers: [NotificationService, LeadEventListener, StageEmailListener, GoogleChatListener],
  exports: [NotificationService],
})
export class NotificationModule {}

