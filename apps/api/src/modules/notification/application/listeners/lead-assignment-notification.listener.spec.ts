import { Test } from '@nestjs/testing';
import { LeadAssignmentNotificationListener } from './lead-assignment-notification.listener';
import { NotificationService } from '../services/notification.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('LeadAssignmentNotificationListener', () => {
  let listener: LeadAssignmentNotificationListener;
  let notificationService: { create: jest.Mock };
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    notificationService = { create: jest.fn().mockResolvedValue({}) };

    const module = await Test.createTestingModule({
      providers: [
        LeadAssignmentNotificationListener,
        { provide: NotificationService, useValue: notificationService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    listener = module.get(LeadAssignmentNotificationListener);
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
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

  it('should skip lead.assigned when notification is disabled', async () => {
    prisma.appSetting.findUnique.mockResolvedValue({
      key: 'notifications',
      value: { lead_assigned: false },
    });

    await listener.handleLeadAssigned({
      leadId: 'l1',
      assigneeId: 'u5',
      customerName: 'Bob',
      assignedByName: 'Admin',
      isPrimary: false,
    });

    expect(notificationService.create).not.toHaveBeenCalled();
  });

  it('should notify PM and stakeholders on lead.pmAssigned', async () => {
    prisma.lead.findUnique.mockResolvedValue({
      createdById: 'u1',
      projectManagerId: 'pm1',
      assignments: [{ userId: 'u2' }],
    });

    await listener.handleLeadPMAssigned({
      leadId: 'l1',
      pmId: 'pm1',
      pmName: 'Alice PM',
      customerName: 'Bob',
      assignedByName: 'Admin',
    });

    // 1 for PM + 2 stakeholders (u1, u2) — pm1 excluded from stakeholders
    expect(notificationService.create).toHaveBeenCalledTimes(3);
    expect(notificationService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'pm1',
        event: 'LEAD_PM_ASSIGNED',
        title: 'You were assigned as Project Manager',
      }),
    );
  });

  it('should notify PM on lead.pmRemoved', async () => {
    await listener.handleLeadPMRemoved({
      leadId: 'l1',
      pmId: 'pm1',
      customerName: 'Bob',
      removedByName: 'Admin',
    });

    expect(notificationService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'pm1',
        event: 'LEAD_PM_REMOVED',
      }),
    );
  });

  it('should notify stakeholders on lead.updated', async () => {
    prisma.lead.findUnique.mockResolvedValue({
      createdById: 'u1',
      projectManagerId: null,
      assignments: [{ userId: 'u2' }],
    });

    await listener.handleLeadUpdated({
      leadId: 'l1',
      customerName: 'Bob',
      updatedByName: 'Admin',
      changes: 'kW updated',
    });

    expect(notificationService.create).toHaveBeenCalledTimes(2);
  });

  it('should notify stakeholders on lead.noteAdded', async () => {
    prisma.lead.findUnique.mockResolvedValue({
      createdById: 'u1',
      projectManagerId: null,
      assignments: [],
    });

    await listener.handleLeadNoteAdded({
      leadId: 'l1',
      customerName: 'Bob',
      addedByName: 'Admin',
      notePreview: 'Called customer',
    });

    expect(notificationService.create).toHaveBeenCalledTimes(1);
    expect(notificationService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'LEAD_NOTE_ADDED',
        message: expect.stringContaining('Called customer'),
      }),
    );
  });
});
