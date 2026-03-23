import { Test } from '@nestjs/testing';
import { LeadEventListener } from './lead-event.listener';
import { NotificationService } from '../services/notification.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('LeadEventListener', () => {
  let listener: LeadEventListener;
  let notificationService: { create: jest.Mock };
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    notificationService = { create: jest.fn().mockResolvedValue({}) };

    const module = await Test.createTestingModule({
      providers: [
        LeadEventListener,
        { provide: NotificationService, useValue: notificationService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    listener = module.get(LeadEventListener);
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

  it('should notify assignee on lead.assigned', async () => {
    await listener.handleLeadAssigned({
      leadId: 'l1',
      assigneeId: 'u5',
      customerName: 'Bob',
      assignedByName: 'Admin',
      isPrimary: true,
    });

    expect(notificationService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u5',
        event: 'LEAD_ASSIGNED',
        message: expect.stringContaining('primary owner'),
      }),
    );
  });
});
