import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { IntegrationsModule } from '../../integrations/integrations.module';
import { DesignController } from './presentation/design.controller';
import { RequestDesignHandler } from './application/commands/request-design.handler';
import { AuroraDesignListener } from './application/listeners/aurora-design.listener';
import { DesignQueryService } from './application/services/design-query.service';
import { DesignProcessor } from '../../infrastructure/queue/processors/design.processor';
import { DESIGN_REPOSITORY } from './application/ports/design.repository.port';
import { PrismaDesignRepository } from './infrastructure/repositories/prisma-design.repository';

const CommandHandlers = [RequestDesignHandler];

@Module({
  imports: [CqrsModule, PrismaModule, IntegrationsModule],
  controllers: [DesignController],
  providers: [
    ...CommandHandlers,
    AuroraDesignListener,
    DesignQueryService,
    DesignProcessor,
    { provide: DESIGN_REPOSITORY, useClass: PrismaDesignRepository },
  ],
  exports: [DesignQueryService],
})
export class DesignModule {}
