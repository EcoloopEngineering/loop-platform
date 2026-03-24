import { Test, TestingModule } from '@nestjs/testing';
import { ReferralsController } from './referrals.controller';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { createMockPrismaService, MockPrismaService } from '../../../test/prisma-mock.helper';

describe('ReferralsController', () => {
  let controller: ReferralsController;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReferralsController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ReferralsController>(ReferralsController);
  });

  describe('findAll', () => {
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

      const user = { id: 'user-1' } as any;
      const pagination = { page: 1, limit: 20, skip: 0 } as any;

      const result = await controller.findAll(user, pagination);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(prisma.referral.findMany).toHaveBeenCalled();
    });
  });

  describe('invite', () => {
    it('should create a referral invitation with no parent', async () => {
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

      const user = { id: 'user-1' } as any;
      const result = await controller.invite(user, { tempId: 'temp-1' });

      expect(result.hierarchyLevel).toBe(0);
      expect(prisma.referral.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            inviterId: 'user-1',
            hierarchyLevel: 0,
            status: 'pending',
          }),
        }),
      );
    });

    it('should create a referral with parent hierarchy', async () => {
      prisma.referral.findFirst.mockResolvedValue({
        hierarchyPath: 'root-user',
        hierarchyLevel: 0,
      });
      const created = {
        id: 'r2',
        inviterId: 'user-2',
        hierarchyPath: 'root-user.user-2',
        hierarchyLevel: 1,
        status: 'pending',
        createdAt: new Date(),
      };
      prisma.referral.create.mockResolvedValue(created);

      const user = { id: 'user-2' } as any;
      const result = await controller.invite(user, {});

      expect(result.hierarchyLevel).toBe(1);
      expect(prisma.referral.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            hierarchyPath: 'root-user.user-2',
            hierarchyLevel: 1,
          }),
        }),
      );
    });
  });

  describe('updateCommissionSplit', () => {
    it('should update the commission split for a referral', async () => {
      const split = { inviter: 70, invitee: 30 };
      const updated = {
        id: 'r1',
        inviterId: 'user-1',
        commissionSplit: split,
        hierarchyPath: 'user-1',
        hierarchyLevel: 0,
        status: 'pending',
        createdAt: new Date(),
      };
      prisma.referral.update.mockResolvedValue(updated);

      const result = await controller.updateCommissionSplit('r1', {
        commissionSplit: split,
      });

      expect(result.commissionSplit).toEqual(split);
      expect(prisma.referral.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: { commissionSplit: split },
      });
    });
  });
});
