export const APPOINTMENT_REPOSITORY = Symbol('APPOINTMENT_REPOSITORY');

export interface ActiveAppointment {
  id: string;
  jobberVisitId: string | null;
  status: string;
}

export interface LeadWithStakeholders {
  id: string;
  assignments: Array<{
    user: { email: string; firstName: string } | null;
  }>;
  projectManager: { email: string; firstName: string } | null;
  metadata: unknown;
}

export interface AppointmentRecord {
  id: string;
  leadId: string;
  type: string;
  status: string;
  scheduledAt: Date;
  duration: number;
  notes: string | null;
  jobberVisitId: string | null;
}

export interface LeadWithRelationsForBooking {
  id: string;
  createdById: string | null;
  customer: { firstName: string; lastName: string } | null;
  property: {
    streetAddress: string;
    city: string;
    state: string;
    zip: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
}

export interface AppointmentRepositoryPort {
  update(id: string, data: Record<string, unknown>): Promise<any>;

  findActiveByLeadId(leadId: string): Promise<ActiveAppointment | null>;

  findLeadWithStakeholders(leadId: string): Promise<LeadWithStakeholders | null>;

  findLeadMetadata(leadId: string): Promise<{ metadata: unknown } | null>;

  createLeadActivity(data: {
    leadId: string;
    userId: string;
    type: string;
    description: string;
    metadata?: Record<string, unknown>;
  }): Promise<any>;

  // ── Used by BookAppointmentHandler ─────────────────────────────────────
  findConflictingAppointment(leadId: string, endAt: Date): Promise<{ id: string } | null>;

  findLeadWithRelationsForBooking(leadId: string): Promise<LeadWithRelationsForBooking | null>;

  createAppointment(data: {
    leadId: string;
    type: string;
    status: string;
    scheduledAt: Date;
    duration: number;
    notes: string | null;
  }): Promise<AppointmentRecord>;

  // ── Used by GetAvailabilityHandler ─────────────────────────────────────
  findAppointmentsInRange(dateStart: Date, dateEnd: Date): Promise<Array<{
    id: string;
    scheduledAt: Date;
    duration: number;
    status: string;
  }>>;
}
