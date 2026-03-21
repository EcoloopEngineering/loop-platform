import { LeadEntity } from '../../domain/entities/lead.entity';
import { LeadFilterDto } from '../dto/lead-filter.dto';

export interface LeadRepositoryPort {
  create(data: any): Promise<LeadEntity>;
  findById(id: string): Promise<LeadEntity | null>;
  findByIdWithRelations(id: string): Promise<any | null>;
  findAll(filter: LeadFilterDto): Promise<{ data: any[]; total: number }>;
  findByStageGrouped(pipelineId?: string): Promise<Record<string, any[]>>;
  update(id: string, data: Partial<any>): Promise<LeadEntity>;
  updateStage(id: string, stage: string): Promise<LeadEntity>;
  delete(id: string): Promise<void>;
}

export const LEAD_REPOSITORY = Symbol('LEAD_REPOSITORY');
