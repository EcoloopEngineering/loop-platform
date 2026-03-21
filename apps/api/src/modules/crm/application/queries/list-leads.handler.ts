import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { LeadFilterDto } from '../dto/lead-filter.dto';
import { PaginatedResponse } from '../../../../common/dto/pagination.dto';
import { LEAD_REPOSITORY, LeadRepositoryPort } from '../ports/lead.repository.port';

export class ListLeadsQuery {
  constructor(public readonly filter: LeadFilterDto) {}
}

@QueryHandler(ListLeadsQuery)
export class ListLeadsHandler implements IQueryHandler<ListLeadsQuery> {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leadRepo: LeadRepositoryPort,
  ) {}

  async execute(query: ListLeadsQuery): Promise<PaginatedResponse<any>> {
    const { filter } = query;
    const { data, total } = await this.leadRepo.findAll(filter);

    return new PaginatedResponse(data, total, filter.page, filter.limit);
  }
}
