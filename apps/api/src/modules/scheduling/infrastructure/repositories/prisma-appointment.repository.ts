import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  AppointmentRepositoryPort,
  ActiveAppointment,
  LeadWithStakeholders,
  AppointmentRecord,
  LeadWithRelationsForBooking,
} from '../../application/ports/appointment.repository.port';

@Injectable()
export class PrismaAppointmentRepository implements AppointmentRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async update(id: string, data: Record<string, unknown>): Promise<any> {
    return this.prisma.appointment.update({
      where: { id },
      data: data as any,
    });
  }

  async findActiveByLeadId(leadId: string): Promise<ActiveAppointment | null> {
    return this.prisma.appointment.findFirst({
      where: {
        leadId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        jobberVisitId: { not: null },
      },
    }) as Promise<ActiveAppointment | null>;
  }

  async findLeadWithStakeholders(leadId: string): Promise<LeadWithStakeholders | null> {
    return this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        assignments: {
          where: { isPrimary: true },
          include: { user: { select: { email: true, firstName: true } } },
        },
        projectManager: { select: { email: true, firstName: true } },
      },
    }) as Promise<LeadWithStakeholders | null>;
  }

  async findLeadMetadata(leadId: string): Promise<{ metadata: unknown } | null> {
    return this.prisma.lead.findUnique({
      where: { id: leadId },
      select: { metadata: true },
    });
  }

  async createLeadActivity(data: {
    leadId: string;
    userId: string;
    type: string;
    description: string;
    metadata?: Record<string, unknown>;
  }): Promise<any> {
    return this.prisma.leadActivity.create({ data: data as any });
  }

  // ── Used by BookAppointmentHandler ─────────────────────────────────────

  async findConflictingAppointment(leadId: string, endAt: Date): Promise<{ id: string } | null> {
    return this.prisma.appointment.findFirst({
      where: {
        leadId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        scheduledAt: { lt: endAt },
      },
      select: { id: true },
    });
  }

  async findLeadWithRelationsForBooking(leadId: string): Promise<LeadWithRelationsForBooking | null> {
    return this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { customer: true, property: true },
    }) as any;
  }

  async createAppointment(data: {
    leadId: string;
    type: string;
    status: string;
    scheduledAt: Date;
    duration: number;
    notes: string | null;
  }): Promise<AppointmentRecord> {
    return this.prisma.appointment.create({ data: data as any }) as any;
  }

  // ── Used by GetAvailabilityHandler ─────────────────────────────────────

  async findAppointmentsInRange(dateStart: Date, dateEnd: Date): Promise<Array<{
    id: string;
    scheduledAt: Date;
    duration: number;
    status: string;
  }>> {
    return this.prisma.appointment.findMany({
      where: {
        status: { in: ['PENDING', 'CONFIRMED'] },
        scheduledAt: { gte: dateStart, lt: dateEnd },
      },
      orderBy: { scheduledAt: 'asc' },
    }) as any;
  }
}
