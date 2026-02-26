import { strategies } from './strategies/index.js';
import { runAll } from './runner.js';

const results = runAll(strategies);

// --- Strategy comparison table ---
console.log('\n=== Strategy Comparison ===\n');
console.log(
  'Strategy'.padEnd(20) +
  'Accuracy'.padStart(10) +
  'Transition'.padStart(12) +
  'Composite'.padStart(11) +
  '  Worst Scenario'
);
console.log('-'.repeat(75));

for (const r of results) {
  const s = r.summary;
  console.log(
    r.strategy.padEnd(20) +
    s.avgAccuracy.toFixed(1).padStart(10) +
    s.avgTransition.toFixed(1).padStart(12) +
    s.avgComposite.toFixed(1).padStart(11) +
    `  ${s.worstScenario} (${s.worstComposite.toFixed(1)})`
  );
}

// --- Per-scenario detail ---
console.log('\n=== Per-Scenario Detail ===\n');

for (const r of results) {
  console.log(`--- ${r.strategy} ---\n`);

  for (const sr of r.scenarioResults) {
    if (sr.error) {
      console.log(`  ${sr.scenario.name}: ERROR - ${sr.error}\n`);
      continue;
    }

    const { scenario, sets, ideals, score } = sr;
    console.log(`  ${scenario.name} (target=${scenario.targetWeight})  ` +
      `acc=${score.accuracyAvg.toFixed(1)} trans=${score.transitionAvg.toFixed(1)} ` +
      `composite=${score.composite.toFixed(1)}`);

    for (let i = 0; i < sets.length; i++) {
      const set = sets[i];
      const ideal = ideals[i];
      const diff = set.actual - ideal.idealWeight;
      const diffStr = diff === 0 ? '0' : (diff > 0 ? '+' : '') + diff.toFixed(1);

      const platesStr = set.plates.length ? set.plates.join(', ') : '(empty bar)';
      let deltaStr = set.deltaType;
      if (set.deltaType === 'swap') {
        deltaStr += ` -[${set.removeDelta.join(',')}] +[${set.delta.join(',')}]`;
      } else if (set.deltaType === 'add' && set.delta.length) {
        deltaStr += ` +[${set.delta.join(',')}]`;
      } else if (set.deltaType === 'load' && set.plates.length) {
        deltaStr += ` [${set.plates.join(',')}]`;
      }

      console.log(
        `    ${set.label.padEnd(14)} ` +
        `ideal=${String(ideal.idealWeight).padStart(3)}  ` +
        `actual=${String(set.actual).padStart(3)}  ` +
        `diff=${diffStr.padStart(5)}  ` +
        `acc=${String(score.accScores[i]).padStart(3)}  ` +
        `trans=${String(score.transScores[i]).padStart(3)}  ` +
        `${deltaStr}  ` +
        `plates=[${platesStr}]`
      );
    }
    console.log();
  }
}
