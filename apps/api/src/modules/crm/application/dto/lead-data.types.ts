import { LeadStage, LeadSource, LeadStatus } from '@loop/shared';

// ── Create ────────────────────────────────────────────────────────────────────

export interface CreateLeadData {
  customerId: string;
  propertyId: string;
  pipelineId: string;
  source: LeadSource | string;
  currentStage: LeadStage | string;
  createdById: string;
}

// ── Update ────────────────────────────────────────────────────────────────────

export interface UpdateLeadData {
  currentStage?: LeadStage | string;
  status?: LeadStatus | string;
  lostAt?: Date | null;
  lostReason?: string | null;
  pipelineId?: string;
  projectManagerId?: string | null;
  kw?: number | null;
  epc?: number | null;
  financier?: string | null;
  systemSize?: number | null;
  baseline?: number | null;
  metadata?: Record<string, unknown>;
  hubspotDealId?: string | null;
  wonAt?: Date | null;
}

// ── Relations ─────────────────────────────────────────────────────────────────

export interface LeadUserRef {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface LeadAssignmentDetail {
  userId: string;
  splitPct: number;
  isPrimary: boolean;
  user: Omit<LeadUserRef, 'email'>;
}

export interface LeadScoreDetail {
  totalScore: number;
  roofScore: number;
  energyScore: number;
  contactScore: number;
  propertyScore: number;
}

export interface LeadActivityRef {
  id: string;
  type: string;
  description: string | null;
  createdAt: Date;
  userId: string;
}

export interface LeadDesignRequestRef {
  id: string;
  designType: string;
  status: string;
  createdAt: Date;
}

export interface LeadAppointmentRef {
  id: string;
  scheduledAt: Date | null;
  status: string;
}

// ── LeadDetail — returned by findByIdWithRelations / findAll ──────────────────

export interface LeadDetail {
  id: string;
  customerId: string;
  propertyId: string;
  pipelineId: string;
  currentStage: string;
  status: string;
  source: string;
  kw: number | null;
  epc: number | null;
  financier: string | null;
  systemSize: number | null;
  baseline: number | null;
  isActive: boolean;
  wonAt: Date | null;
  lostAt: Date | null;
  lostReason: string | null;
  hubspotDealId: string | null;
  createdById: string | null;
  projectManagerId: string | null;
  createdAt: Date;
  updatedAt: Date;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  };
  property: {
    id: string;
    streetAddress: string;
    city: string;
    state: string;
    zip: string | null;
    latitude: number | null;
    longitude: number | null;
    roofCondition: string | null;
    propertyType: string | null;
    monthlyBill: unknown;
    annualKwhUsage: unknown;
    utilityProvider: string | null;
  };
  score: LeadScoreDetail | null;
  assignments: LeadAssignmentDetail[];
  createdBy: LeadUserRef | null;
  projectManager: LeadUserRef | null;
  activities: LeadActivityRef[];
  designRequests: LeadDesignRequestRef[];
  appointments: LeadAppointmentRef[];
}
