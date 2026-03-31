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
      const data = { customerId: 'c1', propertyId: 'p1', currentStage: 'NEW_LEAD', pipelineId: 'pip-1', source: 'WEBSITE', createdById: 'u1' };
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
    it('should hard-delete lead and related records', async () => {
      prisma.task.deleteMany.mockResolvedValue({ count: 2 });
      prisma.leadActivity.deleteMany.mockResolvedValue({ count: 3 });
      prisma.leadAssignment.deleteMany.mockResolvedValue({ count: 1 });
      prisma.leadScore.deleteMany.mockResolvedValue({ count: 1 });
      prisma.lead.delete.mockResolvedValue({ id: 'lead-1' });

      await repository.delete('lead-1');

      expect(prisma.task.deleteMany).toHaveBeenCalledWith({ where: { leadId: 'lead-1' } });
      expect(prisma.leadActivity.deleteMany).toHaveBeenCalledWith({ where: { leadId: 'lead-1' } });
      expect(prisma.leadAssignment.deleteMany).toHaveBeenCalledWith({ where: { leadId: 'lead-1' } });
      expect(prisma.leadScore.deleteMany).toHaveBeenCalledWith({ where: { leadId: 'lead-1' } });
      expect(prisma.lead.delete).toHaveBeenCalledWith({ where: { id: 'lead-1' } });
    });
  });

  // ── New methods ────────────────────────────────────────────────────────

  describe('updateStageAndPipeline', () => {
    it('should update stage and pipelineId together', async () => {
      prisma.lead.update.mockResolvedValue({ id: 'lead-1', currentStage: 'SITE_AUDIT', pipelineId: 'pipe-2' });

      const result = await repository.updateStageAndPipeline('lead-1', 'SITE_AUDIT', 'pipe-2');

      expect(result).toBeInstanceOf(LeadEntity);
      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        data: { currentStage: 'SITE_AUDIT', pipelineId: 'pipe-2' },
      });
    });
  });

  describe('findByIdWithCustomer', () => {
    it('should return lead with customer and projectManager names', async () => {
      const data = {
        id: 'lead-1',
        customer: { firstName: 'John', lastName: 'Doe' },
        projectManager: { firstName: 'PM', lastName: 'One' },
      };
      prisma.lead.findUnique.mockResolvedValue(data);

      const result = await repository.findByIdWithCustomer('lead-1');

      expect(result).toEqual(data);
      expect(prisma.lead.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lead-1' },
          include: expect.objectContaining({
            customer: { select: { firstName: true, lastName: true } },
          }),
        }),
      );
    });

    it('should return null when lead does not exist', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);

      const result = await repository.findByIdWithCustomer('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updatePm', () => {
    it('should update projectManagerId and return lead with relations', async () => {
      const data = {
        id: 'lead-1',
        projectManagerId: 'pm-1',
        projectManager: { firstName: 'PM', lastName: 'One' },
        customer: { firstName: 'John', lastName: 'Doe' },
      };
      prisma.lead.update.mockResolvedValue(data);

      const result = await repository.updatePm('lead-1', 'pm-1');

      expect(result).toEqual(data);
      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        data: { projectManagerId: 'pm-1' },
        include: expect.objectContaining({
          projectManager: { select: { firstName: true, lastName: true } },
          customer: { select: { firstName: true, lastName: true } },
        }),
      });
    });
  });

  describe('createLeadRaw', () => {
    it('should create a lead with raw data and return LeadEntity', async () => {
      const rawData = { customer: { connect: { id: 'c1' } }, source: 'PUBLIC_FORM' };
      prisma.lead.create.mockResolvedValue({ id: 'lead-1', source: 'PUBLIC_FORM' });

      const result = await repository.createLeadRaw(rawData);

      expect(result).toBeInstanceOf(LeadEntity);
      expect(prisma.lead.create).toHaveBeenCalledWith({ data: rawData });
    });
  });

  describe('deactivateByCustomerId', () => {
    it('should soft-delete all active leads for a customer', async () => {
      prisma.lead.updateMany.mockResolvedValue({ count: 2 });

      await repository.deactivateByCustomerId('cust-1');

      expect(prisma.lead.updateMany).toHaveBeenCalledWith({
        where: { customerId: 'cust-1', isActive: true },
        data: { isActive: false, lostReason: 'Deleted from SalesRabbit' },
      });
    });
  });

  describe('createActivity', () => {
    it('should create a lead activity', async () => {
      const activityData = {
        leadId: 'lead-1',
        userId: 'user-1',
        type: 'NOTE_ADDED',
        description: 'Test note',
      };
      prisma.leadActivity.create.mockResolvedValue({ id: 'act-1', ...activityData });

      const result = await repository.createActivity(activityData);

      expect(result).toEqual({ id: 'act-1', ...activityData });
      expect(prisma.leadActivity.create).toHaveBeenCalledWith({ data: activityData });
    });
  });

  describe('findActivityByIdAndLead', () => {
    it('should find activity by id and leadId', async () => {
      const activity = { id: 'act-1', leadId: 'lead-1', type: 'NOTE_ADDED' };
      prisma.leadActivity.findFirst.mockResolvedValue(activity);

      const result = await repository.findActivityByIdAndLead('act-1', 'lead-1', 'NOTE_ADDED');

      expect(result).toEqual(activity);
      expect(prisma.leadActivity.findFirst).toHaveBeenCalledWith({
        where: { id: 'act-1', leadId: 'lead-1', type: 'NOTE_ADDED' },
      });
    });

    it('should return null when not found', async () => {
      prisma.leadActivity.findFirst.mockResolvedValue(null);

      const result = await repository.findActivityByIdAndLead('bad-id', 'lead-1');

      expect(result).toBeNull();
    });
  });

  describe('updateActivity', () => {
    it('should update an activity', async () => {
      const updated = { id: 'act-1', description: 'Updated' };
      prisma.leadActivity.update.mockResolvedValue(updated);

      const result = await repository.updateActivity('act-1', { description: 'Updated' });

      expect(result).toEqual(updated);
      expect(prisma.leadActivity.update).toHaveBeenCalledWith({
        where: { id: 'act-1' },
        data: { description: 'Updated' },
      });
    });
  });

  describe('findActivities', () => {
    it('should find activities by leadId and type with orderBy', async () => {
      const activities = [{ id: 'a1' }, { id: 'a2' }];
      prisma.leadActivity.findMany.mockResolvedValue(activities);

      const result = await repository.findActivities({
        leadId: 'lead-1',
        type: 'NOTE_ADDED',
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toEqual(activities);
      expect(prisma.leadActivity.findMany).toHaveBeenCalledWith({
        where: { leadId: 'lead-1', type: 'NOTE_ADDED' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should find activities without type filter', async () => {
      prisma.leadActivity.findMany.mockResolvedValue([]);

      await repository.findActivities({ leadId: 'lead-1' });

      expect(prisma.leadActivity.findMany).toHaveBeenCalledWith({
        where: { leadId: 'lead-1' },
      });
    });
  });

  describe('findAssignments', () => {
    it('should return assignments for a lead', async () => {
      const assignments = [{ leadId: 'lead-1', userId: 'user-1', isPrimary: true, splitPct: 100 }];
      prisma.leadAssignment.findMany.mockResolvedValue(assignments);

      const result = await repository.findAssignments('lead-1');

      expect(result).toEqual([{ leadId: 'lead-1', userId: 'user-1', isPrimary: true, splitPct: 100 }]);
      expect(prisma.leadAssignment.findMany).toHaveBeenCalledWith({ where: { leadId: 'lead-1' } });
    });
  });

  describe('upsertAssignment', () => {
    it('should upsert a lead assignment', async () => {
      const data = { leadId: 'lead-1', userId: 'user-1', splitPct: 100, isPrimary: true };
      prisma.leadAssignment.upsert.mockResolvedValue(data);

      const result = await repository.upsertAssignment(data);

      expect(result).toEqual(data);
      expect(prisma.leadAssignment.upsert).toHaveBeenCalledWith({
        where: { leadId_userId: { leadId: 'lead-1', userId: 'user-1' } },
        update: { splitPct: 100, isPrimary: true },
        create: data,
      });
    });
  });

  describe('findUserNameById', () => {
    it('should return user name', async () => {
      prisma.user.findUnique.mockResolvedValue({ firstName: 'John', lastName: 'Doe' });

      const result = await repository.findUserNameById('user-1');

      expect(result).toEqual({ firstName: 'John', lastName: 'Doe' });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { firstName: true, lastName: true },
      });
    });

    it('should return null when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await repository.findUserNameById('bad-id');

      expect(result).toBeNull();
    });
  });

  describe('findDefaultPipeline', () => {
    it('should return the default pipeline', async () => {
      prisma.pipeline.findFirst.mockResolvedValue({ id: 'pipe-1', isDefault: true });

      const result = await repository.findDefaultPipeline();

      expect(result).toEqual({ id: 'pipe-1', isDefault: true });
      expect(prisma.pipeline.findFirst).toHaveBeenCalledWith({ where: { isDefault: true } });
    });

    it('should return null when no default pipeline exists', async () => {
      prisma.pipeline.findFirst.mockResolvedValue(null);

      const result = await repository.findDefaultPipeline();

      expect(result).toBeNull();
    });
  });
});
