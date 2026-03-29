import { Test } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { NOTIFICATION_REPOSITORY } from '../ports/notification.repository.port';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockRepo = {
      create: jest.fn(),
      markRead: jest.fn(),
      markAllRead: jest.fn(),
      findByUser: jest.fn(),
      countByUser: jest.fn(),
      countUnread: jest.fn(),
      findDeviceToken: jest.fn().mockResolvedValue(null),
    };

    const module = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: NOTIFICATION_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    service = module.get(NotificationService);
  });

  it('should create a notification', async () => {
    const notif = { id: 'n1', userId: 'u1', event: 'TEST', title: 'T', message: 'M', isRead: false };
    mockRepo.create.mockResolvedValue(notif);

    const result = await service.create({
      userId: 'u1',
      event: 'TEST',
      title: 'T',
      message: 'M',
    });

    expect(result).toEqual(notif);
    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', isRead: false }),
    );
  });

  it('should mark a notification as read', async () => {
    mockRepo.markRead.mockResolvedValue({ id: 'n1', isRead: true });

    await service.markRead('n1');

    expect(mockRepo.markRead).toHaveBeenCalledWith('n1');
  });

  it('should mark all notifications as read for a user', async () => {
    mockRepo.markAllRead.mockResolvedValue({ count: 3 });

    await service.markAllRead('u1');

    expect(mockRepo.markAllRead).toHaveBeenCalledWith('u1');
  });

  it('should get notifications by user with pagination', async () => {
    mockRepo.findByUser.mockResolvedValue([]);
    mockRepo.countByUser.mockResolvedValue(5);
    mockRepo.countUnread.mockResolvedValue(2);

    const result = await service.getByUser('u1', 0, 10);

    expect(result).toEqual({ data: [], total: 5, unread: 2 });
  });

  it('should get unread count', async () => {
    mockRepo.countUnread.mockResolvedValue(7);

    const result = await service.getUnreadCount('u1');

    expect(result).toEqual({ count: 7 });
    expect(mockRepo.countUnread).toHaveBeenCalledWith('u1');
  });
});
