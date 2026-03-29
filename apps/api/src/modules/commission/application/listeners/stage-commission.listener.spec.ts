import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { StageCommissionListener } from './stage-commission.listener';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { QUEUE_COMMISSION } from '../../../../infrastructure/queue/queue.module';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../../../test/prisma-mock.helper';

describe('StageCommissionListener', () => {
  let listener: StageCommissionListener;
  let prisma: MockPrismaService;
  let commissionQueue: { add: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    commissionQueue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };

    const module = await Test.createTestingModule({
      providers: [
        StageCommissionListener,
        { provide: PrismaService, useValue: prisma },
        { provide: getQueueToken(QUEUE_COMMISSION), useValue: commissionQueue },
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

  it('should enqueue M1 commission job when stage changes to WON', async () => {
    await listener.handleStageChanged(basePayload);

    expect(commissionQueue.add).toHaveBeenCalledWith(
      'commission-M1',
      { leadId: 'lead-1', type: 'M1', tierPct: 0.6 },
      expect.objectContaining({ jobId: 'M1-lead-1' }),
    );
  });

  it('should enqueue M1 commission job when stage changes to SITE_AUDIT', async () => {
    await listener.handleStageChanged({
      ...basePayload,
      newStage: 'SITE_AUDIT',
    });

    expect(commissionQueue.add).toHaveBeenCalledWith(
      'commission-M1',
      expect.objectContaining({ type: 'M1' }),
      expect.any(Object),
    );
  });

  it('should enqueue M2 commission job when stage changes to INITIAL_SUBMISSION_AND_INSPECTION', async () => {
    await listener.handleStageChanged({
      ...basePayload,
      newStage: 'INITIAL_SUBMISSION_AND_INSPECTION',
    });

    expect(commissionQueue.add).toHaveBeenCalledWith(
      'commission-M2',
      expect.objectContaining({ type: 'M2', tierPct: 0.25 }),
      expect.any(Object),
    );
  });

  it('should enqueue M3 commission job when M2 is NOT paid', async () => {
    prisma.commissionPayment.findFirst.mockResolvedValue(null);

    await listener.handleStageChanged({
      ...basePayload,
      newStage: 'WAITING_FOR_PTO',
    });

    expect(commissionQueue.add).toHaveBeenCalledWith(
      'commission-M3',
      expect.objectContaining({ type: 'M3', tierPct: 0.15 }),
      expect.any(Object),
    );
  });

  it('should NOT enqueue M3 commission job when M2 is already PAID', async () => {
    prisma.commissionPayment.findFirst.mockResolvedValue({
      id: 'cp-existing',
      type: 'M2',
      status: 'PAID',
    });

    await listener.handleStageChanged({
      ...basePayload,
      newStage: 'WAITING_FOR_PTO',
    });

    expect(commissionQueue.add).not.toHaveBeenCalled();
  });

  it('should not trigger for unrelated stages', async () => {
    await listener.handleStageChanged({
      ...basePayload,
      newStage: 'DESIGN_READY',
    });

    expect(commissionQueue.add).not.toHaveBeenCalled();
  });

  it('should use custom tiers from AppSetting when available', async () => {
    prisma.appSetting.findUnique.mockResolvedValue({
      key: 'commission',
      value: { m1: 70, m2: 20, m3: 10 },
    });

    await listener.handleStageChanged(basePayload);

    expect(commissionQueue.add).toHaveBeenCalledWith(
      'commission-M1',
      expect.objectContaining({ tierPct: 0.7 }),
      expect.any(Object),
    );
  });
});
