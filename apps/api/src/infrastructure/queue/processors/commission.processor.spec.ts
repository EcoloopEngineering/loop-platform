import { EventEmitter2 } from '@nestjs/event-emitter';
import { CommissionProcessor, CommissionJobData } from './commission.processor';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../../test/prisma-mock.helper';

describe('CommissionProcessor', () => {
  let processor: CommissionProcessor;
  let prisma: MockPrismaService;
  let emitter: { emit: jest.Mock };

  beforeEach(() => {
    prisma = createMockPrismaService();
    emitter = { emit: jest.fn() };
    processor = new CommissionProcessor(prisma as any, emitter as any);
  });

  const makeJob = (data: CommissionJobData, id = 'job-1') =>
    ({ data, id } as any);

  it('should create commission payment via upsert for primary assignees', async () => {
    const now = new Date();
    prisma.leadAssignment.findMany.mockResolvedValue([
      { userId: 'user-1', leadId: 'lead-1', isPrimary: true },
    ]);
    prisma.commission.findFirst.mockResolvedValue({ amount: 1000 });
    prisma.commissionPayment.upsert.mockResolvedValue({
      id: 'cp-1',
      leadId: 'lead-1',
      userId: 'user-1',
      type: 'M1',
      amount: 600,
      createdAt: now,
      updatedAt: now,
    });

    const job = makeJob({ leadId: 'lead-1', type: 'M1', tierPct: 0.6 });
    await processor.process(job);

    expect(prisma.leadAssignment.findMany).toHaveBeenCalledWith({
      where: { leadId: 'lead-1', isPrimary: true },
    });
    expect(prisma.commissionPayment.upsert).toHaveBeenCalledWith({
      where: {
        leadId_userId_type: {
          leadId: 'lead-1',
          userId: 'user-1',
          type: 'M1',
        },
      },
      update: {},
      create: {
        leadId: 'lead-1',
        userId: 'user-1',
        type: 'M1',
        amount: 600,
        status: 'PENDING',
      },
    });
  });

  it('should emit commission.created event for new payments (createdAt === updatedAt)', async () => {
    const now = new Date();
    prisma.leadAssignment.findMany.mockResolvedValue([
      { userId: 'user-1', leadId: 'lead-1', isPrimary: true },
    ]);
    prisma.commission.findFirst.mockResolvedValue({ amount: 500 });
    prisma.commissionPayment.upsert.mockResolvedValue({
      id: 'cp-1',
      leadId: 'lead-1',
      userId: 'user-1',
      type: 'M2',
      amount: 125,
      createdAt: now,
      updatedAt: now,
    });

    const job = makeJob({ leadId: 'lead-1', type: 'M2', tierPct: 0.25 });
    await processor.process(job);

    expect(emitter.emit).toHaveBeenCalledWith('commission.created', {
      paymentId: 'cp-1',
      leadId: 'lead-1',
      userId: 'user-1',
      type: 'M2',
      amount: 125,
    });
  });

  it('should skip event emission for existing payments (createdAt !== updatedAt)', async () => {
    const created = new Date('2026-01-01T00:00:00Z');
    const updated = new Date('2026-01-02T00:00:00Z');
    prisma.leadAssignment.findMany.mockResolvedValue([
      { userId: 'user-1', leadId: 'lead-1', isPrimary: true },
    ]);
    prisma.commission.findFirst.mockResolvedValue({ amount: 500 });
    prisma.commissionPayment.upsert.mockResolvedValue({
      id: 'cp-1',
      leadId: 'lead-1',
      userId: 'user-1',
      type: 'M1',
      amount: 300,
      createdAt: created,
      updatedAt: updated,
    });

    const job = makeJob({ leadId: 'lead-1', type: 'M1', tierPct: 0.6 });
    await processor.process(job);

    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it('should warn and return when no primary assignees found', async () => {
    prisma.leadAssignment.findMany.mockResolvedValue([]);

    const job = makeJob({ leadId: 'lead-1', type: 'M1', tierPct: 0.6 });
    await processor.process(job);

    expect(prisma.commission.findFirst).not.toHaveBeenCalled();
    expect(prisma.commissionPayment.upsert).not.toHaveBeenCalled();
    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it('should handle null commission amount (amount is null/TBD)', async () => {
    const now = new Date();
    prisma.leadAssignment.findMany.mockResolvedValue([
      { userId: 'user-1', leadId: 'lead-1', isPrimary: true },
    ]);
    prisma.commission.findFirst.mockResolvedValue({ amount: null });
    prisma.commissionPayment.upsert.mockResolvedValue({
      id: 'cp-1',
      leadId: 'lead-1',
      userId: 'user-1',
      type: 'M1',
      amount: null,
      createdAt: now,
      updatedAt: now,
    });

    const job = makeJob({ leadId: 'lead-1', type: 'M1', tierPct: 0.6 });
    await processor.process(job);

    expect(prisma.commissionPayment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ amount: null }),
      }),
    );
    expect(emitter.emit).toHaveBeenCalledWith(
      'commission.created',
      expect.objectContaining({ amount: null }),
    );
  });

  it('should handle no commission record found for the lead', async () => {
    const now = new Date();
    prisma.leadAssignment.findMany.mockResolvedValue([
      { userId: 'user-1', leadId: 'lead-1', isPrimary: true },
    ]);
    prisma.commission.findFirst.mockResolvedValue(null);
    prisma.commissionPayment.upsert.mockResolvedValue({
      id: 'cp-1',
      leadId: 'lead-1',
      userId: 'user-1',
      type: 'M1',
      amount: null,
      createdAt: now,
      updatedAt: now,
    });

    const job = makeJob({ leadId: 'lead-1', type: 'M1', tierPct: 0.6 });
    await processor.process(job);

    expect(prisma.commissionPayment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ amount: null }),
      }),
    );
  });

  it('should process multiple primary assignees', async () => {
    const now = new Date();
    prisma.leadAssignment.findMany.mockResolvedValue([
      { userId: 'user-1', leadId: 'lead-1', isPrimary: true },
      { userId: 'user-2', leadId: 'lead-1', isPrimary: true },
    ]);
    prisma.commission.findFirst.mockResolvedValue({ amount: 1000 });
    prisma.commissionPayment.upsert.mockResolvedValue({
      id: 'cp-1',
      createdAt: now,
      updatedAt: now,
    });

    const job = makeJob({ leadId: 'lead-1', type: 'M1', tierPct: 0.6 });
    await processor.process(job);

    expect(prisma.commissionPayment.upsert).toHaveBeenCalledTimes(2);
  });
});
