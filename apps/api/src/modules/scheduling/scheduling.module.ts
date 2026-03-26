import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { IntegrationsModule } from '../../integrations/integrations.module';
import { SchedulingController } from './presentation/scheduling.controller';
import { BookAppointmentHandler } from './application/commands/book-appointment.handler';
import { GetAvailabilityHandler } from './application/queries/get-availability.handler';
import { CancellationListener } from './application/listeners/cancellation.listener';

const CommandHandlers = [BookAppointmentHandler];
const QueryHandlers = [GetAvailabilityHandler];
const Listeners = [CancellationListener];

@Module({
  imports: [CqrsModule, PrismaModule, IntegrationsModule],
  controllers: [SchedulingController],
  providers: [...CommandHandlers, ...QueryHandlers, ...Listeners],
})
export class SchedulingModule {}
