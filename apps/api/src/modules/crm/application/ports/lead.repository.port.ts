import { LeadEntity } from '../../domain/entities/lead.entity';
import { LeadFilterDto } from '../dto/lead-filter.dto';
import { CreateLeadData, UpdateLeadData, LeadDetail } from '../dto/lead-data.types';

export interface LeadRepositoryPort {
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
}

export const LEAD_REPOSITORY = Symbol('LEAD_REPOSITORY');
