import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { CommissionController } from './commission.controller';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CommissionCalculatorDomainService } from '../domain/services/commission-calculator.domain-service';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { CalculateCommissionCommand } from '../application/commands/calculate-commission.handler';

describe('CommissionController', () => {
  let controller: CommissionController;
  let commandBus: { execute: jest.Mock };
  let prisma: { commission: { findMany: jest.Mock } };
  let calculator: { calculate: jest.Mock };

  const mockUser = {
    id: 'user-1',
    email: 'test@ecoloop.us',
    firstName: 'Test',
    lastName: 'User',
    role: 'ADMIN',
    isActive: true,
    profileImage: null,
  } as any;

  beforeEach(async () => {
    commandBus = { execute: jest.fn() };
    prisma = { commission: { findMany: jest.fn() } };
    calculator = { calculate: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommissionController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: PrismaService, useValue: prisma },
        { provide: CommissionCalculatorDomainService, useValue: calculator },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CommissionController>(CommissionController);
  });

  describe('listCommissions', () => {
    it('should query commissions for the current user', async () => {
      const commissions = [{ id: 'c-1', amount: 1500 }, { id: 'c-2', amount: 2000 }];
      prisma.commission.findMany.mockResolvedValue(commissions);

      const result = await controller.listCommissions(mockUser);

      expect(prisma.commission.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      expect(result).toEqual(commissions);
    });

    it('should return empty array when no commissions', async () => {
      prisma.commission.findMany.mockResolvedValue([]);

      const result = await controller.listCommissions(mockUser);

      expect(result).toEqual([]);
    });
  });

  describe('getCommissionsByLead', () => {
    it('should query commissions for a specific lead', async () => {
      const commissions = [{ id: 'c-1', leadId: 'lead-1', amount: 1500 }];
      prisma.commission.findMany.mockResolvedValue(commissions);

      const result = await controller.getCommissionsByLead('lead-1');

      expect(prisma.commission.findMany).toHaveBeenCalledWith({
        where: { leadId: 'lead-1' },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      expect(result).toEqual(commissions);
    });
  });

  describe('calculatePreview', () => {
    it('should delegate to CommissionCalculatorDomainService.calculate with parsed floats', async () => {
      const preview = { grossMargin: 5000, commission: 3500 };
      calculator.calculate.mockReturnValue(preview);

      const result = await controller.calculatePreview('lead-1', '3.50', '2.00', '10', '500', '0.60');

      expect(calculator.calculate).toHaveBeenCalledWith({
        epc: 3.5,
        buildCost: 2.0,
        kw: 10,
        quoteDeductions: 500,
        splitPct: 0.6,
      });
      expect(result).toEqual(preview);
    });
  });

  describe('finalizeCommission', () => {
    it('should execute CalculateCommissionCommand via CommandBus', async () => {
      const dto = { epc: 3.5, buildCost: 2.0, kw: 10, quoteDeductions: 500, splitPct: 0.6 };
      const expected = { id: 'c-1', amount: 3500 };
      commandBus.execute.mockResolvedValue(expected);

      const result = await controller.finalizeCommission('lead-1', dto, mockUser);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new CalculateCommissionCommand('lead-1', 'user-1', 3.5, 2.0, 10, 500, 0.6, true),
      );
      expect(result).toEqual(expected);
    });

    it('should propagate errors from CommandBus', async () => {
      const dto = { epc: 3.5, buildCost: 2.0, kw: 10, quoteDeductions: 500, splitPct: 0.6 };
      commandBus.execute.mockRejectedValue(new Error('Lead not found'));

      await expect(controller.finalizeCommission('lead-1', dto, mockUser)).rejects.toThrow('Lead not found');
    });
  });
});
