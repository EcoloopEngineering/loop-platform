import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { LEAD_QUERY_REPOSITORY, LeadQueryRepositoryPort } from '../ports/lead-query.repository.port';
import { LeadDetail } from '../dto/lead-data.types';
import { STAGE_COLORS, STAGE_LABELS, PIPELINE_STAGES } from '@loop/shared';

export class GetPipelineViewQuery {
  constructor(
    public readonly pipelineId?: string,
    public readonly search?: string,
    public readonly source?: string,
    public readonly dateFrom?: string,
    public readonly dateTo?: string,
    public readonly limitPerStage?: number,
  ) {}
}

export interface PipelineStageView {
  stage: string;
  label: string;
  color: string;
  order: number;
  leads: LeadDetail[];
  count: number;
  totalCount: number;
}

@QueryHandler(GetPipelineViewQuery)
export class GetPipelineViewHandler implements IQueryHandler<GetPipelineViewQuery> {
  constructor(
    @Inject(LEAD_QUERY_REPOSITORY) private readonly leadQueryRepo: LeadQueryRepositoryPort,
  ) {}

  async execute(query: GetPipelineViewQuery): Promise<PipelineStageView[]> {
    const grouped = await this.leadQueryRepo.findByStageGrouped(
      query.pipelineId,
      {
        search: query.search,
        source: query.source,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      },
      query.limitPerStage,
    );

    const stageOrderMap = this.buildStageOrderMap();

    return Object.entries(grouped).map(([stage, { leads, totalCount }]) => ({
      stage,
      label: STAGE_LABELS[stage] ?? this.formatStageLabel(stage),
      color: STAGE_COLORS[stage] ?? '#757575',
      order: stageOrderMap[stage] ?? 99,
      leads,
      count: leads.length,
      totalCount,
    }));
  }

  private buildStageOrderMap(): Record<string, number> {
    const map: Record<string, number> = {};
    for (const stages of Object.values(PIPELINE_STAGES)) {
      for (const s of stages) {
        map[s.stage] = s.order;
      }
    }
    return map;
  }

  private formatStageLabel(stage: string): string {
    return stage
      .replace(/^(FIN_|MAINT_)/, '')
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}
