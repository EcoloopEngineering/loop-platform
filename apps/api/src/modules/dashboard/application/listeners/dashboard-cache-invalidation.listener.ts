import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CacheService } from '../../../../infrastructure/cache/cache.service';

/**
 * Invalidates dashboard and leaderboard caches when relevant events occur.
 * This ensures users see fresh data after lead stage changes.
 */
@Injectable()
export class DashboardCacheInvalidationListener {
  private readonly logger = new Logger(DashboardCacheInvalidationListener.name);

  constructor(private readonly cache: CacheService) {}

  @OnEvent('lead.stageChanged')
  handleStageChanged(): void {
    this.cache.invalidateByPrefix('dashboard:');
    this.cache.invalidateByPrefix('leaderboard:');
    this.logger.debug('Dashboard and leaderboard caches invalidated after stage change');
  }

  @OnEvent('lead.created')
  handleLeadCreated(): void {
    this.cache.invalidateByPrefix('dashboard:');
    this.logger.debug('Dashboard cache invalidated after lead creation');
  }
}
