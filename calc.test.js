import { test } from 'node:test';
import assert from 'node:assert/strict';
import { greedyPlates, calculate, formatWeight } from './src/calc.js';

const STANDARD = [1.25, 2.5, 5, 10, 25, 45];

// --- greedyPlates ---

test('greedyPlates: 90 per side → [45, 45]', () => {
  const { plates, actual } = greedyPlates(90, STANDARD);
  assert.deepEqual(plates, [45, 45]);
  assert.equal(actual, 90);
});

test('greedyPlates: 45 per side → [45]', () => {
  const { plates, actual } = greedyPlates(45, STANDARD);
  assert.deepEqual(plates, [45]);
  assert.equal(actual, 45);
});

test('greedyPlates: 0 per side → []', () => {
  const { plates, actual } = greedyPlates(0, STANDARD);
  assert.deepEqual(plates, []);
  assert.equal(actual, 0);
});

test('greedyPlates: 22.5 per side → [10, 10, 2.5]', () => {
  const { plates, actual } = greedyPlates(22.5, STANDARD);
  assert.deepEqual(plates, [10, 10, 2.5]);
  assert.equal(actual, 22.5);
});

test('greedyPlates: 1 per side (inexact) → [1.25] rounds up', () => {
  const { plates, actual } = greedyPlates(1, STANDARD);
  assert.deepEqual(plates, [1.25]);
  assert.equal(actual, 1.25);
});

test('greedyPlates: 0.5 per side (inexact) → [] rounds down', () => {
  const { plates, actual } = greedyPlates(0.5, STANDARD);
  assert.deepEqual(plates, []);
  assert.equal(actual, 0);
});

test('greedyPlates: no 45s, 90 per side → [25, 25, 25, 10, 5]', () => {
  const restricted = [1.25, 2.5, 5, 10, 25];
  const { plates, actual } = greedyPlates(90, restricted);
  assert.deepEqual(plates, [25, 25, 25, 10, 5]);
  assert.equal(actual, 90);
});

// --- calculate: full pipeline ---

test('calculate: bar=45, target=225, warmups=[50,75]', () => {
  const result = calculate(45, 225, [50, 75], STANDARD);
  assert.ok(!result.error, result.error);
  // Both warmups shown even when actual % differs from target %
  assert.equal(result.sets.length, 3);

  const working = result.sets[2];
  assert.equal(working.label, 'Working');
  assert.equal(working.actual, 225);
  assert.deepEqual(working.plates, [45, 45]);
});

test('calculate: bar=45, target=225 — all sets monotonically nested', () => {
  const result = calculate(45, 225, [50, 75], STANDARD);
  assert.ok(!result.error);
  // Each set's plate count should be <= next set's plate count
  for (let i = 0; i < result.sets.length - 1; i++) {
    const cur = result.sets[i].plates.reduce((s, p) => s + p, 0);
    const next = result.sets[i + 1].plates.reduce((s, p) => s + p, 0);
    assert.ok(cur <= next, `set ${i} (${cur}) should be <= set ${i+1} (${next})`);
  }
});

test('calculate: bar=45, target=275, warmups=[50,75]', () => {
  const result = calculate(45, 275, [50, 75], STANDARD);
  assert.ok(!result.error);
  const working = result.sets[result.sets.length - 1];
  assert.equal(working.actual, 275);
  assert.deepEqual(working.plates, [45, 45, 25]);
});

test('calculate: bar=45, target=135, warmups=[] — single working set', () => {
  const result = calculate(45, 135, [], STANDARD);
  assert.ok(!result.error);
  assert.equal(result.sets.length, 1);
  assert.equal(result.sets[0].label, 'Working');
  assert.deepEqual(result.sets[0].plates, [45]);
  assert.equal(result.sets[0].actual, 135);
});

test('calculate: bar=45, target=45 — working set with empty plates', () => {
  const result = calculate(45, 45, [], STANDARD);
  assert.ok(!result.error);
  assert.equal(result.sets.length, 1);
  assert.deepEqual(result.sets[0].plates, []);
  assert.equal(result.sets[0].actual, 45);
});

test('calculate: target < bar → error', () => {
  const result = calculate(45, 35, [], STANDARD);
  assert.ok(result.error);
  assert.match(result.error, /at least bar weight/i);
});

// --- Warmup nesting (the duplicate-plate bug) ---

test('calculate: 225 with warmups — two 45s are not zeroed out', () => {
  const result = calculate(45, 225, [50, 75], STANDARD);
  assert.ok(!result.error);
  const working = result.sets[result.sets.length - 1];
  // Both 45s should be present
  const count45 = working.plates.filter(p => p === 45).length;
  assert.equal(count45, 2, 'working set should have two 45-lb plates per side');
});

test('calculate: every warmup plates are a subset (by weight total) of the next heavier set', () => {
  const result = calculate(45, 225, [50, 75], STANDARD);
  assert.ok(!result.error);
  for (let i = 0; i < result.sets.length - 1; i++) {
    const curTotal = result.sets[i].plates.reduce((s, p) => s + p, 0);
    const nextTotal = result.sets[i + 1].plates.reduce((s, p) => s + p, 0);
    assert.ok(curTotal <= nextTotal, `set ${i} total ${curTotal} should be <= set ${i+1} total ${nextTotal}`);
  }
});

