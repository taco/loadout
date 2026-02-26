export function greedyPlates(weightPerSide, available) {
  const plates = [];
  let remaining = weightPerSide;
  const sorted = [...available].sort((a, b) => b - a);
  for (const p of sorted) {
    while (remaining >= p - 0.001) {
      plates.push(p);
      remaining -= p;
    }
  }
  const actual = plates.reduce((s, p) => s + p, 0);
  if (remaining > 0.001) {
    const smallest = sorted[sorted.length - 1];
    const roundedUp = actual + smallest;
    if (Math.abs(roundedUp - weightPerSide) < Math.abs(actual - weightPerSide)) {
      plates.push(smallest);
      return { plates, actual: roundedUp };
    }
  }
  return { plates, actual };
}

export function multisetDiff(prev, next) {
  const prevCounts = new Map();
  for (const p of prev) prevCounts.set(p, (prevCounts.get(p) || 0) + 1);
  const nextCounts = new Map();
  for (const p of next) nextCounts.set(p, (nextCounts.get(p) || 0) + 1);

  const added = [];
  const removed = [];

  const allKeys = new Set([...prevCounts.keys(), ...nextCounts.keys()]);
  for (const key of allKeys) {
    const pCount = prevCounts.get(key) || 0;
    const nCount = nextCounts.get(key) || 0;
    const diff = nCount - pCount;
    if (diff > 0) {
      for (let i = 0; i < diff; i++) added.push(key);
    } else if (diff < 0) {
      for (let i = 0; i < -diff; i++) removed.push(key);
    }
  }

  added.sort((a, b) => b - a);
  removed.sort((a, b) => b - a);
  return { added, removed };
}

export function calculate(barWeight, targetWeight, warmupPcts, available) {
  if (targetWeight < barWeight) return { error: 'Target must be at least bar weight' };
  if (targetWeight === barWeight) {
    return { sets: [{ label: 'Working', pct: 100, target: barWeight, actual: barWeight, plates: [], delta: [], deltaType: 'load', removeDelta: [] }] };
  }

  const workingPerSide = (targetWeight - barWeight) / 2;
  const { plates: workingPlates } = greedyPlates(workingPerSide, available);
  const workingActual = workingPlates.reduce((s, p) => s + p, 0);

  const sortedPcts = [...warmupPcts].sort((a, b) => a - b);

  // Filter out 1.25 plates for warmups
  const warmupAvailable = available.filter(p => Math.abs(p - 1.25) > 0.001);

  const sets = [];
  let prevPlates = [];

  for (const pct of sortedPcts) {
    const rawPerSide = (targetWeight * pct / 100 - barWeight) / 2;

    let roundedPerSide;
    if (rawPerSide <= 0) {
      roundedPerSide = 0;
    } else if (rawPerSide < 15) {
      roundedPerSide = Math.round(rawPerSide / 2.5) * 2.5;
    } else {
      roundedPerSide = Math.round(rawPerSide / 5) * 5;
    }

    const { plates } = roundedPerSide > 0
      ? greedyPlates(roundedPerSide, warmupAvailable)
      : { plates: [] };

    const perSideActual = plates.reduce((s, p) => s + p, 0);
    const actual = barWeight + perSideActual * 2;

    const { added, removed } = multisetDiff(prevPlates, plates);
    let deltaType;
    if (prevPlates.length === 0) {
      deltaType = plates.length === 0 ? 'load' : 'load';
    } else if (removed.length > 0) {
      deltaType = 'swap';
    } else {
      deltaType = 'add';
    }

    sets.push({
      label: 'Warmup ' + pct + '%',
      pct,
      target: Math.round(targetWeight * pct / 100),
      actual,
      plates: [...plates].sort((a, b) => b - a),
      delta: added,
      deltaType,
      removeDelta: removed
    });
    prevPlates = plates;
  }

  // Working set
  const workPlatesSorted = [...workingPlates].sort((a, b) => b - a);
  const workActual = barWeight + workingActual * 2;
  const { added, removed } = multisetDiff(prevPlates, workingPlates);

  let workingDeltaType;
  if (prevPlates.length === 0 && sortedPcts.length === 0) {
    workingDeltaType = 'load';
  } else if (prevPlates.length === 0) {
    workingDeltaType = 'load';
  } else if (removed.length > 0) {
    workingDeltaType = 'swap';
  } else {
    workingDeltaType = 'add';
  }

  sets.push({
    label: 'Working',
    pct: 100,
    target: targetWeight,
    actual: workActual,
    plates: workPlatesSorted,
    delta: added,
    deltaType: workingDeltaType,
    removeDelta: removed
  });

  return { sets };
}

export function formatWeight(w) {
  return w % 1 === 0 ? w.toString() : w.toFixed(w % 0.5 === 0 ? 1 : 2);
}
