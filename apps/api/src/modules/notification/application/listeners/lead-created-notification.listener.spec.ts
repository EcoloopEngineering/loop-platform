import { Test } from '@nestjs/testing';
import { LeadCreatedNotificationListener } from './lead-created-notification.listener';
import { NotificationService } from '../services/notification.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('LeadCreatedNotificationListener', () => {
  let listener: LeadCreatedNotificationListener;
  let notificationService: { create: jest.Mock };
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    notificationService = { create: jest.fn().mockResolvedValue({}) };

    const module = await Test.createTestingModule({
      providers: [
        LeadCreatedNotificationListener,
        { provide: NotificationService, useValue: notificationService },
        { provide: PrismaService, useValue: prisma },
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
    prisma.appSetting.findUnique.mockResolvedValue({
      key: 'notifications',
      value: { lead_assigned: false },
    });

    await listener.handleLeadCreated({
      leadId: 'l1',
      assignedTo: 'u1',
      customerName: 'John Doe',
    });

    expect(notificationService.create).not.toHaveBeenCalled();
  });
});
