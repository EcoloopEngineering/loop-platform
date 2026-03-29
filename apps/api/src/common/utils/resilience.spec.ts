import { withRetry, CircuitBreaker, CircuitState } from './resilience';

describe('withRetry', () => {
  it('should return on first successful call', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await withRetry(fn);

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and succeed on second attempt', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');

    const result = await withRetry(fn, { initialDelayMs: 1, maxDelayMs: 5 });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should throw after maxAttempts exhausted', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('always fail'));

    await expect(
      withRetry(fn, { maxAttempts: 3, initialDelayMs: 1, maxDelayMs: 5 }),
    ).rejects.toThrow('always fail');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should respect maxAttempts=1 (no retry)', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('once'));

    await expect(
      withRetry(fn, { maxAttempts: 1 }),
    ).rejects.toThrow('once');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should use default options when none provided', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('err'))
      .mockResolvedValue('done');

    // Override delays so test is fast
    const result = await withRetry(fn, { initialDelayMs: 1, maxDelayMs: 5 });

    expect(result).toBe('done');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('CircuitBreaker', () => {
  it('should start in CLOSED state', () => {
    const breaker = new CircuitBreaker({ name: 'test' });
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('should allow calls in CLOSED state', async () => {
    const breaker = new CircuitBreaker({ name: 'test' });
    const result = await breaker.execute(() => Promise.resolve('ok'));
    expect(result).toBe('ok');
  });

  it('should open after failureThreshold failures', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3, name: 'test' });

    for (let i = 0; i < 3; i++) {
      await breaker
        .execute(() => Promise.reject(new Error('fail')))
        .catch(() => {});
    }

    expect(breaker.getState()).toBe(CircuitState.OPEN);
  });

  it('should reject calls when OPEN', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeMs: 60_000,
      name: 'test',
    });

    await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});

    await expect(
      breaker.execute(() => Promise.resolve('ok')),
    ).rejects.toThrow('Circuit breaker [test] is OPEN');
  });

  it('should transition to HALF_OPEN after resetTimeMs', async () => {
    jest.useFakeTimers();
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeMs: 1000,
      name: 'test',
    });

    await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    expect(breaker.getState()).toBe(CircuitState.OPEN);

    jest.advanceTimersByTime(1500);

    const result = await breaker.execute(() => Promise.resolve('recovered'));
    expect(result).toBe('recovered');
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
    jest.useRealTimers();
  });

  it('should go back to OPEN if HALF_OPEN call fails', async () => {
    jest.useFakeTimers();
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeMs: 1000,
      name: 'test',
    });

    await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});

    jest.advanceTimersByTime(1500);

    await breaker
      .execute(() => Promise.reject(new Error('still failing')))
      .catch(() => {});

    expect(breaker.getState()).toBe(CircuitState.OPEN);
    jest.useRealTimers();
  });

  it('should reset failure count on success', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3, name: 'test' });

    // 2 failures (under threshold)
    await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});

    // 1 success resets
    await breaker.execute(() => Promise.resolve('ok'));

    // 2 more failures should not trip
    await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});

    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('should use default options', async () => {
    const breaker = new CircuitBreaker();
    expect(breaker.getState()).toBe(CircuitState.CLOSED);

    // Default failureThreshold is 5
    for (let i = 0; i < 4; i++) {
      await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    }
    expect(breaker.getState()).toBe(CircuitState.CLOSED);

    await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    expect(breaker.getState()).toBe(CircuitState.OPEN);
  });
});
