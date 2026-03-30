import { Test } from '@nestjs/testing';
import { ListLeadsHandler, ListLeadsQuery } from './list-leads.handler';
import { LEAD_QUERY_REPOSITORY } from '../ports/lead-query.repository.port';
import { LeadFilterDto } from '../dto/lead-filter.dto';

describe('ListLeadsHandler', () => {
  let handler: ListLeadsHandler;
  let leadRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    leadRepo = {
      findAll: jest.fn(),
      findByStageGrouped: jest.fn(),
      findByStageWithCustomer: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        ListLeadsHandler,
        { provide: LEAD_QUERY_REPOSITORY, useValue: leadRepo },
      ],
    }).compile();

    handler = module.get(ListLeadsHandler);
  });

  it('should return paginated leads', async () => {
    const filter = Object.assign(new LeadFilterDto(), {
      page: 1,
      limit: 20,
    });

    const leads = [
      { id: 'lead-1', customerName: 'Alice' },
      { id: 'lead-2', customerName: 'Bob' },
    ];
    leadRepo.findAll.mockResolvedValue({ data: leads, total: 2 });

    const result = await handler.execute(new ListLeadsQuery(filter));

    expect(leadRepo.findAll).toHaveBeenCalledWith(filter);
    expect(result.data).toEqual(leads);
    expect(result.meta.total).toBe(2);
    expect(result.meta.page).toBe(1);
    expect(result.meta.limit).toBe(20);
    expect(result.meta.totalPages).toBe(1);
  });

  it('should handle empty results', async () => {
    const filter = Object.assign(new LeadFilterDto(), {
      page: 1,
      limit: 20,
    });
    leadRepo.findAll.mockResolvedValue({ data: [], total: 0 });

    const result = await handler.execute(new ListLeadsQuery(filter));

    expect(result.data).toEqual([]);
    expect(result.meta.total).toBe(0);
    expect(result.meta.totalPages).toBe(0);
  });

  it('should calculate totalPages correctly for multiple pages', async () => {
    const filter = Object.assign(new LeadFilterDto(), {
      page: 2,
      limit: 10,
    });
    leadRepo.findAll.mockResolvedValue({ data: [], total: 25 });

    const result = await handler.execute(new ListLeadsQuery(filter));

    expect(result.meta.totalPages).toBe(3);
    expect(result.meta.page).toBe(2);
  });

  it('should pass filter with stage and source to repository', async () => {
    const filter = Object.assign(new LeadFilterDto(), {
      page: 1,
      limit: 20,
      stage: 'NEW_LEAD',
      source: 'REFERRAL',
    });
    leadRepo.findAll.mockResolvedValue({ data: [], total: 0 });

    await handler.execute(new ListLeadsQuery(filter));

    expect(leadRepo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 'NEW_LEAD', source: 'REFERRAL' }),
    );
  });
});
