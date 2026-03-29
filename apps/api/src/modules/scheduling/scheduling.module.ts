import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { IntegrationsModule } from '../../integrations/integrations.module';
import { SchedulingController } from './presentation/scheduling.controller';
import { BookAppointmentHandler } from './application/commands/book-appointment.handler';
import { GetAvailabilityHandler } from './application/queries/get-availability.handler';
import { CancellationListener } from './application/listeners/cancellation.listener';
import { AppointmentService } from './application/services/appointment.service';
import { CancellationService } from './application/services/cancellation.service';
import { APPOINTMENT_REPOSITORY } from './application/ports/appointment.repository.port';
import { PrismaAppointmentRepository } from './infrastructure/repositories/prisma-appointment.repository';

const CommandHandlers = [BookAppointmentHandler];
const QueryHandlers = [GetAvailabilityHandler];
const Listeners = [CancellationListener];

@Module({
  imports: [CqrsModule, PrismaModule, IntegrationsModule],
  controllers: [SchedulingController],
  providers: [
    AppointmentService,
    CancellationService,
    ...CommandHandlers,
    ...QueryHandlers,
    ...Listeners,
    { provide: APPOINTMENT_REPOSITORY, useClass: PrismaAppointmentRepository },
  ],
})
export class SchedulingModule {}
