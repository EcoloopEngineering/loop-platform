export class TtlCache<T> {
  private data: T | undefined;
  private expiry = 0;

  constructor(private readonly ttlMs: number) {}

  get(): T | undefined {
    if (Date.now() > this.expiry) {
      this.data = undefined;
      return undefined;
    }
    return this.data;
  }

  set(value: T): void {
    this.data = value;
    this.expiry = Date.now() + this.ttlMs;
  }

  invalidate(): void {
    this.data = undefined;
    this.expiry = 0;
  }
}
