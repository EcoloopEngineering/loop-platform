import { Test, TestingModule } from '@nestjs/testing';
import { ReferralsController } from './referrals.controller';
import { ReferralService } from '../application/services/referral.service';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ReferralEntity } from '../domain/entities/referral.entity';
import { PaginatedResponse } from '../../../common/dto/pagination.dto';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';

describe('ReferralsController', () => {
  let controller: ReferralsController;
  let referralService: jest.Mocked<ReferralService>;

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
    const mockReferralService = {
      getMyReferrals: jest.fn(),
      createReferral: jest.fn(),
      updateCommissionSplit: jest.fn(),
      getReferralHierarchy: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReferralsController],
      providers: [
        { provide: ReferralService, useValue: mockReferralService },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ReferralsController>(ReferralsController);
    referralService = module.get(ReferralService);
  });

  describe('findAll', () => {
    it('should delegate to referralService.getMyReferrals', async () => {
      const referral = new ReferralEntity({
        id: 'r1',
        inviterId: 'user-1',
        inviteeId: null,
        tempId: null,
        hierarchyPath: 'user-1',
        hierarchyLevel: 0,
        commissionSplit: null,
        status: 'pending',
        createdAt: new Date(),
      });
      const paginated = new PaginatedResponse([referral], 1, 1, 20);
      referralService.getMyReferrals.mockResolvedValue(paginated);

      const pagination = { page: 1, limit: 20, skip: 0 } as any;
      const result = await controller.findAll(mockUser, pagination);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(referralService.getMyReferrals).toHaveBeenCalledWith(
        mockUser,
        pagination,
      );
    });
  });

  describe('invite', () => {
    it('should delegate to referralService.createReferral', async () => {
      const referral = new ReferralEntity({
        id: 'r1',
        inviterId: 'user-1',
        tempId: 'temp-1',
        hierarchyPath: 'user-1',
        hierarchyLevel: 0,
        status: 'pending',
        createdAt: new Date(),
      });
      referralService.createReferral.mockResolvedValue(referral);

      const result = await controller.invite(mockUser, { tempId: 'temp-1' });

      expect(result.hierarchyLevel).toBe(0);
      expect(referralService.createReferral).toHaveBeenCalledWith(
        mockUser,
        'temp-1',
      );
    });

    it('should pass undefined tempId when not provided', async () => {
      const referral = new ReferralEntity({
        id: 'r2',
        inviterId: 'user-1',
        hierarchyPath: 'user-1',
        hierarchyLevel: 0,
        status: 'pending',
        createdAt: new Date(),
      });
      referralService.createReferral.mockResolvedValue(referral);

      await controller.invite(mockUser, {});

      expect(referralService.createReferral).toHaveBeenCalledWith(
        mockUser,
        undefined,
      );
    });
  });

  describe('updateCommissionSplit', () => {
    it('should delegate to referralService.updateCommissionSplit', async () => {
      const split = { inviter: 70, invitee: 30 };
      const referral = new ReferralEntity({
        id: 'r1',
        inviterId: 'user-1',
        commissionSplit: split,
        hierarchyPath: 'user-1',
        hierarchyLevel: 0,
        status: 'pending',
        createdAt: new Date(),
      });
      referralService.updateCommissionSplit.mockResolvedValue(referral);

      const result = await controller.updateCommissionSplit('r1', {
        commissionSplit: split,
      });

      expect(result.commissionSplit).toEqual(split);
      expect(referralService.updateCommissionSplit).toHaveBeenCalledWith(
        'r1',
        split,
      );
    });
  });
});
