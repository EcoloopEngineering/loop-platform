import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import {
  CalculateCommissionHandler,
  CalculateCommissionCommand,
} from './calculate-commission.handler';
import { COMMISSION_PAYMENT_REPOSITORY } from '../ports/commission-payment.repository.port';
import { CommissionCalculatorDomainService } from '../../domain/services/commission-calculator.domain-service';

describe('CalculateCommissionHandler', () => {
  let handler: CalculateCommissionHandler;
  let repo: Record<string, jest.Mock>;
  let calculator: CommissionCalculatorDomainService;

  beforeEach(async () => {
    repo = {
      findLeadById: jest.fn(),
      upsertCommission: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      updateStatus: jest.fn(),
      findCommissionsByUserId: jest.fn(),
      findCommissionsByLeadId: jest.fn(),
      findPaidCommissionPayment: jest.fn(),
      findSettingByKey: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        CalculateCommissionHandler,
        { provide: COMMISSION_PAYMENT_REPOSITORY, useValue: repo },
        CommissionCalculatorDomainService,
      ],
    }).compile();

    handler = module.get(CalculateCommissionHandler);
    calculator = module.get(CommissionCalculatorDomainService);
  });

  const baseCommand = new CalculateCommissionCommand(
    'lead-1',
    'user-1',
    4.5,
    2.5,
    10,
    500,
    0.6,
    false,
  );

  it('should throw NotFoundException when lead does not exist', async () => {
    repo.findLeadById.mockResolvedValue(null);

    await expect(handler.execute(baseCommand)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should create a new commission when none exists', async () => {
    repo.findLeadById.mockResolvedValue({ id: 'lead-1' });

    const calcResult = calculator.calculate({
      epc: 4.5,
      buildCost: 2.5,
      kw: 10,
      quoteDeductions: 500,
      splitPct: 0.6,
    });

    const createdCommission = {
      id: 'comm-1',
      leadId: 'lead-1',
      userId: 'user-1',
      type: 'M1',
      splitPct: 0.6,
      amount: calcResult.calculatedAmount,
      status: 'PENDING',
    };
    repo.upsertCommission.mockResolvedValue(createdCommission);

    const result = await handler.execute(baseCommand);

    expect(repo.upsertCommission).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: 'lead-1',
        userId: 'user-1',
        type: 'M1',
        splitPct: 0.6,
        amount: calcResult.calculatedAmount,
        status: 'PENDING',
      }),
    );
    expect(result.breakdown).toEqual(calcResult);
  });

  it('should set status to ACTIVE when finalize is true', async () => {
    const finalizeCommand = new CalculateCommissionCommand(
      'lead-1',
      'user-1',
      4.5,
      2.5,
      10,
      500,
      0.6,
      true,
    );

    repo.findLeadById.mockResolvedValue({ id: 'lead-1' });
    repo.upsertCommission.mockResolvedValue({
      id: 'comm-1',
      status: 'ACTIVE',
    });

    await handler.execute(finalizeCommand);

    expect(repo.upsertCommission).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE' }),
    );
  });

  it('should calculate correct commission amounts', async () => {
    repo.findLeadById.mockResolvedValue({ id: 'lead-1' });
    repo.upsertCommission.mockResolvedValue({ id: 'comm-1' });

    const result = await handler.execute(baseCommand);

    // (4.5 - 2.5) * 10 * 1000 = 20000 gross revenue
    // (20000 - 500) * 0.7 = 13650 net before split
    // 13650 * 0.6 = 8190
    expect(result.breakdown.grossRevenue).toBe(20000);
    expect(result.breakdown.netBeforeSplit).toBe(13650);
    expect(result.breakdown.calculatedAmount).toBe(8190);
  });
});
