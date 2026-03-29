import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { SalesRabbitWebhookController } from './presentation/salesrabbit-webhook.controller';
import { SalesRabbitWebhookService } from './application/services/salesrabbit-webhook.service';
import { PROPERTY_REPOSITORY } from './application/ports/property.repository.port';
import { PrismaPropertyRepository } from './infrastructure/repositories/prisma-property.repository';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [SalesRabbitWebhookController],
  providers: [
    SalesRabbitWebhookService,
    { provide: PROPERTY_REPOSITORY, useClass: PrismaPropertyRepository },
  ],
})
export class SalesRabbitModule {}
