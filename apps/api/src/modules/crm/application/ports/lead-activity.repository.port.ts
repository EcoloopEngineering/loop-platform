import {
  CreateActivityData,
  ActivityRecord,
  ActivityWithUser,
} from './lead.repository.port';

export interface LeadActivityRepositoryPort {
  createActivity(data: CreateActivityData): Promise<ActivityRecord>;
  findActivityByIdAndLead(
    id: string,
    leadId: string,
    type?: string,
  ): Promise<ActivityRecord | null>;
  updateActivity(
    id: string,
    data: { description: string; metadata?: unknown },
  ): Promise<ActivityRecord>;
  findActivities(filter: {
    leadId: string;
    type?: string;
    orderBy?: Record<string, 'asc' | 'desc'>;
  }): Promise<ActivityRecord[]>;
  findActivitiesWithUser(leadId: string): Promise<ActivityWithUser[]>;
}

export const LEAD_ACTIVITY_REPOSITORY = Symbol('LEAD_ACTIVITY_REPOSITORY');
