import { Test } from '@nestjs/testing';
import { StageCommissionListener } from './stage-commission.listener';
import { COMMISSION_PAYMENT_REPOSITORY } from '../ports/commission-payment.repository.port';
import { QUEUE_COMMISSION } from '../../../../infrastructure/queue/queue.module';
import { QueueFallbackService } from '../../../../infrastructure/queue/queue-fallback.service';

describe('StageCommissionListener', () => {
  let listener: StageCommissionListener;
  let repo: Record<string, jest.Mock>;
  let commissionQueue: { add: jest.Mock };
  let queueFallback: QueueFallbackService;

  beforeEach(async () => {
    repo = {
      findSettingByKey: jest.fn().mockResolvedValue(null),
      findPaidCommissionPayment: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      updateStatus: jest.fn(),
      findCommissionsByUserId: jest.fn(),
      findCommissionsByLeadId: jest.fn(),
      findLeadById: jest.fn(),
      upsertCommission: jest.fn(),
    };
    commissionQueue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };
    queueFallback = new QueueFallbackService(true);

    const module = await Test.createTestingModule({
      providers: [
        StageCommissionListener,
        { provide: COMMISSION_PAYMENT_REPOSITORY, useValue: repo },
        { provide: QueueFallbackService, useValue: queueFallback },
        { provide: `BullQueue_${QUEUE_COMMISSION}`, useValue: commissionQueue },
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
    repo.findPaidCommissionPayment.mockResolvedValue(null);

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
    repo.findPaidCommissionPayment.mockResolvedValue({
      id: 'cp-existing',
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
    repo.findSettingByKey.mockResolvedValue({
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
