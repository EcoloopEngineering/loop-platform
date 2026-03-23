import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CqrsModule } from '@nestjs/cqrs';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    CqrsModule.forRoot(),
    PrismaModule,
    FirebaseModule,
    EmailModule,
    PdfModule,
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
  ],
})
export class AppModule {}
