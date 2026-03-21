import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { DesignController } from './presentation/design.controller';
import { RequestDesignHandler } from './application/commands/request-design.handler';

const CommandHandlers = [RequestDesignHandler];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [DesignController],
  providers: [...CommandHandlers],
})
export class DesignModule {}
