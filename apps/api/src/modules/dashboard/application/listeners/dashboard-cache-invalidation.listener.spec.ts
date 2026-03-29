import { DashboardCacheInvalidationListener } from './dashboard-cache-invalidation.listener';
import { CacheService } from '../../../../infrastructure/cache/cache.service';

describe('DashboardCacheInvalidationListener', () => {
  let listener: DashboardCacheInvalidationListener;
  let cache: CacheService;

  beforeEach(() => {
    cache = new CacheService();
    listener = new DashboardCacheInvalidationListener(cache);
  });

  describe('handleStageChanged', () => {
    it('should invalidate dashboard and leaderboard caches', () => {
      cache.set('dashboard:metrics:2026-01-01:2026-03-31', { data: 1 }, 60000);
      cache.set('leaderboard:weekly', [{ userId: 'u1' }], 120000);
      cache.set('other:key', 'keep', 60000);

      listener.handleStageChanged();

      expect(cache.get('dashboard:metrics:2026-01-01:2026-03-31')).toBeUndefined();
      expect(cache.get('leaderboard:weekly')).toBeUndefined();
      expect(cache.get('other:key')).toBe('keep');
    });
  });

  describe('handleLeadCreated', () => {
    it('should invalidate only dashboard caches', () => {
      cache.set('dashboard:metrics:2026-01-01:2026-03-31', { data: 1 }, 60000);
      cache.set('leaderboard:weekly', [{ userId: 'u1' }], 120000);

      listener.handleLeadCreated();

      expect(cache.get('dashboard:metrics:2026-01-01:2026-03-31')).toBeUndefined();
      // Leaderboard should remain since lead creation doesn't affect points
      expect(cache.get('leaderboard:weekly')).toEqual([{ userId: 'u1' }]);
    });
  });
});
