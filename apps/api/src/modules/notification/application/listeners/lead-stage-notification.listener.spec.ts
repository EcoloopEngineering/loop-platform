import { Test } from '@nestjs/testing';
import { LeadStageNotificationListener } from './lead-stage-notification.listener';
import { NotificationService } from '../services/notification.service';
import { NOTIFICATION_REPOSITORY } from '../ports/notification.repository.port';

describe('LeadStageNotificationListener', () => {
  let listener: LeadStageNotificationListener;
  let notificationService: { create: jest.Mock };
  let repo: Record<string, jest.Mock>;

  beforeEach(async () => {
    repo = {
      findNotificationSetting: jest.fn().mockResolvedValue(null),
      findLeadStakeholderIds: jest.fn().mockResolvedValue([]),
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
        LeadStageNotificationListener,
        { provide: NotificationService, useValue: notificationService },
        { provide: NOTIFICATION_REPOSITORY, useValue: repo },
      ],
    }).compile();

    listener = module.get(LeadStageNotificationListener);
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
  });

  it('should notify all stakeholders on stage change', async () => {
    repo.findLeadStakeholderIds.mockResolvedValue(['u1', 'u2', 'u3']);

    await listener.handleLeadStageChanged({
      leadId: 'l1',
      customerName: 'Jane',
      previousStage: 'NEW_LEAD',
      newStage: 'DESIGN_READY',
    });

    // Should notify u1, u2, u3
    expect(notificationService.create).toHaveBeenCalledTimes(3);
  });

  it('should skip when stage_changes notification is disabled', async () => {
    repo.findNotificationSetting.mockResolvedValue({ stage_changes: false });

    await listener.handleLeadStageChanged({
      leadId: 'l1',
      customerName: 'Jane',
      previousStage: 'NEW_LEAD',
      newStage: 'DESIGN_READY',
    });

    expect(notificationService.create).not.toHaveBeenCalled();
  });

  it('should handle lead with no stakeholders', async () => {
    repo.findLeadStakeholderIds.mockResolvedValue([]);

    await listener.handleLeadStageChanged({
      leadId: 'l1',
      customerName: 'Jane',
      previousStage: 'NEW_LEAD',
      newStage: 'DESIGN_READY',
    });

    expect(notificationService.create).not.toHaveBeenCalled();
  });
});
