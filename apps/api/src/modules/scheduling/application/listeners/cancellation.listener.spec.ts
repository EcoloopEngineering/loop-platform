import { Test } from '@nestjs/testing';
import { CancellationListener } from './cancellation.listener';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { JobberService } from '../../../../integrations/jobber/jobber.service';
import { EmailService } from '../../../../infrastructure/email/email.service';
import { GoogleChatService } from '../../../../integrations/google-chat/google-chat.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../../../test/prisma-mock.helper';

describe('CancellationListener', () => {
  let listener: CancellationListener;
  let prisma: MockPrismaService;
  let jobberService: { cancelVisit: jest.Mock };
  let emailService: { send: jest.Mock };
  let googleChatService: { isConfigured: jest.Mock; sendMessage: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    jobberService = { cancelVisit: jest.fn().mockResolvedValue({}) };
    emailService = { send: jest.fn().mockResolvedValue(true) };
    googleChatService = {
      isConfigured: jest.fn().mockReturnValue(false),
      sendMessage: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        CancellationListener,
        { provide: PrismaService, useValue: prisma },
        { provide: JobberService, useValue: jobberService },
        { provide: EmailService, useValue: emailService },
        { provide: GoogleChatService, useValue: googleChatService },
      ],
    }).compile();

    listener = module.get(CancellationListener);
  });

  const basePayload = {
    leadId: 'lead-1',
    customerName: 'John Doe',
    newStatus: 'CANCELLED',
    previousStage: 'CONNECTED',
  };

  it('should cancel Jobber appointment when lead status changes to CANCELLED', async () => {
    prisma.appointment.findFirst.mockResolvedValue({
      id: 'apt-1',
      jobberVisitId: 'jobber-visit-1',
      status: 'CONFIRMED',
    });
    prisma.appointment.update.mockResolvedValue({});
    prisma.lead.findUnique.mockResolvedValue({
      id: 'lead-1',
      assignments: [
        { user: { email: 'rep@test.com', firstName: 'Rep' } },
      ],
      projectManager: null,
      metadata: null,
    });
    prisma.leadActivity.create.mockResolvedValue({});

    await listener.handleStatusChanged(basePayload);

    expect(jobberService.cancelVisit).toHaveBeenCalledWith('jobber-visit-1');
    expect(prisma.appointment.update).toHaveBeenCalledWith({
      where: { id: 'apt-1' },
      data: { status: 'CANCELLED' },
    });
  });

  it('should send cancellation email to stakeholders', async () => {
    prisma.appointment.findFirst.mockResolvedValue(null);
    prisma.lead.findUnique.mockResolvedValue({
      id: 'lead-1',
      assignments: [
        { user: { email: 'rep@test.com', firstName: 'Rep' } },
      ],
      projectManager: { email: 'pm@test.com', firstName: 'PM' },
      metadata: null,
    });
    prisma.leadActivity.create.mockResolvedValue({});

    await listener.handleStatusChanged(basePayload);

    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['rep@test.com', 'pm@test.com'],
        subject: expect.stringContaining('Cancelled'),
      }),
    );
  });

  it('should create activity log for cancellation', async () => {
    prisma.appointment.findFirst.mockResolvedValue(null);
    prisma.lead.findUnique.mockResolvedValue({
      id: 'lead-1',
      assignments: [],
      projectManager: null,
      metadata: null,
    });
    prisma.leadActivity.create.mockResolvedValue({});

    await listener.handleStatusChanged(basePayload);

    expect(prisma.leadActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        leadId: 'lead-1',
        type: 'STAGE_CHANGE',
        description: expect.stringContaining('cancellation workflow'),
      }),
    });
  });

  it('should send Google Chat message when configured', async () => {
    googleChatService.isConfigured.mockReturnValue(true);
    prisma.appointment.findFirst.mockResolvedValue(null);
    prisma.lead.findUnique.mockResolvedValue({
      id: 'lead-1',
      assignments: [],
      projectManager: null,
      metadata: { googleChatSpaceName: 'spaces/abc123' },
    });
    prisma.leadActivity.create.mockResolvedValue({});

    await listener.handleStatusChanged(basePayload);

    expect(googleChatService.sendMessage).toHaveBeenCalledWith(
      'spaces/abc123',
      expect.stringContaining('Cancelled'),
    );
  });

  it('should handle LOST status as well', async () => {
    prisma.appointment.findFirst.mockResolvedValue(null);
    prisma.lead.findUnique.mockResolvedValue({
      id: 'lead-1',
      assignments: [
        { user: { email: 'rep@test.com', firstName: 'Rep' } },
      ],
      projectManager: null,
      metadata: null,
    });
    prisma.leadActivity.create.mockResolvedValue({});

    await listener.handleStatusChanged({
      ...basePayload,
      newStatus: 'LOST',
    });

    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining('Lost'),
      }),
    );
    expect(prisma.leadActivity.create).toHaveBeenCalled();
  });

  it('should NOT trigger for unrelated statuses', async () => {
    await listener.handleStatusChanged({
      ...basePayload,
      newStatus: 'ACTIVE',
    });

    expect(jobberService.cancelVisit).not.toHaveBeenCalled();
    expect(emailService.send).not.toHaveBeenCalled();
    expect(prisma.leadActivity.create).not.toHaveBeenCalled();
  });
});
