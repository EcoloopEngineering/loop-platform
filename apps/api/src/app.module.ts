import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CqrsModule } from '@nestjs/cqrs';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { FirebaseAuthGuard } from './common/guards/firebase-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { UserThrottlerGuard } from './common/guards/user-throttler.guard';
import { PrismaModule } from './infrastructure/database/prisma.module';
import { FirebaseModule } from './infrastructure/firebase/firebase.module';
import { IdentityModule } from './modules/identity/identity.module';
import { CrmModule } from './modules/crm/crm.module';
import { DesignModule } from './modules/design/design.module';
import { SchedulingModule } from './modules/scheduling/scheduling.module';
import { CommissionModule } from './modules/commission/commission.module';
import { NotificationModule } from './modules/notification/notification.module';
import { DocumentModule } from './modules/document/document.module';
import { FormModule } from './modules/form/form.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { EmailModule } from './infrastructure/email/email.module';
import { PdfModule } from './infrastructure/pdf/pdf.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { ChatModule } from './modules/chat/chat.module';
import { TaskModule } from './modules/task/task.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { HealthModule } from './infrastructure/health/health.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { WebhookEventModule } from './infrastructure/webhook/webhook-event.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    CqrsModule.forRoot(),
    ThrottlerModule.forRoot([{
      ttl: 60000,  // 1 minute window
      limit: 100,  // 100 requests per minute
    }]),
    PrismaModule,
    FirebaseModule,
    QueueModule.forRoot(),
    CacheModule,
    WebhookEventModule,
    EmailModule,
    PdfModule,
    StorageModule,
    IdentityModule,
    CrmModule,
    DesignModule,
    SchedulingModule,
    CommissionModule,
    NotificationModule,
    DocumentModule,
    FormModule,
    DashboardModule,
    IntegrationsModule,
    ChatModule,
    TaskModule,
    GamificationModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: UserThrottlerGuard },
    { provide: APP_GUARD, useClass: FirebaseAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
