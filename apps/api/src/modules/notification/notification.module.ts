import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { NotificationController } from './presentation/notification.controller';
import { NotificationService } from './application/services/notification.service';
import { LeadEventListener } from './application/listeners/lead-event.listener';

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [NotificationController],
  providers: [NotificationService, LeadEventListener],
  exports: [NotificationService],
})
export class NotificationModule {}

