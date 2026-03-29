import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { EmailModule } from '../../infrastructure/email/email.module';
import { PortalController } from './presentation/portal.controller';
import { PortalAuthService } from './application/services/portal-auth.service';

@Module({
  imports: [PrismaModule, ConfigModule, EmailModule],
  controllers: [PortalController],
  providers: [PortalAuthService],
  exports: [PortalAuthService],
})
export class PortalModule {}
