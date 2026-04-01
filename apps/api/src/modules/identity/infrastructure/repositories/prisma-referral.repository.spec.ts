import { Test, TestingModule } from '@nestjs/testing';
import { PrismaReferralRepository } from './prisma-referral.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('PrismaReferralRepository', () => {
  let repository: PrismaReferralRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaReferralRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<PrismaReferralRepository>(PrismaReferralRepository);
  });

  describe('findManyByInviter', () => {
    it('should return paginated referrals for inviter', async () => {
      const referrals = [{ id: 'r1', inviterId: 'u1' }];
      prisma.referral.findMany.mockResolvedValue(referrals);

      const result = await repository.findManyByInviter('u1', { skip: 0, take: 20 });

      expect(result).toEqual(referrals);
      expect(prisma.referral.findMany).toHaveBeenCalledWith({
        where: { inviterId: 'u1' },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          invitee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              isActive: true,
              _count: { select: { leadAssignments: true } },
            },
          },
        },
      });
    });
  });

  describe('countByInviter', () => {
    it('should count referrals by inviter', async () => {
      prisma.referral.count.mockResolvedValue(5);

      const result = await repository.countByInviter('u1');

      expect(result).toBe(5);
      expect(prisma.referral.count).toHaveBeenCalledWith({ where: { inviterId: 'u1' } });
    });
  });

  describe('findFirstByInvitee', () => {
    it('should return first referral for invitee', async () => {
      const referral = { id: 'r1', inviteeId: 'u2' };
      prisma.referral.findFirst.mockResolvedValue(referral);

      const result = await repository.findFirstByInvitee('u2');

      expect(result).toEqual(referral);
      expect(prisma.referral.findFirst).toHaveBeenCalledWith({
        where: { inviteeId: 'u2' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return null when no referral found', async () => {
      prisma.referral.findFirst.mockResolvedValue(null);

      const result = await repository.findFirstByInvitee('u2');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a referral', async () => {
      const data = {
        inviterId: 'u1',
        inviteeId: 'u2',
        hierarchyPath: '/u1/u2',
        hierarchyLevel: 1,
        status: 'accepted',
      };
      prisma.referral.create.mockResolvedValue({ id: 'r1', ...data });

      const result = await repository.create(data);

      expect(result).toEqual(expect.objectContaining({ inviterId: 'u1' }));
      expect(prisma.referral.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          inviterId: 'u1',
          inviteeId: 'u2',
          hierarchyPath: '/u1/u2',
        }),
      });
    });

    it('should handle null inviteeId and tempId', async () => {
      const data = {
        inviterId: 'u1',
        hierarchyPath: '/u1',
        hierarchyLevel: 0,
        status: 'pending',
      };
      prisma.referral.create.mockResolvedValue({ id: 'r1', ...data });

      await repository.create(data);

      expect(prisma.referral.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          inviteeId: null,
          tempId: null,
        }),
      });
    });
  });

  describe('update', () => {
    it('should update a referral', async () => {
      prisma.referral.update.mockResolvedValue({ id: 'r1', commissionSplit: { M1: 60 } });

      const result = await repository.update('r1', { commissionSplit: { M1: 60 } });

      expect(result).toEqual(expect.objectContaining({ commissionSplit: { M1: 60 } }));
      expect(prisma.referral.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: { commissionSplit: { M1: 60 } },
      });
    });
  });

  describe('findManyByHierarchyPath', () => {
    it('should find referrals containing userId in hierarchy path', async () => {
      const referrals = [{ id: 'r1', hierarchyPath: '/u1/u2' }];
      prisma.referral.findMany.mockResolvedValue(referrals);

      const result = await repository.findManyByHierarchyPath('u1');

      expect(result).toEqual(referrals);
      expect(prisma.referral.findMany).toHaveBeenCalledWith({
        where: { hierarchyPath: { contains: 'u1' } },
        orderBy: { hierarchyLevel: 'asc' },
      });
    });
  });
});
