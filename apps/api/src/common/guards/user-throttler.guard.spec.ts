import { UserThrottlerGuard } from './user-throttler.guard';

describe('UserThrottlerGuard', () => {
  let guard: UserThrottlerGuard;

  beforeEach(() => {
    // Create instance without full DI — we only test the getTracker override
    guard = new (UserThrottlerGuard as any)();
  });

  describe('getTracker', () => {
    it('should return user ID when user is authenticated', async () => {
      const req = { user: { id: 'user-uuid-123' }, ip: '192.168.1.1' };
      const result = await (guard as any).getTracker(req);
      expect(result).toBe('user-uuid-123');
    });

    it('should fall back to IP when user is not present', async () => {
      const req = { ip: '10.0.0.1' };
      const result = await (guard as any).getTracker(req);
      expect(result).toBe('10.0.0.1');
    });

    it('should fall back to IP when user has no id', async () => {
      const req = { user: {}, ip: '172.16.0.1' };
      const result = await (guard as any).getTracker(req);
      expect(result).toBe('172.16.0.1');
    });

    it('should return undefined when neither user nor ip exists', async () => {
      const req = {};
      const result = await (guard as any).getTracker(req);
      expect(result).toBeUndefined();
    });
  });
});
