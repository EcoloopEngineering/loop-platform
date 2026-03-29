import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { EmailModule } from '../../infrastructure/email/email.module';
import { PortalController } from './presentation/portal.controller';
import { PortalAuthService } from './application/services/portal-auth.service';
import { PortalRegistrationService } from './application/services/portal-registration.service';
import { PortalPasswordService } from './application/services/portal-password.service';
import { CUSTOMER_REPOSITORY } from './application/ports/customer.repository.port';
import { PrismaCustomerRepository } from './infrastructure/repositories/prisma-customer.repository';

@Module({
  imports: [PrismaModule, ConfigModule, EmailModule],
  controllers: [PortalController],
  providers: [
    PortalAuthService,
    PortalRegistrationService,
    PortalPasswordService,
    { provide: CUSTOMER_REPOSITORY, useClass: PrismaCustomerRepository },
  ],
  exports: [PortalAuthService, PortalRegistrationService, PortalPasswordService],
})
export class PortalModule {}
