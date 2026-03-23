import { Test } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('NotificationService', () => {
  let service: NotificationService;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    // Ensure sendPush doesn't fail — mock userDevice lookup
    prisma.userDevice.findUnique.mockResolvedValue(null);

    const module = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(NotificationService);
  });

  it('should create a notification', async () => {
    const notif = { id: 'n1', userId: 'u1', event: 'TEST', title: 'T', message: 'M', isRead: false };
    prisma.notification.create.mockResolvedValue(notif);

    const result = await service.create({
      userId: 'u1',
      event: 'TEST',
      title: 'T',
      message: 'M',
    });

    expect(result).toEqual(notif);
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 'u1', isRead: false }),
    });
  });

  it('should mark a notification as read', async () => {
    prisma.notification.update.mockResolvedValue({ id: 'n1', isRead: true });

    await service.markRead('n1');

    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'n1' },
      data: expect.objectContaining({ isRead: true }),
    });
  });

  it('should mark all notifications as read for a user', async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 3 });

    await service.markAllRead('u1');

    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', isRead: false },
      data: expect.objectContaining({ isRead: true }),
    });
  });

  it('should get notifications by user with pagination', async () => {
    prisma.notification.findMany.mockResolvedValue([]);
    prisma.notification.count.mockResolvedValueOnce(5).mockResolvedValueOnce(2);

    const result = await service.getByUser('u1', 0, 10);

    expect(result).toEqual({ data: [], total: 5, unread: 2 });
  });

  it('should get unread count', async () => {
    prisma.notification.count.mockResolvedValue(7);

    const result = await service.getUnreadCount('u1');

    expect(result).toEqual({ count: 7 });
    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: { userId: 'u1', isRead: false },
    });
  });
});