// --- Inexact weight handling ---

test('calculate: bar=45, target=47 → rounds up to 47.5', () => {
  const result = calculate(45, 47, [], STANDARD);
  assert.ok(!result.error);
  const working = result.sets[0];
  assert.equal(working.actual, 47.5);
});

test('calculate: bar=45, target=46 → stays at 45 (0 closer than 1.25)', () => {
  const result = calculate(45, 46, [], STANDARD);
  assert.ok(!result.error);
  const working = result.sets[0];
  assert.equal(working.actual, 45);
});

// --- Plate availability ---

test('calculate: no 45s, bar=45, target=135 → 25+10+10 per side', () => {
  const no45s = [1.25, 2.5, 5, 10, 25];
  const result = calculate(45, 135, [], no45s);
  assert.ok(!result.error);
  const working = result.sets[0];
  assert.equal(working.actual, 135);
  assert.deepEqual(working.plates, [25, 10, 10]);
});

test('calculate: only 10s, bar=45, target=85 → [10, 10] per side', () => {
  const only10s = [10];
  const result = calculate(45, 85, [], only10s);
  assert.ok(!result.error);
  const working = result.sets[0];
  assert.equal(working.actual, 85);
  assert.deepEqual(working.plates, [10, 10]);
});

// --- Delta correctness ---

test('calculate: first set deltaType is "load"', () => {
  const result = calculate(45, 225, [50, 75], STANDARD);
  assert.ok(!result.error);
  assert.equal(result.sets[0].deltaType, 'load');
});

test('calculate: subsequent sets deltaType is "add"', () => {
  const result = calculate(45, 225, [50, 75], STANDARD);
  assert.ok(!result.error);
  for (let i = 1; i < result.sets.length; i++) {
    assert.equal(result.sets[i].deltaType, 'add');
  }
});

test('calculate: deltas equal plates added from previous set', () => {
  const result = calculate(45, 225, [50, 75], STANDARD);
  assert.ok(!result.error);
  let prevTotal = 0;
  for (const set of result.sets) {
    const deltaTotal = set.delta.reduce((s, p) => s + p, 0);
    const curTotal = set.plates.reduce((s, p) => s + p, 0);
    assert.equal(curTotal, prevTotal + deltaTotal, `delta should account for all added weight at set "${set.label}"`);
    prevTotal = curTotal;
  }
});

// --- Warmup ±10% boundary ---

test('calculate: warmup within 10% of target pct is included', () => {
  // 50% of 225 = 112.5lb, closest = 115lb = 51.1% → within ±10%
  const result = calculate(45, 225, [50], STANDARD);
  assert.ok(!result.error);
  assert.equal(result.sets.length, 2); // warmup + working
  assert.equal(result.sets[0].label, 'Warmup 50%');
});

test('calculate: warmup far from target is still shown', () => {
  // Only 45s: 50% warmup of 135 → bar only (45lb actual), still shown
  const only45s = [45];
  const result = calculate(45, 135, [50], only45s);
  assert.ok(!result.error);
  assert.equal(result.sets.length, 2);
  assert.equal(result.sets[0].label, 'Warmup 50%');
  assert.equal(result.sets[0].actual, 45);
  assert.deepEqual(result.sets[0].plates, []);
});

test('calculate: bar=20, target=90, warmup=50% — within bounds, included', () => {
  // 50% of 90 = 45lb, actual = 40lb → 44.4% → within ±10%
  const result = calculate(20, 90, [50], STANDARD);
  assert.ok(!result.error);
  assert.equal(result.sets.length, 2);
  assert.equal(result.sets[0].label, 'Warmup 50%');
  assert.equal(result.sets[0].actual, 40);
});

test('calculate: warmup labeled by target pct even when actual is far off', () => {
  // 75% of 225 → actual 135 (60%), still labeled "Warmup 75%"
  const result = calculate(45, 225, [50, 75], STANDARD);
  assert.ok(!result.error);
  assert.equal(result.sets.length, 3);
  assert.equal(result.sets[1].label, 'Warmup 75%');
  assert.equal(result.sets[1].actual, 135);
});

test('calculate: all warmups always present (sets = warmupPcts.length + 1)', () => {
  const result = calculate(45, 225, [50, 75], STANDARD);
  assert.ok(!result.error);
  assert.equal(result.sets.length, 3); // 2 warmups + working

  const r2 = calculate(45, 225, [50], STANDARD);
  assert.ok(!r2.error);
  assert.equal(r2.sets.length, 2); // 1 warmup + working

  const only45s = [45];
  const r3 = calculate(45, 135, [50], only45s);
  assert.ok(!r3.error);
  assert.equal(r3.sets.length, 2); // bar-only warmup still shown
});

// --- formatWeight ---

test('formatWeight: integers print without decimal', () => {
  assert.equal(formatWeight(45), '45');
  assert.equal(formatWeight(10), '10');
});

test('formatWeight: half-pound prints with 1 decimal', () => {
  assert.equal(formatWeight(2.5), '2.5');
});

test('formatWeight: quarter-pound prints with 2 decimals', () => {
  assert.equal(formatWeight(1.25), '1.25');
});
