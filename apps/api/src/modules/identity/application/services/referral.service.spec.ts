import { Test, TestingModule } from '@nestjs/testing';
import { ReferralService } from './referral.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../../../test/prisma-mock.helper';
import { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';

describe('ReferralService', () => {
  let service: ReferralService;
  let prisma: MockPrismaService;

  const mockUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'test@ecoloop.us',
    firstName: 'Test',
    lastName: 'User',
    role: 'ADMIN' as any,
    isActive: true,
    profileImage: null,
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ReferralService>(ReferralService);
  });

  describe('getMyReferrals', () => {
    it('should return paginated referrals for the current user', async () => {
      const referrals = [
        {
          id: 'r1',
          inviterId: 'user-1',
          inviteeId: null,
          tempId: null,
          hierarchyPath: 'user-1',
          hierarchyLevel: 0,
          commissionSplit: null,
          status: 'pending',
          createdAt: new Date(),
        },
      ];
      prisma.referral.findMany.mockResolvedValue(referrals);
      prisma.referral.count.mockResolvedValue(1);

      const pagination = { page: 1, limit: 20, skip: 0 } as any;
      const result = await service.getMyReferrals(mockUser, pagination);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(prisma.referral.findMany).toHaveBeenCalledWith({
        where: { inviterId: 'user-1' },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty results when user has no referrals', async () => {
      prisma.referral.findMany.mockResolvedValue([]);
      prisma.referral.count.mockResolvedValue(0);

      const pagination = { page: 1, limit: 20, skip: 0 } as any;
      const result = await service.getMyReferrals(mockUser, pagination);

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('createReferral', () => {
    it('should create a referral with no parent (root level)', async () => {
      prisma.referral.findFirst.mockResolvedValue(null);
      const created = {
        id: 'r1',
        inviterId: 'user-1',
        tempId: 'temp-1',
        hierarchyPath: 'user-1',
        hierarchyLevel: 0,
        status: 'pending',
        createdAt: new Date(),
      };
      prisma.referral.create.mockResolvedValue(created);

      const result = await service.createReferral(mockUser, 'temp-1');

      expect(result.hierarchyLevel).toBe(0);
      expect(result.hierarchyPath).toBe('user-1');
      expect(prisma.referral.create).toHaveBeenCalledWith({
        data: {
          inviterId: 'user-1',
          tempId: 'temp-1',
          hierarchyPath: 'user-1',
          hierarchyLevel: 0,
          status: 'pending',
        },
      });
    });

    it('should create a referral with parent hierarchy', async () => {
      prisma.referral.findFirst.mockResolvedValue({
        hierarchyPath: 'root-user',
        hierarchyLevel: 0,
      });
      const user: AuthenticatedUser = { ...mockUser, id: 'user-2' };
      const created = {
        id: 'r2',
        inviterId: 'user-2',
        hierarchyPath: 'root-user.user-2',
        hierarchyLevel: 1,
        status: 'pending',
        createdAt: new Date(),
      };
      prisma.referral.create.mockResolvedValue(created);

      const result = await service.createReferral(user);

      expect(result.hierarchyLevel).toBe(1);
      expect(result.hierarchyPath).toBe('root-user.user-2');
      expect(prisma.referral.create).toHaveBeenCalledWith({
        data: {
          inviterId: 'user-2',
          tempId: null,
          hierarchyPath: 'root-user.user-2',
          hierarchyLevel: 1,
          status: 'pending',
        },
      });
    });

    it('should default tempId to null when not provided', async () => {
      prisma.referral.findFirst.mockResolvedValue(null);
      prisma.referral.create.mockResolvedValue({
        id: 'r3',
        inviterId: 'user-1',
        tempId: null,
        hierarchyPath: 'user-1',
        hierarchyLevel: 0,
        status: 'pending',
        createdAt: new Date(),
      });

      await service.createReferral(mockUser);

      expect(prisma.referral.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tempId: null }),
        }),
      );
    });
  });

  describe('updateCommissionSplit', () => {
    it('should update the commission split for a referral', async () => {
      const split = { inviter: 70, invitee: 30 };
      prisma.referral.update.mockResolvedValue({
        id: 'r1',
        inviterId: 'user-1',
        commissionSplit: split,
        hierarchyPath: 'user-1',
        hierarchyLevel: 0,
        status: 'pending',
        createdAt: new Date(),
      });

      const result = await service.updateCommissionSplit('r1', split);

      expect(result.commissionSplit).toEqual(split);
      expect(prisma.referral.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: { commissionSplit: split },
      });
    });
  });

  describe('getReferralHierarchy', () => {
    it('should return referrals matching the user hierarchy path', async () => {
      const referrals = [
        {
          id: 'r1',
          inviterId: 'user-1',
          hierarchyPath: 'user-1',
          hierarchyLevel: 0,
          status: 'accepted',
          createdAt: new Date(),
        },
        {
          id: 'r2',
          inviterId: 'user-2',
          hierarchyPath: 'user-1.user-2',
          hierarchyLevel: 1,
          status: 'pending',
          createdAt: new Date(),
        },
      ];
      prisma.referral.findMany.mockResolvedValue(referrals);

      const result = await service.getReferralHierarchy('user-1');

      expect(result).toHaveLength(2);
      expect(prisma.referral.findMany).toHaveBeenCalledWith({
        where: { hierarchyPath: { contains: 'user-1' } },
        orderBy: { hierarchyLevel: 'asc' },
      });
    });

    it('should return empty array when no hierarchy found', async () => {
      prisma.referral.findMany.mockResolvedValue([]);

      const result = await service.getReferralHierarchy('nonexistent');

      expect(result).toHaveLength(0);
    });
  });
});
