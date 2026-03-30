import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { SalesRabbitWebhookController } from './presentation/salesrabbit-webhook.controller';
import { SalesRabbitWebhookService } from './application/services/salesrabbit-webhook.service';
import { LEAD_REPOSITORY } from './application/ports/lead.repository.port';
import { LEAD_ACTIVITY_REPOSITORY } from './application/ports/lead-activity.repository.port';
import { LEAD_ENRICHMENT_REPOSITORY } from './application/ports/lead-enrichment.repository.port';
import { CUSTOMER_REPOSITORY } from './application/ports/customer.repository.port';
import { PROPERTY_REPOSITORY } from './application/ports/property.repository.port';
import { PrismaLeadRepository } from './infrastructure/repositories/prisma-lead.repository';
import { PrismaLeadActivityRepository } from './infrastructure/repositories/prisma-lead-activity.repository';
import { PrismaLeadEnrichmentRepository } from './infrastructure/repositories/prisma-lead-enrichment.repository';
import { PrismaCustomerRepository } from './infrastructure/repositories/prisma-customer.repository';
import { PrismaPropertyRepository } from './infrastructure/repositories/prisma-property.repository';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [SalesRabbitWebhookController],
  providers: [
    SalesRabbitWebhookService,
    { provide: LEAD_REPOSITORY, useClass: PrismaLeadRepository },
    { provide: LEAD_ACTIVITY_REPOSITORY, useClass: PrismaLeadActivityRepository },
    { provide: LEAD_ENRICHMENT_REPOSITORY, useClass: PrismaLeadEnrichmentRepository },
    { provide: CUSTOMER_REPOSITORY, useClass: PrismaCustomerRepository },
    { provide: PROPERTY_REPOSITORY, useClass: PrismaPropertyRepository },
  ],
})
export class SalesRabbitModule {}
