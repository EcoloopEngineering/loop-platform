import { Test, TestingModule } from '@nestjs/testing';
import { CommissionQueryService } from './commission-query.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('CommissionQueryService', () => {
  let service: CommissionQueryService;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionQueryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CommissionQueryService>(CommissionQueryService);
  });

  describe('findByUserId', () => {
    it('should return commissions for the given user', async () => {
      const commissions = [{ id: 'c-1', amount: 1500 }, { id: 'c-2', amount: 2000 }];
      prisma.commission.findMany.mockResolvedValue(commissions);

      const result = await service.findByUserId('user-1');

      expect(prisma.commission.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      expect(result).toEqual(commissions);
    });

    it('should return empty array when no commissions exist', async () => {
      prisma.commission.findMany.mockResolvedValue([]);

      const result = await service.findByUserId('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('findByLeadId', () => {
    it('should return commissions for the given lead', async () => {
      const commissions = [{ id: 'c-1', leadId: 'lead-1', amount: 1500 }];
      prisma.commission.findMany.mockResolvedValue(commissions);

      const result = await service.findByLeadId('lead-1');

      expect(prisma.commission.findMany).toHaveBeenCalledWith({
        where: { leadId: 'lead-1' },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      expect(result).toEqual(commissions);
    });
  });
});
