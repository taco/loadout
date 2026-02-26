import { test } from 'node:test';
import assert from 'node:assert/strict';
import { greedyPlates, multisetDiff, calculate, formatWeight } from './src/calc.js';

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

// --- multisetDiff ---

test('multisetDiff: empty → [45, 25] adds both', () => {
  const { added, removed } = multisetDiff([], [45, 25]);
  assert.deepEqual(added, [45, 25]);
  assert.deepEqual(removed, []);
});

test('multisetDiff: [25, 10] → [45, 10, 5] adds 45,5 removes 25', () => {
  const { added, removed } = multisetDiff([25, 10], [45, 10, 5]);
  assert.deepEqual(added, [45, 5]);
  assert.deepEqual(removed, [25]);
});

test('multisetDiff: identical arrays → no changes', () => {
  const { added, removed } = multisetDiff([45, 10], [45, 10]);
  assert.deepEqual(added, []);
  assert.deepEqual(removed, []);
});

test('multisetDiff: [45] → [45, 45] adds one 45', () => {
  const { added, removed } = multisetDiff([45], [45, 45]);
  assert.deepEqual(added, [45]);
  assert.deepEqual(removed, []);
});

test('multisetDiff: [45, 10] → [] removes both', () => {
  const { added, removed } = multisetDiff([45, 10], []);
  assert.deepEqual(added, []);
  assert.deepEqual(removed, [45, 10]);
});

// --- calculate: full pipeline ---

test('calculate: bar=45, target=225, warmups=[50,75]', () => {
  const result = calculate(45, 225, [50, 75], STANDARD);
  assert.ok(!result.error, result.error);
  assert.equal(result.sets.length, 3);

  const w50 = result.sets[0];
  assert.equal(w50.label, 'Warmup 50%');
  assert.equal(w50.actual, 115); // 35 per side → [25, 10]

  const w75 = result.sets[1];
  assert.equal(w75.label, 'Warmup 75%');
  assert.equal(w75.actual, 165); // 60 per side → [45, 10, 5]

  const working = result.sets[2];
  assert.equal(working.label, 'Working');
  assert.equal(working.actual, 225);
  assert.deepEqual(working.plates, [45, 45]);
});

test('calculate: bar=45, target=225 — all sets monotonically increasing', () => {
  const result = calculate(45, 225, [50, 75], STANDARD);
  assert.ok(!result.error);
  for (let i = 0; i < result.sets.length - 1; i++) {
    assert.ok(result.sets[i].actual <= result.sets[i + 1].actual,
      `set ${i} (${result.sets[i].actual}) should be <= set ${i+1} (${result.sets[i + 1].actual})`);
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
  const count45 = working.plates.filter(p => p === 45).length;
  assert.equal(count45, 2, 'working set should have two 45-lb plates per side');
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

test('calculate: deltas equal plates changed from previous set', () => {
  const result = calculate(45, 225, [50, 75], STANDARD);
  assert.ok(!result.error);
  let prevTotal = 0;
  for (const set of result.sets) {
    const deltaTotal = set.delta.reduce((s, p) => s + p, 0);
    const removeTotal = (set.removeDelta || []).reduce((s, p) => s + p, 0);
    const curTotal = set.plates.reduce((s, p) => s + p, 0);
    assert.equal(curTotal, prevTotal + deltaTotal - removeTotal, `delta should account for all weight changes at set "${set.label}"`);
    prevTotal = curTotal;
  }
});

// --- Warmup presence ---

test('calculate: all warmups always present (sets = warmupPcts.length + 1)', () => {
  const result = calculate(45, 225, [50, 75], STANDARD);
  assert.ok(!result.error);
  assert.equal(result.sets.length, 3);

  const r2 = calculate(45, 225, [50], STANDARD);
  assert.ok(!r2.error);
  assert.equal(r2.sets.length, 2);

  const only45s = [45];
  const r3 = calculate(45, 135, [50], only45s);
  assert.ok(!r3.error);
  assert.equal(r3.sets.length, 2);
});

test('calculate: warmup far from target is still shown', () => {
  const only45s = [45];
  const result = calculate(45, 135, [50], only45s);
  assert.ok(!result.error);
  assert.equal(result.sets.length, 2);
  assert.equal(result.sets[0].label, 'Warmup 50%');
  assert.equal(result.sets[0].actual, 45);
  assert.deepEqual(result.sets[0].plates, []);
});

// --- Warmup accuracy (independent greedy) ---

test('calculate: bar=45, target=225 — warmups are within 5% of target pct', () => {
  const result = calculate(45, 225, [50, 75], STANDARD);
  assert.ok(!result.error);
  const w50 = result.sets[0];
  const w75 = result.sets[1];
  const actualPct50 = w50.actual / 225 * 100;
  const actualPct75 = w75.actual / 225 * 100;
  assert.ok(Math.abs(actualPct50 - 50) < 5, `50% warmup actual ${actualPct50.toFixed(1)}% should be within 5pp of 50%`);
  assert.ok(Math.abs(actualPct75 - 75) < 5, `75% warmup actual ${actualPct75.toFixed(1)}% should be within 5pp of 75%`);
});

test('calculate: warmup never uses 1.25 plates', () => {
  const result = calculate(45, 225, [50, 75], STANDARD);
  assert.ok(!result.error);
  for (let i = 0; i < result.sets.length - 1; i++) {
    const has125 = result.sets[i].plates.some(p => Math.abs(p - 1.25) < 0.001);
    assert.ok(!has125, `warmup set ${i} should not use 1.25 plates`);
  }
});

test('calculate: bar=20, target=90, warmup=50%', () => {
  // rawPerSide = (45-20)/2 = 12.5, <15 → round to nearest 2.5 = 12.5
  // greedyPlates(12.5, no1.25) → [10, 2.5] = 12.5 → actual = 20+25 = 45
  const result = calculate(20, 90, [50], STANDARD);
  assert.ok(!result.error);
  assert.equal(result.sets.length, 2);
  assert.equal(result.sets[0].label, 'Warmup 50%');
  assert.equal(result.sets[0].actual, 45);
});

test('calculate: bar=20, target=70, warmup=50%', () => {
  // rawPerSide = (35-20)/2 = 7.5, <15 → round to nearest 2.5 = 7.5
  // greedyPlates(7.5, no1.25) → [5, 2.5] = 7.5 → actual = 20+15 = 35
  const result = calculate(20, 70, [50], STANDARD);
  assert.ok(!result.error);
  assert.equal(result.sets[0].label, 'Warmup 50%');
  assert.equal(result.sets[0].actual, 35);
  assert.deepEqual(result.sets[0].plates, [5, 2.5]);
});

// --- Warmup rounding ---

test('calculate: warmup per-side >= 15 rounds to nearest 5', () => {
  // bar=45, target=225, 75%: rawPerSide=61.875 → rounds to 60
  const result = calculate(45, 225, [75], STANDARD);
  assert.ok(!result.error);
  const w = result.sets[0];
  const perSide = (w.actual - 45) / 2;
  assert.equal(perSide % 5, 0, `per-side weight ${perSide} should be divisible by 5`);
});

test('calculate: warmup per-side < 15 rounds to nearest 2.5', () => {
  // bar=20, target=90, 50%: rawPerSide=12.5 → rounds to 12.5
  const result = calculate(20, 90, [50], STANDARD);
  assert.ok(!result.error);
  const w = result.sets[0];
  const perSide = (w.actual - 20) / 2;
  assert.equal(perSide % 2.5, 0, `per-side weight ${perSide} should be divisible by 2.5`);
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
