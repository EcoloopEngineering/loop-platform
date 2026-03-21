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
    public readonly endAt: Date,
    public readonly assignedTo: string,
    public readonly location: string | null,
    public readonly notes: string | null,
    public readonly createdBy: string,
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
    // Check for scheduling conflicts
    const conflict = await this.prisma.appointment.findFirst({
      where: {
        assignedTo: command.assignedTo,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        scheduledAt: { lt: command.endAt },
        endAt: { gt: command.scheduledAt },
      },
    });

    if (conflict) {
      throw new ConflictException('Time slot conflicts with an existing appointment');
    }

    const appointment = await this.prisma.appointment.create({
      data: {
        leadId: command.leadId,
        type: command.type,
        status: 'SCHEDULED',
        scheduledAt: command.scheduledAt,
        endAt: command.endAt,
        assignedTo: command.assignedTo,
        location: command.location,
        notes: command.notes,
        createdBy: command.createdBy,
      },
    });

    this.eventBus.publish(
      new AppointmentBookedEvent(
        appointment.id,
        appointment.leadId,
        appointment.type,
        appointment.scheduledAt,
        appointment.assignedTo,
      ),
    );

    return appointment;
  }
}
