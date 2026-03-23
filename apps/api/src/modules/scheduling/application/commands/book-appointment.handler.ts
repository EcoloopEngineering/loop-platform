import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { AppointmentBookedEvent } from '../../domain/events/appointment-booked.event';
import { AppointmentType } from '../../domain/entities/appointment.entity';

export class BookAppointmentCommand {
  constructor(
    public readonly leadId: string,
    public readonly type: AppointmentType,
    public readonly scheduledAt: Date,
    public readonly duration: number,
    public readonly notes: string | null,
  ) {}
}

@CommandHandler(BookAppointmentCommand)
@Injectable()
export class BookAppointmentHandler implements ICommandHandler<BookAppointmentCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: BookAppointmentCommand) {
    const endAt = new Date(command.scheduledAt.getTime() + command.duration * 60000);

    // Check for scheduling conflicts
    const conflict = await this.prisma.appointment.findFirst({
      where: {
        leadId: command.leadId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        scheduledAt: { lt: endAt },
      },
    });

    if (conflict) {
      throw new ConflictException('Time slot conflicts with an existing appointment');
    }

    const appointment = await this.prisma.appointment.create({
      data: {
        leadId: command.leadId,
        type: command.type as any,
        status: 'PENDING',
        scheduledAt: command.scheduledAt,
        duration: command.duration,
        notes: command.notes,
      },
    });

    this.eventBus.publish(
      new AppointmentBookedEvent(
        appointment.id,
        appointment.leadId,
        appointment.type,
        appointment.scheduledAt,
      ),
    );

    return appointment;
  }
}
