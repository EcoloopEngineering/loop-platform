import { Test } from '@nestjs/testing';
import { GetPipelineViewHandler, GetPipelineViewQuery } from './get-pipeline-view.handler';
import { LEAD_QUERY_REPOSITORY } from '../ports/lead-query.repository.port';

describe('GetPipelineViewHandler', () => {
  let handler: GetPipelineViewHandler;
  let leadQueryRepo: { findByStageGrouped: jest.Mock };

  beforeEach(async () => {
    leadQueryRepo = { findByStageGrouped: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        GetPipelineViewHandler,
        { provide: LEAD_QUERY_REPOSITORY, useValue: leadQueryRepo },
      ],
    }).compile();

    handler = module.get(GetPipelineViewHandler);
  });

  it('should group leads by stage with correct labels and counts', async () => {
    leadQueryRepo.findByStageGrouped.mockResolvedValue({
      NEW_LEAD: { leads: [{ id: '1' }, { id: '2' }], totalCount: 5 },
      WON: { leads: [{ id: '3' }], totalCount: 1 },
    });

    const result = await handler.execute(new GetPipelineViewQuery('pipe-1'));

    expect(result).toHaveLength(2);

    const newLeadStage = result.find((s) => s.stage === 'NEW_LEAD');
    expect(newLeadStage).toBeDefined();
    expect(newLeadStage!.label).toBe('New Lead');
    expect(newLeadStage!.count).toBe(2);
    expect(newLeadStage!.totalCount).toBe(5);
    expect(newLeadStage!.order).toBe(1);
  });

  it('should format multi-word stage labels correctly', async () => {
    leadQueryRepo.findByStageGrouped.mockResolvedValue({
      DESIGN_IN_PROGRESS: { leads: [], totalCount: 0 },
      PENDING_SIGNATURE: { leads: [{ id: 'x' }], totalCount: 1 },
    });

    const result = await handler.execute(new GetPipelineViewQuery());

    const dipStage = result.find((s) => s.stage === 'DESIGN_IN_PROGRESS');
    expect(dipStage!.label).toBe('Design In Progress');
    expect(dipStage!.color).toBe('#FF9800');
  });

  it('should assign default order 99 to unknown stages', async () => {
    leadQueryRepo.findByStageGrouped.mockResolvedValue({
      CUSTOM_STAGE: { leads: [{ id: '1' }], totalCount: 1 },
    });

    const result = await handler.execute(new GetPipelineViewQuery());

    expect(result[0].order).toBe(99);
    expect(result[0].color).toBe('#757575');
  });

  it('should pass limitPerStage to repository', async () => {
    leadQueryRepo.findByStageGrouped.mockResolvedValue({});

    await handler.execute(new GetPipelineViewQuery('pipe-1', undefined, undefined, undefined, undefined, 25));

    expect(leadQueryRepo.findByStageGrouped).toHaveBeenCalledWith(
      'pipe-1',
      { search: undefined, source: undefined, dateFrom: undefined, dateTo: undefined },
      25,
    );
  });

  it('should return totalCount different from count when stage has more leads than limit', async () => {
    leadQueryRepo.findByStageGrouped.mockResolvedValue({
      NEW_LEAD: { leads: [{ id: '1' }], totalCount: 200 },
    });

    const result = await handler.execute(new GetPipelineViewQuery());

    expect(result[0].count).toBe(1);
    expect(result[0].totalCount).toBe(200);
  });
});
