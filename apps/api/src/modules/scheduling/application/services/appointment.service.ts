import { Injectable, Inject, Logger } from '@nestjs/common';
import { JobberService } from '../../../../integrations/jobber/jobber.service';
import {
  APPOINTMENT_REPOSITORY,
  AppointmentRepositoryPort,
} from '../ports/appointment.repository.port';

@Injectable()
export class AppointmentService {
  private readonly logger = new Logger(AppointmentService.name);

  constructor(
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointmentRepo: AppointmentRepositoryPort,
    private readonly jobberService: JobberService,
  ) {}

  async reschedule(
    id: string,
    scheduledAt: string,
    duration?: number,
  ) {
    const appointment = await this.appointmentRepo.update(id, {
      scheduledAt: new Date(scheduledAt),
      ...(duration !== undefined && { duration }),
      status: 'PENDING',
    });

    if (appointment.jobberVisitId) {
      const endAt = this.calculateEndTime(
        scheduledAt,
        duration ?? appointment.duration,
      );
      this.jobberService
        .rescheduleVisit(
          appointment.jobberVisitId,
          scheduledAt,
          endAt.toISOString(),
        )
        .catch((err) =>
          this.logger.warn(`Jobber reschedule failed: ${err.message}`),
        );
    }

    return appointment;
  }

  async cancel(id: string, reason: string) {
    const appointment = await this.appointmentRepo.update(id, {
      status: 'CANCELLED',
      notes: reason,
    });

    if (appointment.jobberVisitId) {
      this.jobberService
        .cancelVisit(appointment.jobberVisitId)
        .catch((err) =>
          this.logger.warn(`Jobber cancel failed: ${err.message}`),
        );
    }

    return appointment;
  }

  /** Calculate end time from a start ISO string and duration in minutes. */
  calculateEndTime(startIso: string, durationMinutes: number): Date {
    return new Date(new Date(startIso).getTime() + durationMinutes * 60_000);
  }
}
