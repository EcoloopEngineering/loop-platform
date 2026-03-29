import { Test } from '@nestjs/testing';
import { LeadCreatedNotificationListener } from './lead-created-notification.listener';
import { NotificationService } from '../services/notification.service';
import { NOTIFICATION_REPOSITORY } from '../ports/notification.repository.port';

describe('LeadCreatedNotificationListener', () => {
  let listener: LeadCreatedNotificationListener;
  let notificationService: { create: jest.Mock };
  let repo: Record<string, jest.Mock>;

  beforeEach(async () => {
    repo = {
      findNotificationSetting: jest.fn().mockResolvedValue(null),
      findLeadStakeholderIds: jest.fn(),
      create: jest.fn(),
      markRead: jest.fn(),
      markAllRead: jest.fn(),
      findByUser: jest.fn(),
      countByUser: jest.fn(),
      countUnread: jest.fn(),
      findDeviceToken: jest.fn(),
      findLeadWithStakeholders: jest.fn(),
      findLeadMetadata: jest.fn(),
      findLeadWithPrimaryAssignment: jest.fn(),
      updateLeadMetadata: jest.fn(),
    };
    notificationService = { create: jest.fn().mockResolvedValue({}) };

    const module = await Test.createTestingModule({
      providers: [
        LeadCreatedNotificationListener,
        { provide: NotificationService, useValue: notificationService },
        { provide: NOTIFICATION_REPOSITORY, useValue: repo },
      ],
    }).compile();

    listener = module.get(LeadCreatedNotificationListener);
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
  });

  it('should create notification on lead.created', async () => {
    await listener.handleLeadCreated({
      leadId: 'l1',
      assignedTo: 'u1',
      customerName: 'John Doe',
    });

    expect(notificationService.create).toHaveBeenCalledWith({
      userId: 'u1',
      event: 'LEAD_CREATED',
      title: 'New Lead Assigned',
      message: expect.stringContaining('John Doe'),
      data: { leadId: 'l1' },
    });
  });

  it('should skip when lead_assigned notification is disabled', async () => {
    repo.findNotificationSetting.mockResolvedValue({ lead_assigned: false });

    await listener.handleLeadCreated({
      leadId: 'l1',
      assignedTo: 'u1',
      customerName: 'John Doe',
    });

    expect(notificationService.create).not.toHaveBeenCalled();
  });
});
