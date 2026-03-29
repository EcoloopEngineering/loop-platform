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
}
