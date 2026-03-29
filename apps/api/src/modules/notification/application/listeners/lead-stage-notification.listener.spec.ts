import { Test } from '@nestjs/testing';
import { LeadStageNotificationListener } from './lead-stage-notification.listener';
import { NotificationService } from '../services/notification.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('LeadStageNotificationListener', () => {
  let listener: LeadStageNotificationListener;
  let notificationService: { create: jest.Mock };
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    notificationService = { create: jest.fn().mockResolvedValue({}) };

    const module = await Test.createTestingModule({
      providers: [
        LeadStageNotificationListener,
        { provide: NotificationService, useValue: notificationService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    listener = module.get(LeadStageNotificationListener);
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
  });

  it('should notify all stakeholders on stage change', async () => {
    prisma.lead.findUnique.mockResolvedValue({
      createdById: 'u1',
      projectManagerId: 'u2',
      assignments: [{ userId: 'u3' }],
    });

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
    prisma.appSetting.findUnique.mockResolvedValue({
      key: 'notifications',
      value: { stage_changes: false },
    });

    await listener.handleLeadStageChanged({
      leadId: 'l1',
      customerName: 'Jane',
      previousStage: 'NEW_LEAD',
      newStage: 'DESIGN_READY',
    });

    expect(notificationService.create).not.toHaveBeenCalled();
  });

  it('should handle lead with no stakeholders', async () => {
    prisma.lead.findUnique.mockResolvedValue(null);

    await listener.handleLeadStageChanged({
      leadId: 'l1',
      customerName: 'Jane',
      previousStage: 'NEW_LEAD',
      newStage: 'DESIGN_READY',
    });

    expect(notificationService.create).not.toHaveBeenCalled();
  });
});
