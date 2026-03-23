import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

export class GetAvailabilityQuery {
  constructor(
    public readonly userId: string,
    public readonly date: string, // ISO date string YYYY-MM-DD
  ) {}
}

interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

@QueryHandler(GetAvailabilityQuery)
@Injectable()
export class GetAvailabilityHandler implements IQueryHandler<GetAvailabilityQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetAvailabilityQuery): Promise<TimeSlot[]> {
    const dayStart = new Date(`${query.date}T08:00:00Z`);
    const dayEnd = new Date(`${query.date}T18:00:00Z`);

    const existingAppointments = await this.prisma.appointment.findMany({
      where: {
        leadId: query.userId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        scheduledAt: { gte: dayStart, lt: dayEnd },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    // Generate 1-hour time slots
    const slots: TimeSlot[] = [];
    for (let hour = 8; hour < 18; hour++) {
      const slotStart = new Date(`${query.date}T${String(hour).padStart(2, '0')}:00:00Z`);
      const slotEnd = new Date(`${query.date}T${String(hour + 1).padStart(2, '0')}:00:00Z`);

      const isBooked = existingAppointments.some(
        (appt) => {
          const apptEnd = new Date(appt.scheduledAt.getTime() + appt.duration * 60000);
          return appt.scheduledAt < slotEnd && apptEnd > slotStart;
        },
      );

      slots.push({ start: slotStart, end: slotEnd, available: !isBooked });
    }

    return slots;
  }
}
