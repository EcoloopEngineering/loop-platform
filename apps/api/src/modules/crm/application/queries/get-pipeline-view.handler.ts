import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { LEAD_REPOSITORY, LeadRepositoryPort } from '../ports/lead.repository.port';
import { STAGE_COLORS, STAGE_LABELS } from '@loop/shared';

export class GetPipelineViewQuery {
  constructor(
    public readonly pipelineId?: string,
    public readonly search?: string,
    public readonly source?: string,
    public readonly dateFrom?: string,
    public readonly dateTo?: string,
  ) {}
}

export interface PipelineStageView {
  stage: string;
  label: string;
  color: string;
  order: number;
  leads: any[];
  count: number;
}

@QueryHandler(GetPipelineViewQuery)
export class GetPipelineViewHandler implements IQueryHandler<GetPipelineViewQuery> {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leadRepo: LeadRepositoryPort,
  ) {}

  async execute(query: GetPipelineViewQuery): Promise<PipelineStageView[]> {
    const grouped = await this.leadRepo.findByStageGrouped(query.pipelineId, {
      search: query.search,
      source: query.source,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });

    return Object.entries(grouped).map(([stage, leads]) => ({
      stage,
      label: STAGE_LABELS[stage] ?? this.formatStageLabel(stage),
      color: STAGE_COLORS[stage] ?? '#757575',
      order: 0,
      leads,
      count: leads.length,
    }));
  }

  private formatStageLabel(stage: string): string {
    return stage
      .replace(/^(FIN_|MAINT_)/, '')
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}
