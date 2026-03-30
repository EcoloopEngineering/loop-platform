import { LeadFilterDto } from '../dto/lead-filter.dto';
import { LeadDetail } from '../dto/lead-data.types';

export interface LeadQueryRepositoryPort {
  /** Paginated lead listing with filters */
  findAll(filter: LeadFilterDto): Promise<{ data: LeadDetail[]; total: number }>;

  /** Pipeline board view — leads grouped by stage with pagination */
  findByStageGrouped(
    pipelineId?: string,
    filters?: { search?: string; source?: string; dateFrom?: string; dateTo?: string },
    limitPerStage?: number,
  ): Promise<Record<string, { leads: LeadDetail[]; totalCount: number }>>;

  /** Batch query by stage with customer info (used by auto-advance) */
  findByStageWithCustomer(stage: string, take?: number): Promise<Array<{
    id: string;
    currentStage: string;
    createdById: string | null;
    metadata: unknown;
    customer: { firstName: string; lastName: string } | null;
  }>>;
}

export const LEAD_QUERY_REPOSITORY = Symbol('LEAD_QUERY_REPOSITORY');
