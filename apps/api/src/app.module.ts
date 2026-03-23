import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CqrsModule } from '@nestjs/cqrs';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
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
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
