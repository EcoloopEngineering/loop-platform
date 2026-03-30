import { Test, TestingModule } from '@nestjs/testing';
import { PrismaLeadEnrichmentRepository } from './prisma-lead-enrichment.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('PrismaLeadEnrichmentRepository', () => {
  let repo: PrismaLeadEnrichmentRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaLeadEnrichmentRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repo = module.get(PrismaLeadEnrichmentRepository);
  });

  it('should be defined', () => {
    expect(repo).toBeDefined();
  });

  describe('findUserNameById', () => {
    it('should return user name', async () => {
      prisma.user.findUnique.mockResolvedValue({ firstName: 'John', lastName: 'Doe' });

      const result = await repo.findUserNameById('user-1');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { firstName: true, lastName: true },
      });
      expect(result).toEqual({ firstName: 'John', lastName: 'Doe' });
    });

    it('should return null when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await repo.findUserNameById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findDefaultPipeline', () => {
    it('should return default pipeline', async () => {
      const pipeline = { id: 'pipe-1', name: 'Default', isDefault: true };
      prisma.pipeline.findFirst.mockResolvedValue(pipeline);

      const result = await repo.findDefaultPipeline();

      expect(prisma.pipeline.findFirst).toHaveBeenCalledWith({ where: { isDefault: true } });
      expect(result).toEqual(pipeline);
    });
  });

  describe('findByIdWithCustomer', () => {
    it('should return lead with customer', async () => {
      const lead = {
        id: 'lead-1',
        customer: { firstName: 'Jane', lastName: 'Smith' },
        projectManager: null,
      };
      prisma.lead.findUnique.mockResolvedValue(lead);

      const result = await repo.findByIdWithCustomer('lead-1');

      expect(prisma.lead.findUnique).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        include: {
          customer: { select: { firstName: true, lastName: true } },
          projectManager: { select: { firstName: true, lastName: true } },
        },
      });
      expect(result).toEqual(lead);
    });
  });

  describe('findAssignments', () => {
    it('should return assignments with numeric splitPct', async () => {
      prisma.leadAssignment.findMany.mockResolvedValue([
        { leadId: 'lead-1', userId: 'user-1', splitPct: '100', isPrimary: true },
      ]);

      const result = await repo.findAssignments('lead-1');

      expect(result[0].splitPct).toBe(100);
    });
  });

  describe('upsertAssignment', () => {
    it('should upsert and return assignment', async () => {
      prisma.leadAssignment.upsert.mockResolvedValue({
        leadId: 'lead-1',
        userId: 'user-1',
        splitPct: '80',
        isPrimary: true,
      });

      const result = await repo.upsertAssignment({
        leadId: 'lead-1',
        userId: 'user-1',
        splitPct: 80,
        isPrimary: true,
      });

      expect(result.splitPct).toBe(80);
    });
  });

  describe('findUserEmailById', () => {
    it('should return user email', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'test@ecoloop.us' });

      const result = await repo.findUserEmailById('u1');

      expect(result).toEqual({ id: 'u1', email: 'test@ecoloop.us' });
    });
  });

  describe('findReferralByInvitee', () => {
    it('should return referral inviter', async () => {
      prisma.referral.findFirst.mockResolvedValue({ inviterId: 'inv-1' });

      const result = await repo.findReferralByInvitee('invitee-1');

      expect(result).toEqual({ inviterId: 'inv-1' });
    });
  });

  describe('findLeadStakeholderIds', () => {
    it('should collect unique stakeholder IDs', async () => {
      prisma.lead.findUnique.mockResolvedValue({
        createdById: 'user-1',
        projectManagerId: 'pm-1',
        assignments: [{ userId: 'user-1' }, { userId: 'user-2' }],
      });

      const result = await repo.findLeadStakeholderIds('lead-1');

      expect(result).toContain('user-1');
      expect(result).toContain('user-2');
      expect(result).toContain('pm-1');
    });

    it('should exclude specified IDs', async () => {
      prisma.lead.findUnique.mockResolvedValue({
        createdById: 'user-1',
        projectManagerId: null,
        assignments: [{ userId: 'user-1' }, { userId: 'user-2' }],
      });

      const result = await repo.findLeadStakeholderIds('lead-1', ['user-1']);

      expect(result).not.toContain('user-1');
      expect(result).toContain('user-2');
    });

    it('should return empty array when lead not found', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);

      const result = await repo.findLeadStakeholderIds('nonexistent');

      expect(result).toEqual([]);
    });
  });
});
