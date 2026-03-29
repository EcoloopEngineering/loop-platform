import { Test, TestingModule } from '@nestjs/testing';
import { PrismaNotificationRepository } from './prisma-notification.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('PrismaNotificationRepository', () => {
  let repository: PrismaNotificationRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaNotificationRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<PrismaNotificationRepository>(PrismaNotificationRepository);
  });

  describe('create', () => {
    it('should create a notification', async () => {
      const data = {
        userId: 'user-1',
        event: 'lead.created',
        title: 'New Lead',
        message: 'A new lead was created',
        isRead: false,
      };
      const created = { id: 'notif-1', ...data };
      prisma.notification.create.mockResolvedValue(created);

      const result = await repository.create(data);

      expect(result).toEqual(created);
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          event: 'lead.created',
          isRead: false,
        }),
      });
    });
  });

  describe('markRead', () => {
    it('should mark a notification as read', async () => {
      prisma.notification.update.mockResolvedValue({ id: 'notif-1', isRead: true });

      const result = await repository.markRead('notif-1');

      expect(result.isRead).toBe(true);
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { isRead: true, readAt: expect.any(Date) },
      });
    });
  });

  describe('markAllRead', () => {
    it('should mark all unread notifications as read for a user', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 5 });

      await repository.markAllRead('user-1');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
        data: { isRead: true, readAt: expect.any(Date) },
      });
    });
  });

  describe('findByUser', () => {
    it('should return paginated notifications for a user', async () => {
      const notifications = [{ id: 'n1' }, { id: 'n2' }];
      prisma.notification.findMany.mockResolvedValue(notifications);

      const result = await repository.findByUser('user-1', 0, 20);

      expect(result).toEqual(notifications);
      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });
  });

  describe('countByUser', () => {
    it('should count all notifications for a user', async () => {
      prisma.notification.count.mockResolvedValue(10);

      const result = await repository.countByUser('user-1');

      expect(result).toBe(10);
      expect(prisma.notification.count).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    });
  });

  describe('countUnread', () => {
    it('should count unread notifications', async () => {
      prisma.notification.count.mockResolvedValue(3);

      const result = await repository.countUnread('user-1');

      expect(result).toBe(3);
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
      });
    });
  });

  describe('findDeviceToken', () => {
    it('should return device token', async () => {
      prisma.userDevice.findUnique.mockResolvedValue({ token: 'fcm-token-123' });

      const result = await repository.findDeviceToken('user-1');

      expect(result).toEqual({ token: 'fcm-token-123' });
      expect(prisma.userDevice.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        select: { token: true },
      });
    });

    it('should return null when no device registered', async () => {
      prisma.userDevice.findUnique.mockResolvedValue(null);

      const result = await repository.findDeviceToken('user-1');

      expect(result).toBeNull();
    });
  });

  describe('findLeadWithStakeholders', () => {
    it('should return lead with stakeholders', async () => {
      const lead = { id: 'lead-1', customer: {}, assignments: [], projectManager: {} };
      prisma.lead.findUnique.mockResolvedValue(lead);

      const result = await repository.findLeadWithStakeholders('lead-1');

      expect(result).toEqual(lead);
      expect(prisma.lead.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lead-1' },
          include: expect.objectContaining({
            customer: true,
            assignments: expect.any(Object),
            projectManager: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe('findLeadMetadata', () => {
    it('should return lead metadata', async () => {
      prisma.lead.findUnique.mockResolvedValue({ metadata: { key: 'val' } });

      const result = await repository.findLeadMetadata('lead-1');

      expect(result).toEqual({ metadata: { key: 'val' } });
      expect(prisma.lead.findUnique).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        select: { metadata: true },
      });
    });
  });

  describe('findLeadWithPrimaryAssignment', () => {
    it('should return lead with primary assignment', async () => {
      const lead = { id: 'lead-1', assignments: [{ isPrimary: true, user: { firstName: 'John', lastName: 'Doe' } }] };
      prisma.lead.findUnique.mockResolvedValue(lead);

      const result = await repository.findLeadWithPrimaryAssignment('lead-1');

      expect(result).toEqual(lead);
    });
  });

  describe('updateLeadMetadata', () => {
    it('should update lead metadata', async () => {
      prisma.lead.update.mockResolvedValue({ id: 'lead-1' });

      await repository.updateLeadMetadata('lead-1', { key: 'value' });

      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        data: { metadata: { key: 'value' } },
      });
    });
  });

  describe('findNotificationSetting', () => {
    it('should return notification settings', async () => {
      prisma.appSetting.findUnique.mockResolvedValue({ value: { email: true, push: false } });

      const result = await repository.findNotificationSetting();

      expect(result).toEqual({ email: true, push: false });
      expect(prisma.appSetting.findUnique).toHaveBeenCalledWith({
        where: { key: 'notifications' },
      });
    });

    it('should return null when setting not found', async () => {
      prisma.appSetting.findUnique.mockResolvedValue(null);

      const result = await repository.findNotificationSetting();

      expect(result).toBeNull();
    });
  });
});
