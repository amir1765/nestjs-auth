export class TokenBucket {
  constructor(
    public capacity: number,
    public refillPerMs: number,
    public tokens: number,
    public lastRefill: number,
  ) {}

  consume(now: number, cost = 1): boolean {
    this.refill(now);

    if (this.tokens < cost) return false;

    this.tokens -= cost;
    return true;
  }

  private refill(now: number) {
    const delta = now - this.lastRefill;
    const refill = delta * this.refillPerMs;

    if (refill > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + refill);
      this.lastRefill = now;
    }
  }

  serialize() {
    return {
      capacity: this.capacity,
      refillPerMs: this.refillPerMs,
      tokens: this.tokens,
      lastRefill: this.lastRefill,
    };
  }

  static from(obj: any) {
    return new TokenBucket(
      obj.capacity,
      obj.refillPerMs,
      obj.tokens,
      obj.lastRefill,
    );
  }
}