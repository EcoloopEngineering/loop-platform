import { QueueFallbackService } from './queue-fallback.service';

describe('QueueFallbackService', () => {
  describe('when queue IS available', () => {
    let service: QueueFallbackService;
    let mockQueue: { add: jest.Mock };

    beforeEach(() => {
      service = new QueueFallbackService(true);
      mockQueue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };
    });

    it('should delegate to BullMQ queue.add', async () => {
      const data = { to: 'test@example.com', subject: 'Hi', html: '<p>Hi</p>' };
      const opts = { attempts: 5 };

      const processorFn = jest.fn();

      await service.addOrExecute(mockQueue, 'send', data, opts, processorFn);

      expect(mockQueue.add).toHaveBeenCalledWith('send', data, opts);
      expect(processorFn).not.toHaveBeenCalled();
    });

    it('should report queue as available', () => {
      expect(service.isQueueAvailable()).toBe(true);
    });
  });

  describe('when queue is NOT available', () => {
    let service: QueueFallbackService;

    beforeEach(() => {
      service = new QueueFallbackService(false);
    });

    it('should execute processor function synchronously', async () => {
      const data = { to: 'test@example.com', subject: 'Hi', html: '<p>Hi</p>' };
      const processorFn = jest.fn().mockResolvedValue(undefined);

      await service.addOrExecute(null, 'send', data, undefined, processorFn);

      expect(processorFn).toHaveBeenCalledWith(data);
    });

    it('should catch and log errors without throwing', async () => {
      const data = { to: 'fail@example.com' };
      const processorFn = jest.fn().mockRejectedValue(new Error('SMTP fail'));

      await expect(
        service.addOrExecute(null, 'send', data, undefined, processorFn),
      ).resolves.toBeUndefined();

      expect(processorFn).toHaveBeenCalledWith(data);
    });

    it('should report queue as unavailable', () => {
      expect(service.isQueueAvailable()).toBe(false);
    });

    it('should execute fallback even when queue object is provided but queueAvailable is false', async () => {
      const mockQueue = { add: jest.fn() };
      const data = { key: 'value' };
      const processorFn = jest.fn().mockResolvedValue(undefined);

      await service.addOrExecute(mockQueue, 'job', data, undefined, processorFn);

      expect(mockQueue.add).not.toHaveBeenCalled();
      expect(processorFn).toHaveBeenCalledWith(data);
    });
  });
});
