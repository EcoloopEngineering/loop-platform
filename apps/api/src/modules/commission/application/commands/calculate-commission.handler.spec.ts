import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import {
  CalculateCommissionHandler,
  CalculateCommissionCommand,
} from './calculate-commission.handler';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { CommissionCalculatorDomainService } from '../../domain/services/commission-calculator.domain-service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../../../test/prisma-mock.helper';

describe('CalculateCommissionHandler', () => {
  let handler: CalculateCommissionHandler;
  let prisma: MockPrismaService;
  let calculator: CommissionCalculatorDomainService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module = await Test.createTestingModule({
      providers: [
        CalculateCommissionHandler,
        { provide: PrismaService, useValue: prisma },
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
    prisma.lead.findUnique.mockResolvedValue(null);

    await expect(handler.execute(baseCommand)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should create a new commission when none exists', async () => {
    prisma.lead.findUnique.mockResolvedValue({ id: 'lead-1' });
    prisma.commission.findFirst.mockResolvedValue(null);

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
    prisma.commission.create.mockResolvedValue(createdCommission);

    const result = await handler.execute(baseCommand);

    expect(prisma.commission.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        lead: { connect: { id: 'lead-1' } },
        user: { connect: { id: 'user-1' } },
        type: 'M1',
        splitPct: 0.6,
        amount: calcResult.calculatedAmount,
        status: 'PENDING',
      }),
    });
    expect(result.breakdown).toEqual(calcResult);
  });

  it('should update an existing commission', async () => {
    prisma.lead.findUnique.mockResolvedValue({ id: 'lead-1' });
    prisma.commission.findFirst.mockResolvedValue({
      id: 'comm-existing',
      leadId: 'lead-1',
      userId: 'user-1',
    });

    const updatedCommission = {
      id: 'comm-existing',
      leadId: 'lead-1',
      userId: 'user-1',
      status: 'PENDING',
    };
    prisma.commission.update.mockResolvedValue(updatedCommission);

    const result = await handler.execute(baseCommand);

    expect(prisma.commission.update).toHaveBeenCalledWith({
      where: { id: 'comm-existing' },
      data: expect.objectContaining({
        splitPct: 0.6,
        status: 'PENDING',
      }),
    });
    expect(result.breakdown).toBeDefined();
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

    prisma.lead.findUnique.mockResolvedValue({ id: 'lead-1' });
    prisma.commission.findFirst.mockResolvedValue(null);
    prisma.commission.create.mockResolvedValue({
      id: 'comm-1',
      status: 'ACTIVE',
    });

    await handler.execute(finalizeCommand);

    expect(prisma.commission.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: 'ACTIVE' }),
    });
  });

  it('should calculate correct commission amounts', async () => {
    prisma.lead.findUnique.mockResolvedValue({ id: 'lead-1' });
    prisma.commission.findFirst.mockResolvedValue(null);
    prisma.commission.create.mockResolvedValue({ id: 'comm-1' });

    const result = await handler.execute(baseCommand);

    // (4.5 - 2.5) * 10 * 1000 = 20000 gross revenue
    // (20000 - 500) * 0.7 = 13650 net before split
    // 13650 * 0.6 = 8190
    expect(result.breakdown.grossRevenue).toBe(20000);
    expect(result.breakdown.netBeforeSplit).toBe(13650);
    expect(result.breakdown.calculatedAmount).toBe(8190);
  });
});
