import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { FormController } from './presentation/form.controller';
import { FormService } from './application/form.service';

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [FormController],
  providers: [FormService],
  exports: [FormService],
})
export class FormModule {}
