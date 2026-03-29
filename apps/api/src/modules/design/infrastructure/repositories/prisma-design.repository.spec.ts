import { Test, TestingModule } from '@nestjs/testing';
import { PrismaDesignRepository } from './prisma-design.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('PrismaDesignRepository', () => {
  let repository: PrismaDesignRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaDesignRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<PrismaDesignRepository>(PrismaDesignRepository);
  });

  describe('findByLead', () => {
    it('should return design requests for a lead', async () => {
      const designs = [{ id: 'd1', leadId: 'lead-1' }, { id: 'd2', leadId: 'lead-1' }];
      prisma.designRequest.findMany.mockResolvedValue(designs);

      const result = await repository.findByLead('lead-1');

      expect(result).toEqual(designs);
      expect(prisma.designRequest.findMany).toHaveBeenCalledWith({
        where: { leadId: 'lead-1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no designs found', async () => {
      prisma.designRequest.findMany.mockResolvedValue([]);

      const result = await repository.findByLead('lead-1');

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return design request by id', async () => {
      const design = { id: 'd1', leadId: 'lead-1', status: 'COMPLETED' };
      prisma.designRequest.findUniqueOrThrow.mockResolvedValue(design);

      const result = await repository.findById('d1');

      expect(result).toEqual(design);
      expect(prisma.designRequest.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 'd1' },
      });
    });

    it('should throw when design request not found', async () => {
      prisma.designRequest.findUniqueOrThrow.mockRejectedValue(new Error('Not found'));

      await expect(repository.findById('nonexistent')).rejects.toThrow('Not found');
    });
  });
});
