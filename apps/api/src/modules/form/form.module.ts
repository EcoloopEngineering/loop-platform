import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { FormController } from './presentation/form.controller';
import { FormService } from './application/form.service';
import { FORM_REPOSITORY } from './application/ports/form.repository.port';
import { PrismaFormRepository } from './infrastructure/repositories/prisma-form.repository';

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [FormController],
  providers: [
    FormService,
    { provide: FORM_REPOSITORY, useClass: PrismaFormRepository },
  ],
  exports: [FormService],
})
export class FormModule {}
