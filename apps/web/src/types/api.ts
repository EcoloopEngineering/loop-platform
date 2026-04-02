// ─── User ───────────────────────────────────────────────────────────

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  nickname?: string;
  isActive: boolean;
  avatarUrl?: string;
  profileImage?: string;
  companyId?: string;
  managerId?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt?: string;
  /** Populated on admin /users listing */
  referralsReceived?: Array<{
    inviter: { firstName: string; lastName: string };
  }>;
  _count?: {
    leadAssignments?: number;
    leads?: number;
  };
}

export interface UserSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

// ─── Customer ───────────────────────────────────────────────────────

export interface Customer {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
  phone?: string;
  source?: string;
  type?: string;
  socialLink?: string;
  leadsCount: number;
  propertiesCount: number;
  createdAt: string;
  _count?: { leads?: number };
}

export interface CustomerProperty {
  id: string;
  address: string;
  city: string;
  state: string;
}

export interface CustomerLead {
  id: string;
  stage: string;
  score: number;
  source: string;
  createdAt: string;
}

export interface CustomerActivity {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  userName?: string;
}

export interface CustomerDetail extends Customer {
  properties: CustomerProperty[];
  leads: CustomerLead[];
  activities: CustomerActivity[];
}

// ─── Lead ───────────────────────────────────────────────────────────

export interface LeadCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  source: string;
}

export interface LeadProperty {
  id: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  lat?: number;
  lng?: number;
  roofCondition: string;
  electricalService?: string;
  hasPool: boolean;
  hasEV: boolean;
  propertyType: string;
  monthlyBill?: number;
  annualKwhUsage?: number;
  utilityProvider?: string;
}

export interface LeadScore {
  id: string;
  total: number;
  totalScore?: number;
  contactScore: number;
  propertyScore: number;
  energyScore: number;
  roofScore: number;
  tier: string;
}

export interface LeadAssignment {
  userId: string;
  splitPct: number;
  isPrimary: boolean;
  user?: UserSummary & { email: string };
}

export interface Lead {
  id: string;
  customerId: string;
  propertyId: string;
  pipelineId: string;
  currentStage: string;
  source: string;
  status?: string;
  kw?: number;
  epc?: number;
  financier?: string;
  systemSize?: number;
  baseline?: number;
  isActive: boolean;
  wonAt?: string;
  lostAt?: string;
  lostReason?: string;
  createdAt: string;
  updatedAt: string;
  createdById?: string;
  projectManagerId?: string;
  customer?: LeadCustomer;
  property?: LeadProperty;
  leadScore?: LeadScore;
  score?: LeadScore;
  assignedUser?: UserSummary;
  assignments?: LeadAssignment[];
  projectManager?: User;
  appointments?: Appointment[];
  /** Legacy flat fields */
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  stage?: string;
  notes?: string;
}

// ─── Activity / Timeline ────────────────────────────────────────────

export interface Activity {
  id: string;
  type: string;
  event?: string;
  description: string;
  title?: string;
  message?: string;
  createdAt: string;
  userName?: string;
  userId?: string;
  user?: { firstName: string; lastName: string };
  metadata?: { editedAt?: string; action?: string };
}

// ─── Note ───────────────────────────────────────────────────────────

export interface Note {
  id: string;
  body: string;
  userName: string;
  createdAt: string;
  editedAt?: string;
}

// ─── Document / File ────────────────────────────────────────────────

export interface Document {
  id: string;
  name: string;
  url: string;
  type?: string;
  size?: number;
  createdAt?: string;
}

// ─── Task ───────────────────────────────────────────────────────────

export interface TaskSubtask {
  id: string;
  title: string;
  status: string;
}

export interface Task {
  id: string;
  title: string;
  status: string;
  dueDate?: string;
  assigneeId?: string;
  assignee?: { firstName: string; lastName: string };
  subtasks?: TaskSubtask[];
}

// ─── Notification ───────────────────────────────────────────────────

export interface Notification {
  id: string;
  event: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

// ─── Pipeline ───────────────────────────────────────────────────────

export interface PipelineLead {
  id: string;
  customerName: string;
  leadScore: number;
  leadSource: string;
  stage: string;
  owner?: string;
  ownerId?: string | null;
  projectManager?: string;
  pmId?: string | null;
  assignedTo?: string;
  createdAt: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  color: string;
  order: number;
  leads: PipelineLead[];
}

export interface PipelineView {
  stages: PipelineStage[];
}

// ─── Commission ─────────────────────────────────────────────────────

export interface CommissionLine {
  label: string;
  value: string;
}

export interface CommissionData {
  lines: CommissionLine[];
  total: string;
}

export interface Commission {
  id: string;
  type: string;
  amount: number;
  status: string;
  tier?: string;
  leadId?: string;
  userId?: string;
  createdAt?: string;
}

// ─── Appointment ────────────────────────────────────────────────────

export interface Appointment {
  id: string;
  type: string;
  scheduledAt: string;
  duration: number;
  notes?: string;
  status?: string;
}

// ─── Reward / Gamification ──────────────────────────────────────────

export interface RewardProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
}

export interface RewardOrder {
  id: string;
  productName: string;
  price: number;
  status: string;
  createdAt: string;
  coinsSpent?: number;
  userName?: string;
  product?: { name?: string; price?: number };
  user?: { firstName?: string; lastName?: string };
}

export interface RewardBalance {
  coins: number;
  balance?: number;
}

// ─── Settings ───────────────────────────────────────────────────────

export interface Settings {
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyLogo?: string;
  timezone?: string;
  commissionRates?: {
    m1: number;
    m2: number;
    m3: number;
  };
  [key: string]: unknown;
}
