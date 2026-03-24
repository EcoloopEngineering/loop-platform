import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from './notification.controller';
import { NotificationService } from '../application/services/notification.service';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';

describe('NotificationController', () => {
  let controller: NotificationController;
  let notificationService: Record<string, jest.Mock>;

  beforeEach(async () => {
    notificationService = {
      getByUser: jest.fn(),
      getUnreadCount: jest.fn(),
      markRead: jest.fn(),
      markAllRead: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        { provide: NotificationService, useValue: notificationService },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NotificationController>(NotificationController);
  });

  describe('getNotifications', () => {
    it('should return paginated notifications with defaults', async () => {
      const expected = { data: [{ id: 'n1' }], total: 1, unread: 1 };
      notificationService.getByUser.mockResolvedValue(expected);

      const result = await controller.getNotifications({ id: 'user-1' });

      expect(notificationService.getByUser).toHaveBeenCalledWith('user-1', 0, 20);
      expect(result).toEqual(expected);
    });

    it('should parse skip and take query parameters', async () => {
      notificationService.getByUser.mockResolvedValue({ data: [], total: 0, unread: 0 });

      await controller.getNotifications({ id: 'user-1' }, '10', '5');

      expect(notificationService.getByUser).toHaveBeenCalledWith('user-1', 10, 5);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      notificationService.getUnreadCount.mockResolvedValue({ count: 5 });

      const result = await controller.getUnreadCount({ id: 'user-1' });

      expect(notificationService.getUnreadCount).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ count: 5 });
    });
  });

  describe('markRead', () => {
    it('should mark a single notification as read', async () => {
      notificationService.markRead.mockResolvedValue({ id: 'n1', isRead: true });

      const result = await controller.markRead('n1');

      expect(notificationService.markRead).toHaveBeenCalledWith('n1');
      expect(result).toEqual({ id: 'n1', isRead: true });
    });
  });

  describe('markAllRead', () => {
    it('should mark all notifications as read for user', async () => {
      notificationService.markAllRead.mockResolvedValue({ count: 3 });

      const result = await controller.markAllRead({ id: 'user-1' });

      expect(notificationService.markAllRead).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ count: 3 });
    });
  });
});
