import { Test, TestingModule } from '@nestjs/testing';
import { PrismaGamificationEventRepository } from './prisma-gamification-event.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('PrismaGamificationEventRepository', () => {
  let repository: PrismaGamificationEventRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaGamificationEventRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<PrismaGamificationEventRepository>(PrismaGamificationEventRepository);
  });

  describe('findByDateRange', () => {
    it('should return events within date range', async () => {
      const events = [{ id: 'ev-1' }];
      prisma.gamificationEvent.findMany.mockResolvedValue(events);
      const start = new Date('2026-01-01');
      const end = new Date('2026-01-31');

      const result = await repository.findByDateRange(start, end);

      expect(result).toEqual(events);
      expect(prisma.gamificationEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { createdAt: { gte: start, lte: end } },
          take: 10000,
        }),
      );
    });

    it('should apply select and include when provided', async () => {
      prisma.gamificationEvent.findMany.mockResolvedValue([]);
      const start = new Date('2026-01-01');
      const end = new Date('2026-01-31');

      await repository.findByDateRange(start, end, { userId: true }, { user: true });

      expect(prisma.gamificationEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: { userId: true },
          include: { user: true },
        }),
      );
    });
  });

  describe('findScoreboardEvents', () => {
    it('should return scoreboard events with user and lead', async () => {
      const events = [{ id: 'ev-1', eventType: 'SALE' }];
      prisma.gamificationEvent.findMany.mockResolvedValue(events);

      const result = await repository.findScoreboardEvents(10);

      expect(result).toEqual(events);
      expect(prisma.gamificationEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventType: { in: ['CONNECTED', 'SALE', 'CUSTOMER_SUCCESS'] } },
          take: 10,
          include: expect.objectContaining({
            user: expect.any(Object),
            lead: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe('findReferrals', () => {
    it('should return accepted referrals', async () => {
      const referrals = [{ inviterId: 'u1', inviteeId: 'u2' }];
      prisma.referral.findMany.mockResolvedValue(referrals);

      const result = await repository.findReferrals();

      expect(result).toEqual(referrals);
      expect(prisma.referral.findMany).toHaveBeenCalledWith({
        where: { status: 'accepted' },
        select: { inviterId: true, inviteeId: true },
        take: 1000,
      });
    });
  });

  describe('findUsersByIds', () => {
    it('should return users by ids', async () => {
      const users = [{ id: 'u1', firstName: 'John', lastName: 'Doe' }];
      prisma.user.findMany.mockResolvedValue(users);

      const result = await repository.findUsersByIds(['u1']);

      expect(result).toEqual(users);
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['u1'] } },
        select: { id: true, firstName: true, lastName: true },
      });
    });
  });

  describe('upsertMonthlyRecord', () => {
    it('should upsert a monthly record', async () => {
      const data = { userId: 'u1', year: 2026, month: 3, points: 100, coins: 50, isMvp: true };
      prisma.monthlyRecord.upsert.mockResolvedValue({ id: 'mr-1', ...data });

      const result = await repository.upsertMonthlyRecord(data);

      expect(result).toEqual(expect.objectContaining({ userId: 'u1' }));
      expect(prisma.monthlyRecord.upsert).toHaveBeenCalledWith({
        where: { userId_year_month: { userId: 'u1', year: 2026, month: 3 } },
        create: expect.objectContaining({ userId: 'u1', points: 100 }),
        update: expect.objectContaining({ points: 100, coins: 50, isMvp: true }),
      });
    });
  });

  describe('create', () => {
    it('should create a gamification event', async () => {
      const data = {
        userId: 'u1',
        leadId: 'lead-1',
        eventType: 'SALE',
        points: 10,
        coins: 5,
        minuteBucket: 1234,
        metadata: { kw: 10 },
      };
      prisma.gamificationEvent.create.mockResolvedValue({ id: 'ev-1', ...data });

      const result = await repository.create(data);

      expect(result).toEqual(expect.objectContaining({ id: 'ev-1' }));
      expect(prisma.gamificationEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: 'u1', eventType: 'SALE' }),
      });
    });
  });

  describe('findByUniqueKey', () => {
    it('should find by composite unique key', async () => {
      prisma.gamificationEvent.findUnique.mockResolvedValue({ id: 'ev-1' });

      const result = await repository.findByUniqueKey('u1', 'SALE', 1234);

      expect(result).toEqual({ id: 'ev-1' });
      expect(prisma.gamificationEvent.findUnique).toHaveBeenCalledWith({
        where: {
          userId_eventType_minuteBucket: { userId: 'u1', eventType: 'SALE', minuteBucket: 1234 },
        },
      });
    });

    it('should return null when not found', async () => {
      prisma.gamificationEvent.findUnique.mockResolvedValue(null);

      const result = await repository.findByUniqueKey('u1', 'SALE', 9999);

      expect(result).toBeNull();
    });
  });

  describe('findLeadWithPrimaryAssignment', () => {
    it('should return lead with primary assignment user', async () => {
      const lead = {
        id: 'lead-1',
        kw: 10,
        assignments: [{ user: { id: 'u1', firstName: 'John', lastName: 'Doe', closedDealEmoji: null } }],
      };
      prisma.lead.findUnique.mockResolvedValue(lead);

      const result = await repository.findLeadWithPrimaryAssignment('lead-1');

      expect(result).toEqual(lead);
      expect(prisma.lead.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lead-1' },
          include: expect.objectContaining({
            assignments: expect.objectContaining({ where: { isPrimary: true } }),
          }),
        }),
      );
    });
  });
});
