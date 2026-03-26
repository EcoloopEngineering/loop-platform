import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StageCommissionListener } from './stage-commission.listener';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../../../test/prisma-mock.helper';

describe('StageCommissionListener', () => {
  let listener: StageCommissionListener;
  let prisma: MockPrismaService;
  let emitter: { emit: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    emitter = { emit: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        StageCommissionListener,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: emitter },
      ],
    }).compile();

    listener = module.get(StageCommissionListener);
  });

  const basePayload = {
    leadId: 'lead-1',
    customerName: 'John Doe',
    previousStage: 'CONNECTED',
    newStage: 'WON',
  };

  it('should create M1 commission payment when stage changes to WON', async () => {
    prisma.leadAssignment.findMany.mockResolvedValue([
      { userId: 'user-1', isPrimary: true },
    ]);
    prisma.commission.findFirst.mockResolvedValue({ amount: 10000 });
    prisma.commissionPayment.findFirst.mockResolvedValue(null);
    prisma.commissionPayment.create.mockResolvedValue({
      id: 'cp-1',
      leadId: 'lead-1',
      userId: 'user-1',
      type: 'M1',
      amount: 6000,
      status: 'PENDING',
    });

    await listener.handleStageChanged(basePayload);

    expect(prisma.commissionPayment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        leadId: 'lead-1',
        userId: 'user-1',
        type: 'M1',
        amount: 6000,
        status: 'PENDING',
      }),
    });
    expect(emitter.emit).toHaveBeenCalledWith(
      'commission.created',
      expect.objectContaining({ type: 'M1', leadId: 'lead-1' }),
    );
  });

  it('should create M1 commission payment when stage changes to SITE_AUDIT', async () => {
    prisma.leadAssignment.findMany.mockResolvedValue([
      { userId: 'user-1', isPrimary: true },
    ]);
    prisma.commission.findFirst.mockResolvedValue({ amount: 5000 });
    prisma.commissionPayment.findFirst.mockResolvedValue(null);
    prisma.commissionPayment.create.mockResolvedValue({
      id: 'cp-2',
      leadId: 'lead-1',
      userId: 'user-1',
      type: 'M1',
      amount: 3000,
      status: 'PENDING',
    });

    await listener.handleStageChanged({
      ...basePayload,
      newStage: 'SITE_AUDIT',
    });

    expect(prisma.commissionPayment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'M1' }),
    });
  });

  it('should create M2 commission payment when stage changes to INITIAL_SUBMISSION_AND_INSPECTION', async () => {
    prisma.leadAssignment.findMany.mockResolvedValue([
      { userId: 'user-1', isPrimary: true },
    ]);
    prisma.commission.findFirst.mockResolvedValue({ amount: 10000 });
    prisma.commissionPayment.findFirst.mockResolvedValue(null);
    prisma.commissionPayment.create.mockResolvedValue({
      id: 'cp-3',
      leadId: 'lead-1',
      userId: 'user-1',
      type: 'M2',
      amount: 2500,
      status: 'PENDING',
    });

    await listener.handleStageChanged({
      ...basePayload,
      newStage: 'INITIAL_SUBMISSION_AND_INSPECTION',
    });

    expect(prisma.commissionPayment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'M2',
        amount: 2500,
      }),
    });
  });

  it('should create M3 commission payment when M2 is NOT paid', async () => {
    prisma.commissionPayment.findFirst
      .mockResolvedValueOnce(null)  // M2 not paid
      .mockResolvedValueOnce(null); // No existing M3
    prisma.leadAssignment.findMany.mockResolvedValue([
      { userId: 'user-1', isPrimary: true },
    ]);
    prisma.commission.findFirst.mockResolvedValue({ amount: 10000 });
    prisma.commissionPayment.create.mockResolvedValue({
      id: 'cp-4',
      leadId: 'lead-1',
      userId: 'user-1',
      type: 'M3',
      amount: 1500,
      status: 'PENDING',
    });

    await listener.handleStageChanged({
      ...basePayload,
      newStage: 'WAITING_FOR_PTO',
    });

    expect(prisma.commissionPayment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'M3',
        amount: 1500,
      }),
    });
  });

  it('should NOT create M3 commission payment when M2 is already PAID', async () => {
    prisma.commissionPayment.findFirst.mockResolvedValue({
      id: 'cp-existing',
      type: 'M2',
      status: 'PAID',
    });

    await listener.handleStageChanged({
      ...basePayload,
      newStage: 'WAITING_FOR_PTO',
    });

    expect(prisma.commissionPayment.create).not.toHaveBeenCalled();
  });

  it('should skip if payment already exists for user/lead/type', async () => {
    prisma.leadAssignment.findMany.mockResolvedValue([
      { userId: 'user-1', isPrimary: true },
    ]);
    prisma.commission.findFirst.mockResolvedValue({ amount: 10000 });
    prisma.commissionPayment.findFirst.mockResolvedValue({
      id: 'existing-cp',
      type: 'M1',
    });

    await listener.handleStageChanged(basePayload);

    expect(prisma.commissionPayment.create).not.toHaveBeenCalled();
  });

  it('should skip if no primary assignees found', async () => {
    prisma.leadAssignment.findMany.mockResolvedValue([]);

    await listener.handleStageChanged(basePayload);

    expect(prisma.commissionPayment.create).not.toHaveBeenCalled();
    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it('should not trigger for unrelated stages', async () => {
    await listener.handleStageChanged({
      ...basePayload,
      newStage: 'DESIGN_READY',
    });

    expect(prisma.leadAssignment.findMany).not.toHaveBeenCalled();
    expect(prisma.commissionPayment.create).not.toHaveBeenCalled();
  });
});
