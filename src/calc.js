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

export function subsetWeight(plates, mask) {
  let w = 0;
  for (let i = 0; i < plates.length; i++) {
    if (mask & (1 << i)) w += plates[i];
  }
  return w;
}

export function subsetPlates(plates, mask) {
  const result = [];
  for (let i = 0; i < plates.length; i++) {
    if (mask & (1 << i)) result.push(plates[i]);
  }
  return result;
}

export function bestSubsetForTarget(workingPlates, targetPerSide, withinMask) {
  let bestMask = 0;
  let bestDiff = Infinity;

  let mask = withinMask;
  while (true) {
    const w = subsetWeight(workingPlates, mask);
    const diff = Math.abs(w - targetPerSide);
    if (diff < bestDiff || (diff === bestDiff && w <= targetPerSide)) {
      bestDiff = diff;
      bestMask = mask;
    }
    if (mask === 0) break;
    mask = (mask - 1) & withinMask;
  }
  return bestMask;
}

export function calculate(barWeight, targetWeight, warmupPcts, available) {
  if (targetWeight < barWeight) return { error: 'Target must be at least bar weight' };
  if (targetWeight === barWeight) {
    return { sets: [{ label: 'Working', pct: 100, target: barWeight, actual: barWeight, plates: [], delta: [], deltaType: 'load' }] };
  }

  const workingPerSide = (targetWeight - barWeight) / 2;
  const { plates: workingPlates } = greedyPlates(workingPerSide, available);
  const workingActual = workingPlates.reduce((s, p) => s + p, 0);
  const workingMask = (1 << workingPlates.length) - 1;

  const sortedPcts = [...warmupPcts].sort((a, b) => a - b);

  const warmupMasks = new Array(sortedPcts.length);
  let constraintMask = workingMask;
  for (let i = sortedPcts.length - 1; i >= 0; i--) {
    const warmupTarget = (targetWeight * sortedPcts[i] / 100 - barWeight) / 2;
    if (warmupTarget <= 0) {
      warmupMasks[i] = 0;
    } else {
      warmupMasks[i] = bestSubsetForTarget(workingPlates, warmupTarget, constraintMask);
    }
    constraintMask = warmupMasks[i];
  }

  const sets = [];
  let prevMask = 0;

  for (let i = 0; i < sortedPcts.length; i++) {
    const mask = warmupMasks[i];
    const plates = subsetPlates(workingPlates, mask);
    const perSide = subsetWeight(workingPlates, mask);
    const actual = barWeight + perSide * 2;

    const addedMask = mask & ~prevMask;
    const addedPlates = subsetPlates(workingPlates, addedMask);

    sets.push({
      label: 'Warmup ' + sortedPcts[i] + '%',
      pct: sortedPcts[i],
      target: Math.round(targetWeight * sortedPcts[i] / 100),
      actual,
      plates: plates.sort((a, b) => b - a),
      delta: addedPlates.sort((a, b) => b - a),
      deltaType: prevMask === 0 ? 'load' : 'add'
    });
    prevMask = mask;
  }

  const workPlatesSorted = workingPlates.sort((a, b) => b - a);
  const workActual = barWeight + workingActual * 2;
  const addedMask = workingMask & ~prevMask;
  const addedPlates = subsetPlates(workingPlates, addedMask);

  sets.push({
    label: 'Working',
    pct: 100,
    target: targetWeight,
    actual: workActual,
    plates: workPlatesSorted,
    delta: addedPlates.sort((a, b) => b - a),
    deltaType: prevMask === 0 ? 'load' : 'add'
  });

  return { sets };
}

export function formatWeight(w) {
  return w % 1 === 0 ? w.toString() : w.toFixed(w % 0.5 === 0 ? 1 : 2);
}
