export function accuracyScore(actual, ideal) {
  const diff = Math.abs(actual - ideal);
  if (diff < 0.001) return 100;
  if (diff <= 2.5) return 90;
  if (diff <= 5) return 75;
  if (diff <= 8) return 50;
  if (diff <= 15) return 25;
  return 0;
}

export function transitionScore(set) {
  const { deltaType, delta, removeDelta } = set;
  if (deltaType === 'load') return 100;

  if (deltaType === 'add') {
    const added = delta.length;
    return Math.max(0, 90 - 5 * Math.max(0, added - 1));
  }

  // swap
  const removed = removeDelta.length;
  const added = delta.length;
  return Math.max(0, 40 - 8 * removed - 5 * Math.max(0, added - 1));
}

export function scoreScenario(sets, ideals) {
  const accScores = sets.map((set, i) => accuracyScore(set.actual, ideals[i].idealWeight));
  const transScores = sets.map(set => transitionScore(set));

  const accuracyAvg = accScores.reduce((s, v) => s + v, 0) / accScores.length;

  // Back-off transition (last set) gets 2x weight
  let transWeightedSum = 0;
  let transWeightTotal = 0;
  for (let i = 0; i < transScores.length; i++) {
    const w = i === transScores.length - 1 ? 2 : 1;
    transWeightedSum += transScores[i] * w;
    transWeightTotal += w;
  }
  const transitionAvg = transWeightedSum / transWeightTotal;

  const composite = accuracyAvg * 0.6 + transitionAvg * 0.4;

  return { accScores, transScores, accuracyAvg, transitionAvg, composite };
}

export function scoreStrategy(scenarioResults) {
  const composites = scenarioResults.map(r => r.score.composite);
  const avg = composites.reduce((s, v) => s + v, 0) / composites.length;
  const worst = scenarioResults.reduce((w, r) =>
    r.score.composite < w.score.composite ? r : w
  );
  return {
    avgAccuracy: scenarioResults.reduce((s, r) => s + r.score.accuracyAvg, 0) / scenarioResults.length,
    avgTransition: scenarioResults.reduce((s, r) => s + r.score.transitionAvg, 0) / scenarioResults.length,
    avgComposite: avg,
    worstScenario: worst.scenario.name,
    worstComposite: worst.score.composite,
  };
}
