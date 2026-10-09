/** Swiss Match clock: siding, background tabs and reloads consume round time.
 * The clock triggers the separate Match policy; it never invents a core WIN. */
export class TCGMatchClock {
  constructor({ snapshot = null, wallNow = Date.now,
    monotonicNow = () => performance.now() } = {}) {
    this.wallNow = wallNow;
    this.monotonicNow = monotonicNow;
    const now = wallNow();
    if (!Number.isFinite(now)) throw new TypeError('Invalid wall clock.');
    if (snapshot && (snapshot.version !== 1 || !Number.isFinite(snapshot.deadlineEpochMs))) {
      throw new TypeError('Invalid saved Swiss Match clock.');
    }
    this.durationMs = 50 * 60 * 1000;
    this.deadlineEpochMs = snapshot?.deadlineEpochMs ?? now + this.durationMs;
    if (this.deadlineEpochMs > now + this.durationMs) throw new RangeError('Saved round exceeds 50 minutes.');
    this.initialRemainingMs = Math.max(0, Math.min(this.durationMs, this.deadlineEpochMs - now));
    this.monotonicStart = monotonicNow();
    this.lastMonotonicMeasurement = this.monotonicStart;
    this.previousRemainingMs = this.initialRemainingMs;
  }

  remainingMs() {
    const measurement = this.monotonicNow();
    const elapsed = Math.max(0, measurement - this.lastMonotonicMeasurement);
    this.lastMonotonicMeasurement = Math.max(this.lastMonotonicMeasurement, measurement);
    this.previousRemainingMs = Math.max(0, Math.min(this.previousRemainingMs,
      this.previousRemainingMs - elapsed, this.deadlineEpochMs - this.wallNow()));
    return this.previousRemainingMs;
  }

  get expired() { return this.remainingMs() === 0; }

  label() {
    const seconds = Math.ceil(this.remainingMs() / 1000);
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }

  serialize() {
    return { version: 1, deadlineEpochMs: Math.min(this.deadlineEpochMs,
      this.wallNow() + this.remainingMs()) };
  }
}
