import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry<T = any> {
  data: T;
  expiresAt: number;
}

/**
 * Simple in-memory cache with TTL support.
 * No external dependencies (no Redis needed).
 *
 * Thread-safe within a single Node.js process.
 * In cluster mode (PM2 -i 2), each worker has its own cache — this is
 * acceptable for dashboard metrics where slight staleness is fine.
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly store = new Map<string, CacheEntry>();

  /**
   * Get a cached value by key. Returns undefined if not found or expired.
   */
  get<T = any>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.data as T;
  }

  /**
   * Set a cached value with TTL in milliseconds.
   */
  set<T = any>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Invalidate a specific cache key.
   */
  invalidate(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix.
   * Useful for invalidating all dashboard caches at once.
   */
  invalidateByPrefix(prefix: string): number {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    if (count > 0) {
      this.logger.debug(`Invalidated ${count} cache entries with prefix "${prefix}"`);
    }
    return count;
  }

  /**
   * Clear the entire cache.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get the number of entries currently in the cache.
   */
  size(): number {
    return this.store.size;
  }
}
