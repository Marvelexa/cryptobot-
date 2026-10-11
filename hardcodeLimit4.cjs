const fs = require('fs');

let engineCode = fs.readFileSync('lib/deltaAutoTraderEngine.ts', 'utf8');

// 1. Set maxConcurrentPositions to 4 in defaults and loadState
engineCode = engineCode.replace(/maxConcurrentPositions:\s*8,/, 'maxConcurrentPositions: 4,');
engineCode = engineCode.replace(/this\.state\.maxConcurrentPositions\s*=\s*8;/, 'this.state.maxConcurrentPositions = 4;');

// 2. Add strict limit in runScanCycle
const oldScanSignal = `// When a real 15M indicator trade signal fires:
        if (evalResult.signal) {`;

const newScanSignal = `// When a real 15M indicator trade signal fires:
        if (evalResult.signal) {
          // STRICT MAX 4 ACTIVE POSITIONS LIMIT
          if (this.state.activePositions.length >= 4) {
            continue;
          }`;

engineCode = engineCode.replace(oldScanSignal, newScanSignal);

// 3. Add strict limit in executeNewPosition
const oldExecExisting = `if (existing) {
      console.log(\`⚠️ Position for \${params.symbol} already exists in activePositions. Skipping duplicate position.\`);
      return existing;
    }`;

const newExecExisting = `if (existing) {
      console.log(\`⚠️ Position for \${params.symbol} already exists in activePositions. Skipping duplicate position.\`);
      return existing;
    }

    // HARD GUARD: NEVER ALLOW MORE THAN 4 POSITIONS
    if (this.state.activePositions.length >= 4) {
      console.log(\`⚠️ Hard limit reached: \${this.state.activePositions.length}/4 positions active. Rejecting new trade for \${params.symbol}.\`);
      return null;
    }`;

engineCode = engineCode.replace(oldExecExisting, newExecExisting);

fs.writeFileSync('lib/deltaAutoTraderEngine.ts', engineCode);
console.log('Strict 4-position limit hardcoded into deltaAutoTraderEngine.ts');
