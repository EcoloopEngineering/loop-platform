import { Test, TestingModule } from '@nestjs/testing';
import { StageEmailService } from './stage-email.service';
import { EmailService } from '../../../../infrastructure/email/email.service';
import { QUEUE_EMAIL } from '../../../../infrastructure/queue/queue.constants';
import { QueueFallbackService } from '../../../../infrastructure/queue/queue-fallback.service';
import { NOTIFICATION_REPOSITORY } from '../ports/notification.repository.port';


describe('StageEmailService', () => {
  let service: StageEmailService;
  let notificationRepo: {
    findLeadWithStakeholders: jest.Mock;
    findNotificationSetting: jest.Mock;
  };
  let emailService: { isConfigured: jest.Mock; send: jest.Mock };
  let queueFallback: { addOrExecute: jest.Mock };

  const mockLead = {
    id: 'lead-1',
    customer: { id: 'cust-1', firstName: 'John', email: 'john@example.com' },
    assignments: [
      { isPrimary: true, user: { email: 'owner@ecoloop.us', firstName: 'Alice' } },
    ],
    projectManager: { email: 'pm@ecoloop.us', firstName: 'Bob' },
  };

  beforeEach(async () => {
    notificationRepo = {
      findLeadWithStakeholders: jest.fn(),
      findNotificationSetting: jest.fn().mockResolvedValue(null),
    };
    emailService = {
      isConfigured: jest.fn().mockReturnValue(true),
      send: jest.fn().mockResolvedValue(true),
    };
    queueFallback = { addOrExecute: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StageEmailService,
        { provide: NOTIFICATION_REPOSITORY, useValue: notificationRepo },
        { provide: EmailService, useValue: emailService },
        { provide: QueueFallbackService, useValue: queueFallback },
        { provide: `BullQueue_${QUEUE_EMAIL}`, useValue: null },
      ],
    }).compile();

    service = module.get(StageEmailService);
  });

  it('enqueues install-ready email for INSTALL_READY stage', async () => {
    notificationRepo.findLeadWithStakeholders.mockResolvedValue(mockLead);

    await service.handleStageChanged({
      leadId: 'lead-1',
      customerName: 'John',
      previousStage: 'CONNECTED',
      newStage: 'INSTALL_READY',
    });

    expect(queueFallback.addOrExecute).toHaveBeenCalledTimes(1);
    expect(queueFallback.addOrExecute).toHaveBeenCalledWith(
      null,
      'send',
      expect.objectContaining({
        to: 'owner@ecoloop.us',
        subject: expect.stringContaining('Install Ready'),
      }),
      expect.any(Object),
      expect.any(Function),
    );
  });

  it('enqueues two emails for WON stage (owner + customer)', async () => {
    notificationRepo.findLeadWithStakeholders.mockResolvedValue(mockLead);

    await service.handleStageChanged({
      leadId: 'lead-1',
      customerName: 'John',
      previousStage: 'DESIGN_READY',
      newStage: 'WON',
    });

    expect(queueFallback.addOrExecute).toHaveBeenCalledTimes(2);
    expect(queueFallback.addOrExecute).toHaveBeenCalledWith(
      null,
      'send',
      expect.objectContaining({ to: 'owner@ecoloop.us' }),
      expect.any(Object),
      expect.any(Function),
    );
    expect(queueFallback.addOrExecute).toHaveBeenCalledWith(
      null,
      'send',
      expect.objectContaining({ to: 'john@example.com' }),
      expect.any(Object),
      expect.any(Function),
    );
  });

  it('returns early when email is not configured', async () => {
    emailService.isConfigured.mockReturnValue(false);

    await service.handleStageChanged({
      leadId: 'lead-1',
      customerName: 'John',
      previousStage: 'NEW_LEAD',
      newStage: 'WON',
    });

    expect(notificationRepo.findLeadWithStakeholders).not.toHaveBeenCalled();
    expect(queueFallback.addOrExecute).not.toHaveBeenCalled();
  });

  it('enqueues generic email to owner and PM for other stages', async () => {
    notificationRepo.findLeadWithStakeholders.mockResolvedValue(mockLead);

    await service.handleStageChanged({
      leadId: 'lead-1',
      customerName: 'John',
      previousStage: 'NEW_LEAD',
      newStage: 'DESIGN_IN_PROGRESS',
    });

    expect(queueFallback.addOrExecute).toHaveBeenCalledTimes(1);
    expect(queueFallback.addOrExecute).toHaveBeenCalledWith(
      null,
      'send',
      expect.objectContaining({
        to: ['owner@ecoloop.us', 'pm@ecoloop.us'],
        subject: expect.stringContaining('Design In Progress'),
      }),
      expect.any(Object),
      expect.any(Function),
    );
  });

  it('skips when lead is not found', async () => {
    notificationRepo.findLeadWithStakeholders.mockResolvedValue(null);

    await service.handleStageChanged({
      leadId: 'nonexistent',
      customerName: 'Ghost',
      previousStage: 'NEW_LEAD',
      newStage: 'WON',
    });

    expect(queueFallback.addOrExecute).not.toHaveBeenCalled();
  });
});
