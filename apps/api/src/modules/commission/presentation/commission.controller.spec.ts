import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { CommissionController } from './commission.controller';
import { CommissionQueryService } from '../application/services/commission-query.service';
import { CommissionCalculatorDomainService } from '../domain/services/commission-calculator.domain-service';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { CalculateCommissionCommand } from '../application/commands/calculate-commission.handler';

describe('CommissionController', () => {
  let controller: CommissionController;
  let commandBus: { execute: jest.Mock };
  let commissionQuery: { findByUserId: jest.Mock; findByLeadId: jest.Mock };
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
    commissionQuery = { findByUserId: jest.fn(), findByLeadId: jest.fn() };
    calculator = { calculate: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommissionController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: CommissionQueryService, useValue: commissionQuery },
        { provide: CommissionCalculatorDomainService, useValue: calculator },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CommissionController>(CommissionController);
  });

  describe('listCommissions', () => {
    it('should delegate to CommissionQueryService.findByUserId', async () => {
      const commissions = [{ id: 'c-1', amount: 1500 }, { id: 'c-2', amount: 2000 }];
      commissionQuery.findByUserId.mockResolvedValue(commissions);

      const result = await controller.listCommissions(mockUser);

      expect(commissionQuery.findByUserId).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(commissions);
    });

    it('should return empty array when no commissions', async () => {
      commissionQuery.findByUserId.mockResolvedValue([]);

      const result = await controller.listCommissions(mockUser);

      expect(result).toEqual([]);
    });
  });

  describe('getCommissionsByLead', () => {
    it('should delegate to CommissionQueryService.findByLeadId', async () => {
      const commissions = [{ id: 'c-1', leadId: 'lead-1', amount: 1500 }];
      commissionQuery.findByLeadId.mockResolvedValue(commissions);

      const result = await controller.getCommissionsByLead('lead-1');

      expect(commissionQuery.findByLeadId).toHaveBeenCalledWith('lead-1');
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
