/**
 * Fixed-capacity ring buffer. `push` is O(1) and allocates nothing once warm,
 * so appending at high rates (hundreds/sec) doesn't churn the GC. `toArray`
 * (oldest→newest) is the only O(n) op and is meant to be called rarely — on the
 * throttled UI flush, not per push.
 *
 * Replaces the per-request `[...arr, x]` + `.shift()` spread-copy, which
 * allocated and copied the whole (up to ~2000-element) array on every append.
 */
export class RingBuffer<T> {
  private readonly cap: number
  private buf: T[]
  private start = 0
  private count = 0

  constructor(cap: number) {
    if (cap < 1) throw new Error('RingBuffer capacity must be >= 1')
    this.cap = cap
    this.buf = new Array<T>(cap)
  }

  /** Append an item, overwriting the oldest once at capacity. */
  push(item: T): void {
    if (this.count < this.cap) {
      this.buf[(this.start + this.count) % this.cap] = item
      this.count++
    } else {
      this.buf[this.start] = item
      this.start = (this.start + 1) % this.cap
    }
  }

  /** Number of items currently held (never exceeds capacity). */
  get length(): number {
    return this.count
  }

  /** Snapshot of the contents, oldest first. Allocates a fresh array. */
  toArray(): T[] {
    const out = new Array<T>(this.count)
    for (let i = 0; i < this.count; i++) {
      out[i] = this.buf[(this.start + i) % this.cap]
    }
    return out
  }

  /** Drop all items without reallocating the backing store. */
  clear(): void {
    this.start = 0
    this.count = 0
  }
}
