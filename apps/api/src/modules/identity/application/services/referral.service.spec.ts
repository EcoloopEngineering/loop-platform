import { Test, TestingModule } from '@nestjs/testing';
import { ReferralService } from './referral.service';
import { REFERRAL_REPOSITORY } from '../ports/referral.repository.port';
import { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';

describe('ReferralService', () => {
  let service: ReferralService;
  let referralRepo: {
    findManyByInviter: jest.Mock;
    countByInviter: jest.Mock;
    findFirstByInvitee: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    findManyByHierarchyPath: jest.Mock;
  };

  const mockUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'test@ecoloop.us',
    firstName: 'Test',
    lastName: 'User',
    phone: null,
    role: 'ADMIN' as any,
    isActive: true,
    profileImage: null,
  };

  beforeEach(async () => {
    referralRepo = {
      findManyByInviter: jest.fn(),
      countByInviter: jest.fn(),
      findFirstByInvitee: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findManyByHierarchyPath: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralService,
        { provide: REFERRAL_REPOSITORY, useValue: referralRepo },
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
      referralRepo.findManyByInviter.mockResolvedValue(referrals);
      referralRepo.countByInviter.mockResolvedValue(1);

      const pagination = { page: 1, limit: 20, skip: 0 } as any;
      const result = await service.getMyReferrals(mockUser, pagination);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(referralRepo.findManyByInviter).toHaveBeenCalledWith('user-1', {
        skip: 0,
        take: 20,
      });
    });

    it('should return empty results when user has no referrals', async () => {
      referralRepo.findManyByInviter.mockResolvedValue([]);
      referralRepo.countByInviter.mockResolvedValue(0);

      const pagination = { page: 1, limit: 20, skip: 0 } as any;
      const result = await service.getMyReferrals(mockUser, pagination);

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('createReferral', () => {
    it('should create a referral with no parent (root level)', async () => {
      referralRepo.findFirstByInvitee.mockResolvedValue(null);
      const created = {
        id: 'r1',
        inviterId: 'user-1',
        tempId: 'temp-1',
        hierarchyPath: 'user-1',
        hierarchyLevel: 0,
        status: 'pending',
        createdAt: new Date(),
      };
      referralRepo.create.mockResolvedValue(created);

      const result = await service.createReferral(mockUser, 'temp-1');

      expect(result.hierarchyLevel).toBe(0);
      expect(result.hierarchyPath).toBe('user-1');
      expect(referralRepo.create).toHaveBeenCalledWith({
        inviterId: 'user-1',
        tempId: 'temp-1',
        hierarchyPath: 'user-1',
        hierarchyLevel: 0,
        status: 'pending',
      });
    });

    it('should create a referral with parent hierarchy', async () => {
      referralRepo.findFirstByInvitee.mockResolvedValue({
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
      referralRepo.create.mockResolvedValue(created);

      const result = await service.createReferral(user);

      expect(result.hierarchyLevel).toBe(1);
      expect(result.hierarchyPath).toBe('root-user.user-2');
      expect(referralRepo.create).toHaveBeenCalledWith({
        inviterId: 'user-2',
        tempId: null,
        hierarchyPath: 'root-user.user-2',
        hierarchyLevel: 1,
        status: 'pending',
      });
    });

    it('should default tempId to null when not provided', async () => {
      referralRepo.findFirstByInvitee.mockResolvedValue(null);
      referralRepo.create.mockResolvedValue({
        id: 'r3',
        inviterId: 'user-1',
        tempId: null,
        hierarchyPath: 'user-1',
        hierarchyLevel: 0,
        status: 'pending',
        createdAt: new Date(),
      });

      await service.createReferral(mockUser);

      expect(referralRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ tempId: null }),
      );
    });
  });

  describe('updateCommissionSplit', () => {
    it('should update the commission split for a referral', async () => {
      const split = { inviter: 70, invitee: 30 };
      referralRepo.update.mockResolvedValue({
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
      expect(referralRepo.update).toHaveBeenCalledWith('r1', { commissionSplit: split });
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
      referralRepo.findManyByHierarchyPath.mockResolvedValue(referrals);

      const result = await service.getReferralHierarchy('user-1');

      expect(result).toHaveLength(2);
      expect(referralRepo.findManyByHierarchyPath).toHaveBeenCalledWith('user-1');
    });

    it('should return empty array when no hierarchy found', async () => {
      referralRepo.findManyByHierarchyPath.mockResolvedValue([]);

      const result = await service.getReferralHierarchy('nonexistent');

      expect(result).toHaveLength(0);
    });
  });
});
