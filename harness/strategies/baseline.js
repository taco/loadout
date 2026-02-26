import { calculate } from '../../src/calc.js';

export default {
  name: 'baseline',
  execute(barWeight, targetWeight, warmupPcts, available) {
    return calculate(barWeight, targetWeight, warmupPcts, available);
  },
};
