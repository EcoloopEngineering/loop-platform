import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { JobberService } from '../../../../integrations/jobber/jobber.service';
import { Appointment, Lead, Customer, Property } from '@prisma/client';
import { AppointmentBookedEvent } from '../../domain/events/appointment-booked.event';
import { AppointmentType } from '../../domain/entities/appointment.entity';

type LeadWithRelations = Lead & {
  customer: Customer | null;
  property: Property | null;
};

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

    await this.checkConflicts(command.leadId, endAt);

    const lead = await this.prisma.lead.findUnique({
      where: { id: command.leadId },
      include: { customer: true, property: true },
    });

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

    this.syncWithJobber(appointment, lead, endAt);
    this.logActivity(command.leadId, appointment, lead?.createdById ?? '', command);

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

  private async checkConflicts(leadId: string, endAt: Date): Promise<void> {
    const conflict = await this.prisma.appointment.findFirst({
      where: {
        leadId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        scheduledAt: { lt: endAt },
      },
    });

    if (conflict) {
      throw new ConflictException('Time slot conflicts with an existing appointment');
    }
  }

  private syncWithJobber(
    appointment: Appointment,
    lead: LeadWithRelations | null,
    endAt: Date,
  ): void {
    this.syncToJobber(appointment, lead, endAt).catch((err) =>
      this.logger.warn(`Jobber sync failed for appointment ${appointment.id}: ${err.message}`),
    );
  }

  private async logActivity(
    leadId: string,
    appointment: Appointment,
    userId: string,
    command: BookAppointmentCommand,
  ): Promise<void> {
    await this.prisma.leadActivity.create({
      data: {
        leadId,
        userId,
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
  }

  private async syncToJobber(appointment: Appointment, lead: LeadWithRelations | null, endAt: Date): Promise<void> {
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create Jobber booking: ${message}`);
      // Appointment stays as PENDING locally — Jobber sync failed but local booking is valid
    }
  }
}
