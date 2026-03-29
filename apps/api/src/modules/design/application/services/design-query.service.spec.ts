import { Test, TestingModule } from '@nestjs/testing';
import { DesignQueryService } from './design-query.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../../../test/prisma-mock.helper';

describe('DesignQueryService', () => {
  let service: DesignQueryService;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DesignQueryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<DesignQueryService>(DesignQueryService);
  });

  describe('getDesignsByLead', () => {
    it('should return designs for a lead ordered by createdAt desc', async () => {
      const designs = [
        { id: 'd1', leadId: 'lead-1', status: 'PENDING' },
        { id: 'd2', leadId: 'lead-1', status: 'COMPLETED' },
      ];
      prisma.designRequest.findMany.mockResolvedValue(designs);

      const result = await service.getDesignsByLead('lead-1');

      expect(prisma.designRequest.findMany).toHaveBeenCalledWith({
        where: { leadId: 'lead-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(designs);
    });

    it('should return empty array when no designs exist', async () => {
      prisma.designRequest.findMany.mockResolvedValue([]);

      const result = await service.getDesignsByLead('lead-no-designs');

      expect(result).toEqual([]);
    });
  });

  describe('getDesignById', () => {
    it('should return a single design by id', async () => {
      const design = { id: 'd1', leadId: 'lead-1', status: 'COMPLETED' };
      prisma.designRequest.findUniqueOrThrow.mockResolvedValue(design);

      const result = await service.getDesignById('d1');

      expect(prisma.designRequest.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 'd1' },
      });
      expect(result).toEqual(design);
    });

    it('should throw when design not found', async () => {
      prisma.designRequest.findUniqueOrThrow.mockRejectedValue(
        new Error('No DesignRequest found'),
      );

      await expect(service.getDesignById('bad-id')).rejects.toThrow();
    });
  });
});
