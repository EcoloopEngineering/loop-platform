import { Test } from '@nestjs/testing';
import { PrismaLeadQueryRepository } from './prisma-lead-query.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';
import { LeadFilterDto } from '../../application/dto/lead-filter.dto';

describe('PrismaLeadQueryRepository', () => {
  let repo: PrismaLeadQueryRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module = await Test.createTestingModule({
      providers: [
        PrismaLeadQueryRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repo = module.get(PrismaLeadQueryRepository);
  });

  describe('findAll', () => {
    it('should return paginated leads', async () => {
      const leads = [
        { id: 'lead-1', customer: { firstName: 'Alice', lastName: 'Smith' } },
      ];
      prisma.lead.findMany.mockResolvedValue(leads);
      prisma.lead.count.mockResolvedValue(1);

      const filter = Object.assign(new LeadFilterDto(), {
        page: 1,
        limit: 20,
      });

      const result = await repo.findAll(filter);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prisma.lead.findMany).toHaveBeenCalled();
      expect(prisma.lead.count).toHaveBeenCalled();
    });

    it('should apply stage filter', async () => {
      prisma.lead.findMany.mockResolvedValue([]);
      prisma.lead.count.mockResolvedValue(0);

      const filter = Object.assign(new LeadFilterDto(), {
        page: 1,
        limit: 20,
        stage: 'NEW_LEAD',
      });

      await repo.findAll(filter);

      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ currentStage: 'NEW_LEAD' }),
        }),
      );
    });

    it('should apply search filter', async () => {
      prisma.lead.findMany.mockResolvedValue([]);
      prisma.lead.count.mockResolvedValue(0);

      const filter = Object.assign(new LeadFilterDto(), {
        page: 1,
        limit: 20,
        search: 'Alice',
      });

      await repo.findAll(filter);

      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ OR: expect.any(Array) }),
        }),
      );
    });

    it('should apply date range filters', async () => {
      prisma.lead.findMany.mockResolvedValue([]);
      prisma.lead.count.mockResolvedValue(0);

      const filter = Object.assign(new LeadFilterDto(), {
        page: 1,
        limit: 20,
        dateFrom: '2026-01-01',
        dateTo: '2026-03-31',
      });

      await repo.findAll(filter);

      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('should apply assignedUserId filter', async () => {
      prisma.lead.findMany.mockResolvedValue([]);
      prisma.lead.count.mockResolvedValue(0);

      const filter = Object.assign(new LeadFilterDto(), {
        page: 1,
        limit: 20,
        assignedUserId: 'user-1',
      });

      await repo.findAll(filter);

      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignments: { some: { userId: 'user-1' } },
          }),
        }),
      );
    });
  });

  describe('findByStageGrouped', () => {
    it('should group leads by stage', async () => {
      (prisma.lead as any).groupBy = jest.fn().mockResolvedValue([
        { currentStage: 'NEW_LEAD', _count: { id: 2 } },
        { currentStage: 'DESIGN_READY', _count: { id: 1 } },
      ]);
      prisma.lead.findMany.mockResolvedValue([
        { currentStage: 'NEW_LEAD', customer: { firstName: 'A', lastName: 'B' } },
        { currentStage: 'NEW_LEAD', customer: { firstName: 'C', lastName: 'D' } },
        { currentStage: 'DESIGN_READY', customer: { firstName: 'E', lastName: 'F' } },
      ]);

      const result = await repo.findByStageGrouped();

      expect(result.NEW_LEAD).toBeDefined();
      expect(result.NEW_LEAD.leads).toHaveLength(2);
      expect(result.NEW_LEAD.totalCount).toBe(2);
      expect(result.DESIGN_READY.leads).toHaveLength(1);
    });

    it('should apply pipeline filter', async () => {
      (prisma.lead as any).groupBy = jest.fn().mockResolvedValue([]);
      prisma.lead.findMany.mockResolvedValue([]);

      await repo.findByStageGrouped('pipeline-1');

      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ pipelineId: 'pipeline-1' }),
        }),
      );
    });

    it('should apply search filter', async () => {
      (prisma.lead as any).groupBy = jest.fn().mockResolvedValue([]);
      prisma.lead.findMany.mockResolvedValue([]);

      await repo.findByStageGrouped(undefined, { search: 'John' });

      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            customer: expect.objectContaining({ OR: expect.any(Array) }),
          }),
        }),
      );
    });

    it('should default to 90-day date filter', async () => {
      (prisma.lead as any).groupBy = jest.fn().mockResolvedValue([]);
      prisma.lead.findMany.mockResolvedValue([]);

      await repo.findByStageGrouped();

      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({ gte: expect.any(Date) }),
          }),
        }),
      );
    });

    it('should respect limitPerStage', async () => {
      (prisma.lead as any).groupBy = jest.fn().mockResolvedValue([
        { currentStage: 'NEW_LEAD', _count: { id: 3 } },
      ]);
      prisma.lead.findMany.mockResolvedValue([
        { currentStage: 'NEW_LEAD' },
        { currentStage: 'NEW_LEAD' },
        { currentStage: 'NEW_LEAD' },
      ]);

      const result = await repo.findByStageGrouped(undefined, undefined, 2);

      expect(result.NEW_LEAD.leads).toHaveLength(2);
      expect(result.NEW_LEAD.totalCount).toBe(3);
    });
  });

  describe('findByStageWithCustomer', () => {
    it('should return leads by stage with customer info', async () => {
      const leads = [
        { id: 'lead-1', currentStage: 'INSTALL', customer: { firstName: 'A', lastName: 'B' } },
      ];
      prisma.lead.findMany.mockResolvedValue(leads);

      const result = await repo.findByStageWithCustomer('INSTALL');

      expect(result).toEqual(leads);
      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { currentStage: 'INSTALL' },
          take: 500,
        }),
      );
    });

    it('should respect take parameter', async () => {
      prisma.lead.findMany.mockResolvedValue([]);

      await repo.findByStageWithCustomer('INSTALL', 100);

      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });
  });
});
