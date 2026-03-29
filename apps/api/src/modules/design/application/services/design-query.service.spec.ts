import { Test, TestingModule } from '@nestjs/testing';
import { DesignQueryService } from './design-query.service';
import { DESIGN_REPOSITORY } from '../ports/design.repository.port';

describe('DesignQueryService', () => {
  let service: DesignQueryService;
  let mockRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockRepo = {
      findByLead: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DesignQueryService,
        { provide: DESIGN_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<DesignQueryService>(DesignQueryService);
  });

  describe('getDesignsByLead', () => {
    it('should return designs for a lead', async () => {
      const designs = [
        { id: 'd1', leadId: 'lead-1', status: 'PENDING' },
        { id: 'd2', leadId: 'lead-1', status: 'COMPLETED' },
      ];
      mockRepo.findByLead.mockResolvedValue(designs);

      const result = await service.getDesignsByLead('lead-1');

      expect(mockRepo.findByLead).toHaveBeenCalledWith('lead-1');
      expect(result).toEqual(designs);
    });

    it('should return empty array when no designs exist', async () => {
      mockRepo.findByLead.mockResolvedValue([]);

      const result = await service.getDesignsByLead('lead-no-designs');

      expect(result).toEqual([]);
    });
  });

  describe('getDesignById', () => {
    it('should return a single design by id', async () => {
      const design = { id: 'd1', leadId: 'lead-1', status: 'COMPLETED' };
      mockRepo.findById.mockResolvedValue(design);

      const result = await service.getDesignById('d1');

      expect(mockRepo.findById).toHaveBeenCalledWith('d1');
      expect(result).toEqual(design);
    });

    it('should throw when design not found', async () => {
      mockRepo.findById.mockRejectedValue(
        new Error('No DesignRequest found'),
      );

      await expect(service.getDesignById('bad-id')).rejects.toThrow();
    });
  });
});
