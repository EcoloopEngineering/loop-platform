import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { APPOINTMENT_REPOSITORY, AppointmentRepositoryPort } from '../ports/appointment.repository.port';
import { JobberService } from '../../../../integrations/jobber/jobber.service';

export class GetAvailabilityQuery {
  constructor(
    public readonly userId: string,
    public readonly date: string, // ISO date string YYYY-MM-DD
    public readonly type?: string,
    public readonly lat?: number,
    public readonly lng?: number,
  ) {}
}

interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
  source: 'jobber' | 'local';
}

@QueryHandler(GetAvailabilityQuery)
@Injectable()
export class GetAvailabilityHandler implements IQueryHandler<GetAvailabilityQuery> {
  private readonly logger = new Logger(GetAvailabilityHandler.name);

  constructor(
    @Inject(APPOINTMENT_REPOSITORY) private readonly repo: AppointmentRepositoryPort,
    private readonly jobberService: JobberService,
  ) {}

  async execute(query: GetAvailabilityQuery): Promise<TimeSlot[]> {
    // Try Jobber first if coordinates are available
    if (query.lat && query.lng) {
      try {
        const dayStart = `${query.date}T08:00:00Z`;
        const dayEnd = `${query.date}T18:00:00Z`;
        const jobberSlots = await this.jobberService.getAvailabilitySlots(
          query.type ?? 'SITE_AUDIT',
          query.lat,
          query.lng,
          dayStart,
          dayEnd,
        );

        return jobberSlots.map((s) => ({
          start: s.start,
          end: s.end,
          available: s.available,
          source: 'jobber' as const,
        }));
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Jobber availability failed, falling back to local: ${message}`);
      }
    }

    // Fallback: generate local slots based on existing appointments
    return this.getLocalAvailability(query);
  }

  private async getLocalAvailability(query: GetAvailabilityQuery): Promise<TimeSlot[]> {
    const dayStart = new Date(`${query.date}T08:00:00Z`);
    const dayEnd = new Date(`${query.date}T18:00:00Z`);

    const existingAppointments = await this.repo.findAppointmentsInRange(dayStart, dayEnd);

    const slots: TimeSlot[] = [];
    for (let hour = 8; hour < 18; hour++) {
      const slotStart = new Date(`${query.date}T${String(hour).padStart(2, '0')}:00:00Z`);
      const slotEnd = new Date(`${query.date}T${String(hour + 1).padStart(2, '0')}:00:00Z`);

      const isBooked = existingAppointments.some((appt) => {
        const apptEnd = new Date(appt.scheduledAt.getTime() + appt.duration * 60000);
        return appt.scheduledAt < slotEnd && apptEnd > slotStart;
      });

      slots.push({ start: slotStart, end: slotEnd, available: !isBooked, source: 'local' });
    }

    return slots;
  }
}
