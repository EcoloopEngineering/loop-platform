import { Test, TestingModule } from '@nestjs/testing';
import { CancellationService } from './cancellation.service';
import { JobberService } from '../../../../integrations/jobber/jobber.service';
import { EmailService } from '../../../../infrastructure/email/email.service';
import { GoogleChatService } from '../../../../integrations/google-chat/google-chat.service';
import { APPOINTMENT_REPOSITORY } from '../ports/appointment.repository.port';

describe('CancellationService', () => {
  let service: CancellationService;
  let appointmentRepo: {
    findActiveByLeadId: jest.Mock;
    update: jest.Mock;
    findLeadWithStakeholders: jest.Mock;
    findLeadMetadata: jest.Mock;
    createLeadActivity: jest.Mock;
  };
  let jobberService: { cancelVisit: jest.Mock };
  let emailService: { send: jest.Mock };
  let googleChatService: { isConfigured: jest.Mock; sendMessage: jest.Mock };

  const basePayload = {
    leadId: 'lead-1',
    customerName: 'John Doe',
    newStatus: 'CANCELLED',
    previousStage: 'CONNECTED',
  };

  beforeEach(async () => {
    appointmentRepo = {
      findActiveByLeadId: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
      findLeadWithStakeholders: jest.fn().mockResolvedValue({
        id: 'lead-1',
        assignments: [],
        projectManager: null,
        metadata: null,
      }),
      findLeadMetadata: jest.fn().mockResolvedValue({ metadata: null }),
      createLeadActivity: jest.fn().mockResolvedValue({}),
    };
    jobberService = { cancelVisit: jest.fn().mockResolvedValue({}) };
    emailService = { send: jest.fn().mockResolvedValue(true) };
    googleChatService = {
      isConfigured: jest.fn().mockReturnValue(false),
      sendMessage: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CancellationService,
        { provide: APPOINTMENT_REPOSITORY, useValue: appointmentRepo },
        { provide: JobberService, useValue: jobberService },
        { provide: EmailService, useValue: emailService },
        { provide: GoogleChatService, useValue: googleChatService },
      ],
    }).compile();

    service = module.get(CancellationService);
  });

  it('cancels Jobber appointment and updates status', async () => {
    appointmentRepo.findActiveByLeadId.mockResolvedValue({
      id: 'apt-1',
      jobberVisitId: 'jobber-visit-1',
      status: 'CONFIRMED',
    });

    await service.handleStatusChanged(basePayload);

    expect(jobberService.cancelVisit).toHaveBeenCalledWith('jobber-visit-1');
    expect(appointmentRepo.update).toHaveBeenCalledWith('apt-1', { status: 'CANCELLED' });
  });

  it('sends cancellation email to stakeholders', async () => {
    appointmentRepo.findLeadWithStakeholders.mockResolvedValue({
      id: 'lead-1',
      assignments: [{ user: { email: 'rep@test.com', firstName: 'Rep' } }],
      projectManager: { email: 'pm@test.com', firstName: 'PM' },
      metadata: null,
    });

    await service.handleStatusChanged(basePayload);

    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['rep@test.com', 'pm@test.com'],
        subject: expect.stringContaining('Cancelled'),
      }),
    );
  });

  it('creates activity log for cancellation', async () => {
    await service.handleStatusChanged(basePayload);

    expect(appointmentRepo.createLeadActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: 'lead-1',
        type: 'STAGE_CHANGE',
        description: expect.stringContaining('cancellation workflow'),
      }),
    );
  });

  it('sends Google Chat message when configured', async () => {
    googleChatService.isConfigured.mockReturnValue(true);
    appointmentRepo.findLeadMetadata.mockResolvedValue({
      metadata: { googleChatSpaceName: 'spaces/abc123' },
    });

    await service.handleStatusChanged(basePayload);

    expect(googleChatService.sendMessage).toHaveBeenCalledWith(
      'spaces/abc123',
      expect.stringContaining('Cancelled'),
    );
  });

  it('handles LOST status', async () => {
    appointmentRepo.findLeadWithStakeholders.mockResolvedValue({
      id: 'lead-1',
      assignments: [{ user: { email: 'rep@test.com', firstName: 'Rep' } }],
      projectManager: null,
      metadata: null,
    });

    await service.handleStatusChanged({ ...basePayload, newStatus: 'LOST' });

    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining('Lost'),
      }),
    );
  });

  it('does NOT trigger for unrelated statuses', async () => {
    await service.handleStatusChanged({ ...basePayload, newStatus: 'ACTIVE' });

    expect(jobberService.cancelVisit).not.toHaveBeenCalled();
    expect(emailService.send).not.toHaveBeenCalled();
    expect(appointmentRepo.createLeadActivity).not.toHaveBeenCalled();
  });
});
