import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { StageEmailListener } from './stage-email.listener';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { EmailService } from '../../../../infrastructure/email/email.service';
import { QUEUE_EMAIL } from '../../../../infrastructure/queue/queue.module';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('StageEmailListener', () => {
  let listener: StageEmailListener;
  let prisma: MockPrismaService;
  let emailService: { send: jest.Mock; isConfigured: jest.Mock };
  let emailQueue: { add: jest.Mock };

  const mockLead = {
    id: 'lead-1',
    customer: { id: 'cust-1', firstName: 'John', email: 'john@example.com' },
    assignments: [
      { isPrimary: true, user: { email: 'owner@ecoloop.us', firstName: 'Alice' } },
    ],
    projectManager: { email: 'pm@ecoloop.us', firstName: 'Bob' },
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    emailService = {
      send: jest.fn().mockResolvedValue(true),
      isConfigured: jest.fn().mockReturnValue(true),
    };
    emailQueue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StageEmailListener,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: emailService },
        { provide: getQueueToken(QUEUE_EMAIL), useValue: emailQueue },
      ],
    }).compile();

    listener = module.get<StageEmailListener>(StageEmailListener);
  });

  it('should return early when email is not configured', async () => {
    emailService.isConfigured.mockReturnValue(false);

    await listener.handleStageChanged({
      leadId: 'lead-1',
      customerName: 'John',
      previousStage: 'NEW_LEAD',
      newStage: 'DESIGN_READY',
    });

    expect(prisma.lead.findUnique).not.toHaveBeenCalled();
    expect(emailQueue.add).not.toHaveBeenCalled();
  });

  it('should enqueue install-ready email for INSTALL_READY stage', async () => {
    prisma.lead.findUnique.mockResolvedValue(mockLead);

    await listener.handleStageChanged({
      leadId: 'lead-1',
      customerName: 'John',
      previousStage: 'CONNECTED',
      newStage: 'INSTALL_READY',
    });

    expect(emailQueue.add).toHaveBeenCalledTimes(1);
    expect(emailQueue.add).toHaveBeenCalledWith(
      'send',
      expect.objectContaining({
        to: 'owner@ecoloop.us',
        subject: expect.stringContaining('Install Ready'),
      }),
      expect.any(Object),
    );
  });

  it('should enqueue two emails for WON stage (owner + customer)', async () => {
    prisma.lead.findUnique.mockResolvedValue(mockLead);

    await listener.handleStageChanged({
      leadId: 'lead-1',
      customerName: 'John',
      previousStage: 'DESIGN_READY',
      newStage: 'WON',
    });

    expect(emailQueue.add).toHaveBeenCalledTimes(2);
    expect(emailQueue.add).toHaveBeenCalledWith(
      'send',
      expect.objectContaining({
        to: 'owner@ecoloop.us',
        subject: expect.stringContaining('Deal Won'),
      }),
      expect.any(Object),
    );
    expect(emailQueue.add).toHaveBeenCalledWith(
      'send',
      expect.objectContaining({
        to: 'john@example.com',
        subject: expect.stringContaining('Welcome'),
      }),
      expect.any(Object),
    );
  });

  it('should enqueue generic stage email for non-special stages', async () => {
    prisma.lead.findUnique.mockResolvedValue(mockLead);

    await listener.handleStageChanged({
      leadId: 'lead-1',
      customerName: 'John',
      previousStage: 'DESIGN_READY',
      newStage: 'SITE_AUDIT',
    });

    expect(emailQueue.add).toHaveBeenCalled();
  });

  it('should enqueue generic stage email to owner and PM for other stages', async () => {
    prisma.lead.findUnique.mockResolvedValue(mockLead);

    await listener.handleStageChanged({
      leadId: 'lead-1',
      customerName: 'John',
      previousStage: 'NEW_LEAD',
      newStage: 'DESIGN_IN_PROGRESS',
    });

    expect(emailQueue.add).toHaveBeenCalledTimes(1);
    expect(emailQueue.add).toHaveBeenCalledWith(
      'send',
      expect.objectContaining({
        to: ['owner@ecoloop.us', 'pm@ecoloop.us'],
        subject: expect.stringContaining('Design In Progress'),
      }),
      expect.any(Object),
    );
  });

  it('should return early when lead is not found', async () => {
    prisma.lead.findUnique.mockResolvedValue(null);

    await listener.handleStageChanged({
      leadId: 'nonexistent',
      customerName: 'Ghost',
      previousStage: 'NEW_LEAD',
      newStage: 'WON',
    });

    expect(emailQueue.add).not.toHaveBeenCalled();
  });
});
