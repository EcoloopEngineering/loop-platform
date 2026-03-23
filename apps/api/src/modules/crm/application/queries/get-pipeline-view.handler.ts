import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { LEAD_REPOSITORY, LeadRepositoryPort } from '../ports/lead.repository.port';

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
      label: this.formatStageLabel(stage),
      color: this.getStageColor(stage),
      order: this.getStageOrder(stage),
      leads,
      count: leads.length,
    }));
  }

  private formatStageLabel(stage: string): string {
    return stage
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private getStageColor(stage: string): string {
    const colors: Record<string, string> = {
      NEW_LEAD: '#4CAF50',
      REQUEST_DESIGN: '#2196F3',
      DESIGN_IN_PROGRESS: '#FF9800',
      DESIGN_READY: '#9C27B0',
      PENDING_SIGNATURE: '#795548',
      SIT: '#00BCD4',
      WON: '#4CAF50',
      LOST: '#F44336',
      CANCELLED: '#9E9E9E',
    };
    return colors[stage] ?? '#757575';
  }

  private getStageOrder(stage: string): number {
    const order: Record<string, number> = {
      NEW_LEAD: 1,
      REQUEST_DESIGN: 2,
      DESIGN_IN_PROGRESS: 3,
      DESIGN_READY: 4,
      PENDING_SIGNATURE: 5,
      SIT: 6,
      WON: 7,
      LOST: 8,
      CANCELLED: 9,
    };
    return order[stage] ?? 99;
  }
}
