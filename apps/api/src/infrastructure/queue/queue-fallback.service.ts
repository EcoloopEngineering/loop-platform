import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { QUEUE_AVAILABLE } from './queue.constants';

/**
 * Executes job processor functions synchronously when BullMQ/Redis is unavailable.
 * When Redis IS available, this service delegates to the real BullMQ queue.
 *
 * Usage in listeners:
 *   Instead of directly calling `queue.add(...)`, call
 *   `queueFallback.addOrExecute(queue, name, data, opts, processorFn)`
 */
@Injectable()
export class QueueFallbackService {
  private readonly logger = new Logger(QueueFallbackService.name);

  constructor(
    @Inject(QUEUE_AVAILABLE) private readonly queueAvailable: boolean,
  ) {}

  /**
   * If Redis is available, adds the job to the BullMQ queue.
   * If Redis is unavailable, executes the processor function synchronously.
   *
   * @param queue - The BullMQ Queue instance (may be null if Redis is unavailable)
   * @param jobName - Job name for logging
   * @param data - Job payload data
   * @param opts - BullMQ job options (only used when queue is available)
   * @param processorFn - Function to execute synchronously as fallback
   */
  async addOrExecute<T>(
    queue: { add: (name: string, data: T, opts?: any) => Promise<any> } | null,
    jobName: string,
    data: T,
    opts: Record<string, any> | undefined,
    processorFn: (data: T) => Promise<void>,
  ): Promise<void> {
    if (this.queueAvailable && queue) {
      await queue.add(jobName, data, opts);
      return;
    }

    // Synchronous fallback — execute inline
    this.logger.log(`[Fallback] Executing job "${jobName}" synchronously`);
    try {
      await processorFn(data);
      this.logger.log(`[Fallback] Job "${jobName}" completed successfully`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`[Fallback] Job "${jobName}" failed: ${message}`);
      // Don't re-throw — in fallback mode we log and continue
      // (BullMQ would retry, but sync fallback is best-effort)
    }
  }

  isQueueAvailable(): boolean {
    return this.queueAvailable;
  }
}
