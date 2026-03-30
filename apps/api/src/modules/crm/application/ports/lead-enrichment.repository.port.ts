import {
  UserNameRecord,
  PipelineRecord,
  LeadWithCustomer,
  AssignmentRecord,
  UpsertAssignmentData,
} from './lead.repository.port';

export interface LeadEnrichmentRepositoryPort {
  findUserNameById(userId: string): Promise<UserNameRecord | null>;
  findDefaultPipeline(): Promise<PipelineRecord | null>;
  findByIdWithCustomer(id: string): Promise<LeadWithCustomer | null>;
  findByIdWithCustomerName(id: string): Promise<{
    id: string;
    currentStage: string;
    status: string;
    metadata: unknown;
    createdById: string | null;
    customer: { firstName: string; lastName: string };
  } | null>;
  findAssignments(leadId: string): Promise<AssignmentRecord[]>;
  upsertAssignment(data: UpsertAssignmentData): Promise<AssignmentRecord>;
  findUserEmailById(userId: string): Promise<{ id: string; email: string } | null>;
  findReferralByInvitee(inviteeId: string): Promise<{ inviterId: string } | null>;
  findLeadStakeholderIds(leadId: string, excludeIds?: string[]): Promise<string[]>;
}

export const LEAD_ENRICHMENT_REPOSITORY = Symbol('LEAD_ENRICHMENT_REPOSITORY');
