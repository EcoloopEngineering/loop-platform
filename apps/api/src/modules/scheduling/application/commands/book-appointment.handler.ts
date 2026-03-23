import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { JobberService } from '../../../../integrations/jobber/jobber.service';
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
  private readonly logger = new Logger(BookAppointmentHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus,
    private readonly jobberService: JobberService,
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

    // Get lead + customer + property for Jobber booking
    const lead = await this.prisma.lead.findUnique({
      where: { id: command.leadId },
      include: {
        customer: true,
        property: true,
      },
    });

    // Create appointment locally first
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

    // Sync to Jobber in background (fire and forget)
    this.syncToJobber(appointment, lead, endAt).catch((err) =>
      this.logger.warn(`Jobber sync failed for appointment ${appointment.id}: ${err.message}`),
    );

    // Log activity
    await this.prisma.leadActivity.create({
      data: {
        leadId: command.leadId,
        userId: lead?.createdById ?? '',
        type: 'APPOINTMENT_BOOKED',
        description: `${command.type} appointment booked for ${command.scheduledAt.toLocaleDateString()}`,
        metadata: {
          appointmentId: appointment.id,
          type: command.type,
          scheduledAt: command.scheduledAt.toISOString(),
          duration: command.duration,
        },
      },
    }).catch(() => {});

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

  private async syncToJobber(appointment: any, lead: any, endAt: Date): Promise<void> {
    if (!lead?.customer || !lead?.property) {
      this.logger.debug('Skipping Jobber sync — missing customer or property data');
      return;
    }

    try {
      const address = lead.property
        ? `${lead.property.streetAddress}, ${lead.property.city}, ${lead.property.state} ${lead.property.zip}`
        : undefined;

      const jobberBooking = await this.jobberService.createBooking({
        appointmentType: appointment.type,
        startAt: appointment.scheduledAt.toISOString(),
        endAt: endAt.toISOString(),
        propertyAddress: address,
        notes: appointment.notes ?? `${lead.customer.firstName} ${lead.customer.lastName}`,
        latitude: lead.property?.latitude ?? undefined,
        longitude: lead.property?.longitude ?? undefined,
      });

      // Save Jobber reference
      await this.prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          status: 'CONFIRMED',
          jobberVisitId: jobberBooking.visitId ?? null,
        },
      });

      this.logger.log(`Jobber booking created for appointment ${appointment.id}`);
    } catch (error: any) {
      this.logger.error(`Failed to create Jobber booking: ${error.message}`);
      // Appointment stays as PENDING locally — Jobber sync failed but local booking is valid
    }
  }
}
