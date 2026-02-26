import { scenarios, config, computeIdeals } from './scenarios.js';
import { scoreScenario, scoreStrategy } from './scoring.js';

export function runAll(strategyList, cfg = config) {
  const results = [];

  for (const strategy of strategyList) {
    const scenarioResults = [];

    for (const scenario of scenarios) {
      const ideals = computeIdeals(scenario.targetWeight, cfg);
      const result = strategy.execute(
        cfg.barWeight, scenario.targetWeight, cfg.warmupPcts, cfg.available
      );

      if (result.error) {
        scenarioResults.push({ scenario, error: result.error });
        continue;
      }

      const score = scoreScenario(result.sets, ideals);
      scenarioResults.push({ scenario, sets: result.sets, ideals, score });
    }

    const summary = scoreStrategy(scenarioResults.filter(r => !r.error));
    results.push({ strategy: strategy.name, scenarioResults, summary });
  }

  return results;
}
