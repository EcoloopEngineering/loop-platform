import { Test, TestingModule } from '@nestjs/testing';
import { PrismaLeadRepository } from './prisma-lead.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';
import { LeadEntity } from '../../domain/entities/lead.entity';

describe('PrismaLeadRepository', () => {
  let repository: PrismaLeadRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaLeadRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<PrismaLeadRepository>(PrismaLeadRepository);
  });

  describe('findById', () => {
    it('should return a LeadEntity when lead exists', async () => {
      const leadData = { id: 'lead-1', currentStage: 'NEW_LEAD', isActive: true };
      prisma.lead.findUnique.mockResolvedValue(leadData);

      const result = await repository.findById('lead-1');

      expect(result).toBeInstanceOf(LeadEntity);
      expect(result?.id).toBe('lead-1');
      expect(prisma.lead.findUnique).toHaveBeenCalledWith({ where: { id: 'lead-1' } });
    });

    it('should return null when lead does not exist', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create and return a LeadEntity', async () => {
      const data = { customerId: 'c1', propertyId: 'p1', currentStage: 'NEW_LEAD' };
      const created = { id: 'lead-1', ...data };
      prisma.lead.create.mockResolvedValue(created);

      const result = await repository.create(data);

      expect(result).toBeInstanceOf(LeadEntity);
      expect(prisma.lead.create).toHaveBeenCalledWith({ data });
    });
  });

  describe('update', () => {
    it('should update and return a LeadEntity', async () => {
      const updated = { id: 'lead-1', currentStage: 'DESIGN_READY' };
      prisma.lead.update.mockResolvedValue(updated);

      const result = await repository.update('lead-1', { currentStage: 'DESIGN_READY' });

      expect(result).toBeInstanceOf(LeadEntity);
      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        data: { currentStage: 'DESIGN_READY' },
      });
    });
  });

  describe('updateStage', () => {
    it('should update only the stage field', async () => {
      const updated = { id: 'lead-1', currentStage: 'WON' };
      prisma.lead.update.mockResolvedValue(updated);

      const result = await repository.updateStage('lead-1', 'WON');

      expect(result).toBeInstanceOf(LeadEntity);
      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        data: { currentStage: 'WON' },
      });
    });
  });

  describe('findByIdWithRelations', () => {
    it('should include all relations', async () => {
      const leadWithRelations = {
        id: 'lead-1',
        customer: { id: 'c1' },
        property: { id: 'p1' },
        assignments: [],
      };
      prisma.lead.findUnique.mockResolvedValue(leadWithRelations);

      const result = await repository.findByIdWithRelations('lead-1');

      expect(result).toEqual(leadWithRelations);
      expect(prisma.lead.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lead-1' },
          include: expect.objectContaining({
            customer: true,
            property: true,
            score: true,
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return data and total count', async () => {
      const leads = [{ id: 'lead-1' }, { id: 'lead-2' }];
      prisma.lead.findMany.mockResolvedValue(leads);
      prisma.lead.count.mockResolvedValue(2);

      const result = await repository.findAll({ page: 1, limit: 20, skip: 0 } as any);

      expect(result.data).toEqual(leads);
      expect(result.total).toBe(2);
    });

    it('should apply search filter', async () => {
      prisma.lead.findMany.mockResolvedValue([]);
      prisma.lead.count.mockResolvedValue(0);

      await repository.findAll({ page: 1, limit: 20, skip: 0, search: 'John' } as any);

      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            OR: expect.any(Array),
          }),
        }),
      );
    });
  });

  describe('delete', () => {
    it('should soft-delete by setting isActive to false', async () => {
      prisma.lead.update.mockResolvedValue({ id: 'lead-1', isActive: false });

      await repository.delete('lead-1');

      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        data: { isActive: false },
      });
    });
  });
});
