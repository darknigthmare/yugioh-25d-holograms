import assert from 'node:assert/strict';
import test from 'node:test';
import { TCGMatchClock } from '../src/ui/TCGMatchClock.js';

test('Swiss time keeps running through siding and missed background ticks', () => {
  let wall = 1_000_000, mono = 0;
  const clock = new TCGMatchClock({ wallNow: () => wall, monotonicNow: () => mono });
  assert.equal(clock.label(), '50:00');
  wall += 2_999_999; mono += 2_999_999;
  assert.equal(clock.label(), '00:01');
  assert.equal(clock.expired, false);
  wall += 1; mono += 1;
  assert.equal(clock.expired, true);
  assert.equal(clock.label(), '00:00');
});

test('a between-Duel reload consumes elapsed round time without giving a new 50 minutes', () => {
  let wall = 1_000_000, mono = 0;
  const options = { wallNow: () => wall, monotonicNow: () => mono };
  const clock = new TCGMatchClock(options);
  wall += 20 * 60_000; mono += 20 * 60_000;
  const saved = clock.serialize();
  wall += 5 * 60_000;
  assert.equal(new TCGMatchClock({ ...options, snapshot: saved }).label(), '25:00');
  wall += 25 * 60_000;
  assert.equal(new TCGMatchClock({ ...options, snapshot: saved }).expired, true);
});

test('backward system time does not restore elapsed time and invalid saves are rejected', () => {
  let wall = 1_000_000, mono = 0;
  const clock = new TCGMatchClock({ wallNow: () => wall, monotonicNow: () => mono });
  wall += 60_000; mono += 60_000;
  assert.equal(clock.label(), '49:00');
  wall -= 120_000; mono += 60_000;
  assert.equal(clock.label(), '48:00');
  assert.throws(() => new TCGMatchClock({ snapshot: { version: 1, deadlineEpochMs: Infinity } }), TypeError);
  assert.throws(() => new TCGMatchClock({ wallNow: () => 0,
    snapshot: { version: 1, deadlineEpochMs: 3_000_001 } }), RangeError);
});

test('a suspended wall clock still expires on monotonic elapsed time at the exact boundary', () => {
  let mono = 0;
  const clock = new TCGMatchClock({ wallNow: () => 1_000_000, monotonicNow: () => mono });
  mono = 50 * 60_000 - 1;
  assert.equal(clock.label(), '00:01');
  assert.equal(clock.expired, false);
  mono += 1;
  assert.equal(clock.expired, true);
  assert.equal(clock.remainingMs(), 0);
});

test('a forward system jump cannot be undone by rollback or a between-Duel reload', () => {
  let wall = 1_000_000, mono = 0;
  const options = { wallNow: () => wall, monotonicNow: () => mono };
  const clock = new TCGMatchClock(options);
  wall += 20 * 60_000; mono += 60_000;
  assert.equal(clock.label(), '30:00');
  wall -= 20 * 60_000;
  assert.equal(clock.label(), '30:00');
  const snapshot = clock.serialize();
  assert.equal(snapshot.deadlineEpochMs, wall + 30 * 60_000);
  assert.equal(new TCGMatchClock({ ...options, snapshot }).label(), '30:00');
  mono += 30 * 60_000;
  assert.equal(clock.expired, true);
});

test('an expired saved round remains expired and cannot regain time after rollback', () => {
  let wall = 1_000_000, mono = 0;
  const options = { wallNow: () => wall, monotonicNow: () => mono };
  const clock = new TCGMatchClock({ ...options, snapshot: { version: 1, deadlineEpochMs: wall - 1 } });
  assert.equal(clock.expired, true);
  wall -= 60_000;
  const saved = clock.serialize();
  assert.ok(saved.deadlineEpochMs <= wall);
  assert.equal(new TCGMatchClock({ ...options, snapshot: saved }).expired, true);
});
