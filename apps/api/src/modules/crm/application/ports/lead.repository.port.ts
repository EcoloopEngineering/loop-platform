import { LeadEntity } from '../../domain/entities/lead.entity';
import { LeadFilterDto } from '../dto/lead-filter.dto';
import { CreateLeadData, UpdateLeadData, LeadDetail } from '../dto/lead-data.types';

// ── Activity types ───────────────────────────────────────────────────────────

export interface CreateActivityData {
  leadId: string;
  userId: string;
  type: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface ActivityRecord {
  id: string;
  leadId: string;
  userId: string | null;
  type: string;
  description: string | null;
  metadata?: unknown;
  createdAt: Date;
}

// ── Assignment types ─────────────────────────────────────────────────────────

export interface UpsertAssignmentData {
  leadId: string;
  userId: string;
  splitPct: number;
  isPrimary: boolean;
}

export interface AssignmentRecord {
  leadId: string;
  userId: string;
  splitPct: number;
  isPrimary: boolean;
}

// ── Lead with customer (enrichment) ──────────────────────────────────────────

export interface LeadWithCustomer {
  id: string;
  customer: { firstName: string; lastName: string };
  projectManager?: { firstName: string; lastName: string } | null;
}

// ── User name (enrichment) ───────────────────────────────────────────────────

export interface UserNameRecord {
  firstName: string;
  lastName: string;
}

// ── Score record ────────────────────────────────────────────────────────────

export interface ScoreRecord {
  id?: string;
  leadId: string;
  totalScore: number;
  roofScore: number;
  energyScore: number;
  contactScore: number;
  propertyScore: number;
  calculatedAt?: Date;
}

// ── Lead with customer & property (scoring) ─────────────────────────────────

export interface LeadWithCustomerAndProperty {
  id: string;
  source: string;
  customer: {
    email: string | null;
    phone: string | null;
    firstName: string;
    lastName: string;
  };
  property: {
    streetAddress: string | null;
    latitude: number | null;
    longitude: number | null;
    electricalService: string | null;
    hasPool: boolean | null;
    hasEV: boolean | null;
    propertyType: string | null;
    roofCondition: string | null;
    monthlyBill: number | null;
    annualKwhUsage: number | null;
    utilityProvider: string | null;
  };
}

// ── Activity with user (timeline) ───────────────────────────────────────────

export interface ActivityWithUser extends ActivityRecord {
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    profileImage: string | null;
  } | null;
}

// ── Pipeline record ──────────────────────────────────────────────────────────

export interface PipelineRecord {
  id: string;
  name?: string;
  isDefault?: boolean;
}

// ── Port ─────────────────────────────────────────────────────────────────────

export interface LeadRepositoryPort {
  // Lead CRUD
  create(data: CreateLeadData): Promise<LeadEntity>;
  findById(id: string): Promise<LeadEntity | null>;
  findByIdWithRelations(id: string): Promise<LeadDetail | null>;
  findAll(filter: LeadFilterDto): Promise<{ data: LeadDetail[]; total: number }>;
  findByStageGrouped(
    pipelineId?: string,
    filters?: { search?: string; source?: string; dateFrom?: string; dateTo?: string },
  ): Promise<Record<string, LeadDetail[]>>;
  update(id: string, data: UpdateLeadData): Promise<LeadEntity>;
  updateStage(id: string, stage: string): Promise<LeadEntity>;
  delete(id: string): Promise<void>;

  // Extended lead operations
  updateStageAndPipeline(id: string, stage: string, pipelineId: string): Promise<LeadEntity>;
  findByIdWithCustomer(id: string): Promise<LeadWithCustomer | null>;
  updatePm(
    id: string,
    pmId: string | null,
  ): Promise<LeadWithCustomer & { projectManagerId: string | null }>;
  createLeadRaw(data: Record<string, unknown>): Promise<LeadEntity>;
  deactivateByCustomerId(customerId: string): Promise<void>;

  // Activity operations
  createActivity(data: CreateActivityData): Promise<ActivityRecord>;
  findActivityByIdAndLead(
    id: string,
    leadId: string,
    type?: string,
  ): Promise<ActivityRecord | null>;
  updateActivity(id: string, data: { description: string; metadata?: unknown }): Promise<ActivityRecord>;
  findActivities(filter: {
    leadId: string;
    type?: string;
    orderBy?: Record<string, 'asc' | 'desc'>;
  }): Promise<ActivityRecord[]>;

  // Assignment operations
  findAssignments(leadId: string): Promise<AssignmentRecord[]>;
  upsertAssignment(data: UpsertAssignmentData): Promise<AssignmentRecord>;

  // Enrichment (cross-entity lookups needed for event payloads)
  findUserNameById(userId: string): Promise<UserNameRecord | null>;

  // Pipeline
  findDefaultPipeline(): Promise<PipelineRecord | null>;

  // Scoring
  findByIdWithCustomerAndProperty(id: string): Promise<LeadWithCustomerAndProperty | null>;
  upsertScore(
    leadId: string,
    update: Omit<ScoreRecord, 'id' | 'leadId'>,
    create: Omit<ScoreRecord, 'id'>,
  ): Promise<ScoreRecord>;

  // Timeline
  findActivitiesWithUser(leadId: string): Promise<ActivityWithUser[]>;
}

export const LEAD_REPOSITORY = Symbol('LEAD_REPOSITORY');
