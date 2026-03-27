import { Test, TestingModule } from '@nestjs/testing';
import { QueryBus } from '@nestjs/cqrs';
import { PipelineController } from './pipeline.controller';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { GetPipelineViewQuery } from '../application/queries/get-pipeline-view.handler';
import { CLOSER_PIPELINE_STAGES, PM_PIPELINE_STAGES, FINANCE_PIPELINE_STAGES, MAINTENANCE_PIPELINE_STAGES } from '@loop/shared';

describe('PipelineController', () => {
  let controller: PipelineController;
  let queryBus: { execute: jest.Mock };

  beforeEach(async () => {
    queryBus = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PipelineController],
      providers: [{ provide: QueryBus, useValue: queryBus }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PipelineController>(PipelineController);
  });

  describe('getPipelineView', () => {
    it('should execute GetPipelineViewQuery and return result', async () => {
      const pipelineData = { NEW_LEAD: [], DESIGN_READY: [] };
      queryBus.execute.mockResolvedValue(pipelineData);

      const result = await controller.getPipelineView('pipe-1', 'search', undefined, undefined, undefined);

      expect(queryBus.execute).toHaveBeenCalledWith(
        new GetPipelineViewQuery('pipe-1', 'search', undefined, undefined, undefined),
      );
      expect(result).toEqual(pipelineData);
    });

    it('should pass all filter parameters to the query', async () => {
      queryBus.execute.mockResolvedValue({});

      await controller.getPipelineView('pipe-1', 'test', 'REFERRAL', '2026-01-01', '2026-12-31');

      expect(queryBus.execute).toHaveBeenCalledWith(
        new GetPipelineViewQuery('pipe-1', 'test', 'REFERRAL', '2026-01-01', '2026-12-31'),
      );
    });

    it('should work without any filters', async () => {
      queryBus.execute.mockResolvedValue({});

      await controller.getPipelineView(undefined, undefined, undefined, undefined, undefined);

      expect(queryBus.execute).toHaveBeenCalledWith(
        new GetPipelineViewQuery(undefined, undefined, undefined, undefined, undefined),
      );
    });
  });

  describe('getStages', () => {
    it('should return all pipeline stage definitions', () => {
      const result = controller.getStages();

      expect(result).toEqual({
        closer: CLOSER_PIPELINE_STAGES,
        projectManager: PM_PIPELINE_STAGES,
        finance: FINANCE_PIPELINE_STAGES,
        maintenance: MAINTENANCE_PIPELINE_STAGES,
      });
    });

    it('should return an object with all pipeline keys', () => {
      const result = controller.getStages();

      expect(result).toHaveProperty('closer');
      expect(result).toHaveProperty('projectManager');
      expect(result).toHaveProperty('finance');
      expect(result).toHaveProperty('maintenance');
    });
  });
});
