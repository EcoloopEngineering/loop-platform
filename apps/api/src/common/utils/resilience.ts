import { Logger } from '@nestjs/common';

// ── Retry ───────────────────────────────────────────────────────────────────

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  /** Label used in log messages (e.g. URL or integration name) */
  label?: string;
}

const RETRY_DEFAULTS = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10_000,
  backoffMultiplier: 2,
  label: '',
};

/**
 * Execute `fn` with exponential-backoff retry and jitter.
 * Throws the last error after all attempts are exhausted.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
  logger?: Logger,
): Promise<T> {
  const opts = { ...RETRY_DEFAULTS, ...options };
  const label = (options as RetryOptions | undefined)?.label;
  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    const start = Date.now();

    if (label) {
      logger?.log(
        `[Integration] Calling ${label} (attempt ${attempt}/${opts.maxAttempts})`,
      );
    }

    try {
      const result = await fn();
      if (label) {
        const duration = Date.now() - start;
        logger?.log(`[Integration] ${label} → success (${duration}ms)`);
      }
      return result;
    } catch (error) {
      lastError = error;
      const duration = Date.now() - start;
      const message = error instanceof Error ? error.message : String(error);

      if (label) {
        logger?.warn(
          `[Integration] ${label} FAILED → ${message} (${duration}ms)`,
        );
      }

      if (attempt === opts.maxAttempts) break;

      const baseDelay = Math.min(
        opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelayMs,
      );
      // Add jitter: 50-100% of base delay
      const jitter = baseDelay * (0.5 + Math.random() * 0.5);
      const delay = Math.round(jitter);

      logger?.warn(
        `Retry attempt ${attempt}/${opts.maxAttempts} failed: ${message}. Retrying in ${delay}ms`,
      );

      await sleep(delay);
    }
  }

  throw lastError;
}

// ── Circuit Breaker ─────────────────────────────────────────────────────────

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeMs?: number;
  name?: string;
}

const BREAKER_DEFAULTS: Required<Omit<CircuitBreakerOptions, 'name'>> & { name: string } = {
  failureThreshold: 5,
  resetTimeMs: 30_000,
  name: 'default',
};

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly opts: Required<Omit<CircuitBreakerOptions, 'name'>> & { name: string };
  private readonly logger = new Logger(CircuitBreaker.name);

  constructor(options?: CircuitBreakerOptions) {
    this.opts = { ...BREAKER_DEFAULTS, ...options };
  }

  getState(): CircuitState {
    return this.state;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime >= this.opts.resetTimeMs) {
        this.state = CircuitState.HALF_OPEN;
        this.logger.log(`Circuit breaker [${this.opts.name}] transitioning to HALF_OPEN`);
      } else {
        throw new Error(
          `Circuit breaker [${this.opts.name}] is OPEN — call rejected`,
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.logger.log(`Circuit breaker [${this.opts.name}] recovered — CLOSED`);
    }
    this.failureCount = 0;
    this.state = CircuitState.CLOSED;
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (
      this.failureCount >= this.opts.failureThreshold &&
      this.state !== CircuitState.OPEN
    ) {
      this.state = CircuitState.OPEN;
      this.logger.warn(
        `Circuit breaker [${this.opts.name}] tripped — OPEN after ${this.failureCount} failures`,
      );
    }
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
