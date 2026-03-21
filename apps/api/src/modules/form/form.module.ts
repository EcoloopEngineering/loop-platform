import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { FormController } from './presentation/form.controller';

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [FormController],
})
export class FormModule {}
