export const config = {
  barWeight: 20,
  available: [1.25, 2.5, 5, 10, 25],
  warmupPcts: [50, 75, 110],
};

export function computeIdeals(targetWeight, cfg) {
  const pcts = [...cfg.warmupPcts].sort((a, b) => a - b);
  const ideals = pcts.map(pct => ({
    label: `Warmup ${pct}%`,
    pct,
    idealWeight: Math.round(targetWeight * pct / 100),
  }));
  ideals.push({ label: 'Working', pct: 100, idealWeight: targetWeight });
  return ideals;
}

export const scenarios = Array.from({ length: 10 }, (_, i) => {
  const target = 70 + i * 10;
  return { name: `Target ${target}`, targetWeight: target };
});
