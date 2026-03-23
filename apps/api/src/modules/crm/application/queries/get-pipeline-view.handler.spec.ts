import { Test } from '@nestjs/testing';
import { GetPipelineViewHandler, GetPipelineViewQuery } from './get-pipeline-view.handler';
import { LEAD_REPOSITORY } from '../ports/lead.repository.port';

describe('GetPipelineViewHandler', () => {
  let handler: GetPipelineViewHandler;
  let leadRepo: { findByStageGrouped: jest.Mock };

  beforeEach(async () => {
    leadRepo = { findByStageGrouped: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        GetPipelineViewHandler,
        { provide: LEAD_REPOSITORY, useValue: leadRepo },
      ],
    }).compile();

    handler = module.get(GetPipelineViewHandler);
  });

  it('should group leads by stage with correct labels', async () => {
    leadRepo.findByStageGrouped.mockResolvedValue({
      NEW_LEAD: [{ id: '1' }, { id: '2' }],
      WON: [{ id: '3' }],
    });

    const result = await handler.execute(new GetPipelineViewQuery('pipe-1'));

    expect(result).toHaveLength(2);

    const newLeadStage = result.find((s) => s.stage === 'NEW_LEAD');
    expect(newLeadStage).toBeDefined();
    expect(newLeadStage!.label).toBe('New Lead');
    expect(newLeadStage!.count).toBe(2);
    expect(newLeadStage!.order).toBe(1);
  });

  it('should format multi-word stage labels correctly', async () => {
    leadRepo.findByStageGrouped.mockResolvedValue({
      DESIGN_IN_PROGRESS: [],
      PENDING_SIGNATURE: [{ id: 'x' }],
    });

    const result = await handler.execute(new GetPipelineViewQuery());

    const dipStage = result.find((s) => s.stage === 'DESIGN_IN_PROGRESS');
    expect(dipStage!.label).toBe('Design In Progress');
    expect(dipStage!.color).toBe('#FF9800');
  });

  it('should assign default order 99 to unknown stages', async () => {
    leadRepo.findByStageGrouped.mockResolvedValue({
      CUSTOM_STAGE: [{ id: '1' }],
    });

    const result = await handler.execute(new GetPipelineViewQuery());

    expect(result[0].order).toBe(99);
    expect(result[0].color).toBe('#757575');
  });
});
