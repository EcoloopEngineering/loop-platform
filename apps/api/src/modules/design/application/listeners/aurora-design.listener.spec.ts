import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { AuroraDesignListener } from './aurora-design.listener';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { QUEUE_DESIGN } from '../../../../infrastructure/queue/queue.module';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('AuroraDesignListener', () => {
  let listener: AuroraDesignListener;
  let prisma: MockPrismaService;
  let designQueue: { add: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    prisma.leadActivity.create.mockResolvedValue({});
    designQueue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };

    const module = await Test.createTestingModule({
      providers: [
        AuroraDesignListener,
        { provide: PrismaService, useValue: prisma },
        { provide: getQueueToken(QUEUE_DESIGN), useValue: designQueue },
      ],
    }).compile();

    listener = module.get(AuroraDesignListener);
  });

  const payload = {
    designRequestId: 'dr-1',
    leadId: 'l1',
    propertyAddress: '123 Main, Austin, TX 78701',
    customerName: 'John Doe',
    monthlyBill: 200,
    roofCondition: 'GOOD',
    propertyType: 'RESIDENTIAL',
    userId: 'u1',
  };

  it('should enqueue aurora design job with correct data', async () => {
    await listener.handleAiDesignRequested(payload);

    expect(designQueue.add).toHaveBeenCalledWith(
      'aurora-enrichment',
      expect.objectContaining({
        designRequestId: 'dr-1',
        leadId: 'l1',
        customerName: 'John Doe',
        propertyAddress: '123 Main, Austin, TX 78701',
      }),
      expect.objectContaining({ jobId: 'design-dr-1' }),
    );
  });

  it('should include all payload fields in the job data', async () => {
    await listener.handleAiDesignRequested(payload);

    const jobData = designQueue.add.mock.calls[0][1];
    expect(jobData.monthlyBill).toBe(200);
    expect(jobData.roofCondition).toBe('GOOD');
    expect(jobData.propertyType).toBe('RESIDENTIAL');
    expect(jobData.userId).toBe('u1');
  });

  it('should log fallback activity when queue enqueue fails', async () => {
    designQueue.add.mockRejectedValue(new Error('Redis down'));

    await expect(listener.handleAiDesignRequested(payload)).resolves.not.toThrow();

    expect(prisma.leadActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        leadId: 'l1',
        type: 'DESIGN_REQUESTED',
        description: expect.stringContaining('Failed to enqueue'),
      }),
    });
  });

  it('should handle missing optional fields gracefully', async () => {
    const minimalPayload = {
      designRequestId: 'dr-2',
      leadId: 'l2',
      propertyAddress: '456 Oak, Dallas, TX 75201',
      customerName: 'Jane Smith',
      userId: 'u2',
    };

    await listener.handleAiDesignRequested(minimalPayload);

    expect(designQueue.add).toHaveBeenCalledWith(
      'aurora-enrichment',
      expect.objectContaining({
        designRequestId: 'dr-2',
        leadId: 'l2',
      }),
      expect.any(Object),
    );
  });
});
