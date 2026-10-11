const fs = require('fs');
let code = fs.readFileSync('lib/deltaAutoTraderEngine.ts', 'utf8');

const targetCheck = `        // Check 1: If coin ALREADY has an active open position, NEVER touch or open another trade!
        const hasOpenPosition = this.state.activePositions.some(p => {
          const s = (p.symbol || '').toUpperCase().replace('USDT', 'USD');
          return s === cleanDeltaSym;
        });
        if (hasOpenPosition) {
          // Immediately purge any ghost candidate for this active coin
          shadowGate.removeCandidate(deltaSymbol);
          shadowGate.removeCandidate(cleanDeltaSym);
          continue;
        }`;

const replacement = `        // Check 1: If coin ALREADY has an active open position, NEVER touch or open another trade!
        const hasOpenPosition = this.state.activePositions.some(p => {
          const s = (p.symbol || '').toUpperCase().replace('USDT', 'USD');
          return s === cleanDeltaSym;
        });
        if (hasOpenPosition) {
          // Immediately purge any ghost candidate for this active coin
          shadowGate.removeCandidate(deltaSymbol);
          shadowGate.removeCandidate(cleanDeltaSym);
          continue;
        }

        // Check 1.5: Avoid resetting Shadow Gate timer!
        if (shadowGate.getCandidate(cleanDeltaSym) || shadowGate.getCandidate(deltaSymbol)) {
          continue;
        }`;

code = code.replace(targetCheck, replacement);
fs.writeFileSync('lib/deltaAutoTraderEngine.ts', code);
console.log('Fixed timer reset issue!');
