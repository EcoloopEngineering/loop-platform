import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { SchedulingController } from './presentation/scheduling.controller';
import { BookAppointmentHandler } from './application/commands/book-appointment.handler';
import { GetAvailabilityHandler } from './application/queries/get-availability.handler';

const CommandHandlers = [BookAppointmentHandler];
const QueryHandlers = [GetAvailabilityHandler];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [SchedulingController],
  providers: [...CommandHandlers, ...QueryHandlers],
})
export class SchedulingModule {}
