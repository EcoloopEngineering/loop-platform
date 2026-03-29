import { CacheService } from './cache.service';

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    cache = new CacheService();
  });

  describe('get/set', () => {
    it('should return undefined for missing key', () => {
      expect(cache.get('missing')).toBeUndefined();
    });

    it('should store and retrieve a value', () => {
      cache.set('key1', { foo: 'bar' }, 60000);
      expect(cache.get('key1')).toEqual({ foo: 'bar' });
    });

    it('should return undefined for expired entries', () => {
      jest.useFakeTimers();
      cache.set('expired', 'value', 1); // 1ms TTL
      jest.advanceTimersByTime(2);
      expect(cache.get('expired')).toBeUndefined();
      jest.useRealTimers();
    });

    it('should overwrite existing values', () => {
      cache.set('key', 'first', 60000);
      cache.set('key', 'second', 60000);
      expect(cache.get('key')).toBe('second');
    });

    it('should handle different data types', () => {
      cache.set('string', 'hello', 60000);
      cache.set('number', 42, 60000);
      cache.set('array', [1, 2, 3], 60000);
      cache.set('null', null, 60000);

      expect(cache.get('string')).toBe('hello');
      expect(cache.get('number')).toBe(42);
      expect(cache.get('array')).toEqual([1, 2, 3]);
      expect(cache.get('null')).toBeNull();
    });
  });

  describe('invalidate', () => {
    it('should remove a specific key', () => {
      cache.set('key1', 'value1', 60000);
      cache.set('key2', 'value2', 60000);

      const result = cache.invalidate('key1');

      expect(result).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
    });

    it('should return false for non-existent key', () => {
      expect(cache.invalidate('nonexistent')).toBe(false);
    });
  });

  describe('invalidateByPrefix', () => {
    it('should invalidate all keys with matching prefix', () => {
      cache.set('dashboard:metrics:2026', 'data1', 60000);
      cache.set('dashboard:metrics:2025', 'data2', 60000);
      cache.set('dashboard:leaderboard', 'data3', 60000);
      cache.set('other:key', 'data4', 60000);

      const count = cache.invalidateByPrefix('dashboard:');

      expect(count).toBe(3);
      expect(cache.get('dashboard:metrics:2026')).toBeUndefined();
      expect(cache.get('dashboard:metrics:2025')).toBeUndefined();
      expect(cache.get('dashboard:leaderboard')).toBeUndefined();
      expect(cache.get('other:key')).toBe('data4');
    });

    it('should return 0 when no keys match prefix', () => {
      cache.set('key', 'value', 60000);
      expect(cache.invalidateByPrefix('nomatch:')).toBe(0);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set('a', 1, 60000);
      cache.set('b', 2, 60000);
      cache.set('c', 3, 60000);

      cache.clear();

      expect(cache.size()).toBe(0);
      expect(cache.get('a')).toBeUndefined();
    });
  });

  describe('size', () => {
    it('should return 0 for empty cache', () => {
      expect(cache.size()).toBe(0);
    });

    it('should return correct count', () => {
      cache.set('a', 1, 60000);
      cache.set('b', 2, 60000);
      expect(cache.size()).toBe(2);
    });

    it('should not count expired entries in stored size (lazy cleanup)', () => {
      cache.set('expired', 'val', 0);
      // Entry still in map but expired - size reflects map size
      expect(cache.size()).toBe(1);
      // Access triggers cleanup
      cache.get('expired');
      expect(cache.size()).toBe(0);
    });
  });

  describe('TTL behavior', () => {
    it('should respect TTL duration', () => {
      jest.useFakeTimers();

      cache.set('ttl-key', 'value', 5000); // 5 seconds

      // Still valid at 4.9s
      jest.advanceTimersByTime(4900);
      expect(cache.get('ttl-key')).toBe('value');

      // Expired at 5.1s
      jest.advanceTimersByTime(200);
      expect(cache.get('ttl-key')).toBeUndefined();

      jest.useRealTimers();
    });
  });
});
