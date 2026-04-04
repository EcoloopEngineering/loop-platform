import { Test } from '@nestjs/testing';
import { UserFinanceController } from './user-finance.controller';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../../test/prisma-mock.helper';

describe('UserFinanceController', () => {
  let controller: UserFinanceController;
  let prisma: MockPrismaService;

  const mockUser: any = {
    id: 'user-1',
    email: 'rep@ecoloop.us',
    role: 'SALES_REP',
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module = await Test.createTestingModule({
      controllers: [UserFinanceController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(UserFinanceController);
  });

  describe('getFinance', () => {
    it('should return finance info when it exists', async () => {
      const financeData = {
        id: 'fin-1',
        userId: 'user-1',
        bankName: 'Chase',
        routingNumber: '021000021',
        accountNumber: '123456789',
      };
      (prisma as any).userFinance = { ...prisma.user, findUnique: jest.fn().mockResolvedValue(financeData), upsert: jest.fn() };

      // Re-create controller with updated prisma mock
      const module = await Test.createTestingModule({
        controllers: [UserFinanceController],
        providers: [{ provide: PrismaService, useValue: prisma }],
      })
        .overrideGuard(FirebaseAuthGuard)
        .useValue({ canActivate: () => true })
        .overrideGuard(RolesGuard)
        .useValue({ canActivate: () => true })
        .compile();

      controller = module.get(UserFinanceController);
      const result = await controller.getFinance(mockUser);

      expect(result).toEqual(financeData);
    });

    it('should return defaults when no finance info exists', async () => {
      (prisma as any).userFinance = { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn() };

      const module = await Test.createTestingModule({
        controllers: [UserFinanceController],
        providers: [{ provide: PrismaService, useValue: prisma }],
      })
        .overrideGuard(FirebaseAuthGuard)
        .useValue({ canActivate: () => true })
        .overrideGuard(RolesGuard)
        .useValue({ canActivate: () => true })
        .compile();

      controller = module.get(UserFinanceController);
      const result = await controller.getFinance(mockUser);

      expect(result).toEqual({
        bankName: null,
        routingNumber: null,
        accountNumber: null,
      });
    });
  });

  describe('updateFinance', () => {
    it('should upsert finance info', async () => {
      const upsertResult = {
        id: 'fin-1',
        userId: 'user-1',
        bankName: 'Chase',
        routingNumber: '021000021',
        accountNumber: '123456789',
      };
      (prisma as any).userFinance = { findUnique: jest.fn(), upsert: jest.fn().mockResolvedValue(upsertResult) };

      const module = await Test.createTestingModule({
        controllers: [UserFinanceController],
        providers: [{ provide: PrismaService, useValue: prisma }],
      })
        .overrideGuard(FirebaseAuthGuard)
        .useValue({ canActivate: () => true })
        .overrideGuard(RolesGuard)
        .useValue({ canActivate: () => true })
        .compile();

      controller = module.get(UserFinanceController);
      const result = await controller.updateFinance(mockUser, {
        bankName: 'Chase',
        routingNumber: '021000021',
        accountNumber: '123456789',
      });

      expect(result).toEqual(upsertResult);
      expect((prisma as any).userFinance.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          create: expect.objectContaining({ bankName: 'Chase' }),
          update: expect.objectContaining({ bankName: 'Chase' }),
        }),
      );
    });
  });
});
