import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Per-user rate limiting guard.
 * Uses the authenticated user's ID as the throttle tracker key,
 * falling back to IP address for unauthenticated requests.
 * This ensures each user gets their own 100 req/min bucket
 * instead of sharing a single global bucket.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.user?.id ?? req.ip;
  }
}
