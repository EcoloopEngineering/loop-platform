import { Test, TestingModule } from '@nestjs/testing';
import { PrismaLeadActivityRepository } from './prisma-lead-activity.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('PrismaLeadActivityRepository', () => {
  let repo: PrismaLeadActivityRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaLeadActivityRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repo = module.get(PrismaLeadActivityRepository);
  });

  it('should be defined', () => {
    expect(repo).toBeDefined();
  });

  describe('createActivity', () => {
    it('should create a lead activity', async () => {
      const data = {
        leadId: 'lead-1',
        userId: 'user-1',
        type: 'NOTE_ADDED',
        description: 'A note',
      };
      const expected = { id: 'act-1', ...data, createdAt: new Date() };
      prisma.leadActivity.create.mockResolvedValue(expected);

      const result = await repo.createActivity(data);

      expect(prisma.leadActivity.create).toHaveBeenCalledWith({ data });
      expect(result).toEqual(expected);
    });
  });

  describe('findActivityByIdAndLead', () => {
    it('should find activity by id and leadId', async () => {
      const activity = { id: 'act-1', leadId: 'lead-1', type: 'NOTE_ADDED' };
      prisma.leadActivity.findFirst.mockResolvedValue(activity);

      const result = await repo.findActivityByIdAndLead('act-1', 'lead-1', 'NOTE_ADDED');

      expect(prisma.leadActivity.findFirst).toHaveBeenCalledWith({
        where: { id: 'act-1', leadId: 'lead-1', type: 'NOTE_ADDED' },
      });
      expect(result).toEqual(activity);
    });

    it('should omit type filter when not provided', async () => {
      prisma.leadActivity.findFirst.mockResolvedValue(null);

      await repo.findActivityByIdAndLead('act-1', 'lead-1');

      expect(prisma.leadActivity.findFirst).toHaveBeenCalledWith({
        where: { id: 'act-1', leadId: 'lead-1' },
      });
    });
  });

  describe('updateActivity', () => {
    it('should update activity description', async () => {
      const updated = { id: 'act-1', description: 'Updated' };
      prisma.leadActivity.update.mockResolvedValue(updated);

      const result = await repo.updateActivity('act-1', { description: 'Updated' });

      expect(prisma.leadActivity.update).toHaveBeenCalledWith({
        where: { id: 'act-1' },
        data: { description: 'Updated' },
      });
      expect(result).toEqual(updated);
    });
  });

  describe('findActivities', () => {
    it('should find activities with type filter and order', async () => {
      const activities = [{ id: 'a1' }, { id: 'a2' }];
      prisma.leadActivity.findMany.mockResolvedValue(activities);

      const result = await repo.findActivities({
        leadId: 'lead-1',
        type: 'NOTE_ADDED',
        orderBy: { createdAt: 'desc' },
      });

      expect(prisma.leadActivity.findMany).toHaveBeenCalledWith({
        where: { leadId: 'lead-1', type: 'NOTE_ADDED' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(activities);
    });
  });

  describe('findActivitiesWithUser', () => {
    it('should return activities with user info', async () => {
      const activities = [
        { id: 'a1', user: { id: 'u1', firstName: 'John', lastName: 'Doe', profileImage: null } },
      ];
      prisma.leadActivity.findMany.mockResolvedValue(activities);

      const result = await repo.findActivitiesWithUser('lead-1');

      expect(prisma.leadActivity.findMany).toHaveBeenCalledWith({
        where: { leadId: 'lead-1' },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, profileImage: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(activities);
    });
  });
});
