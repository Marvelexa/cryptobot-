const fs = require('fs');
let code = fs.readFileSync('lib/deltaAutoTraderEngine.ts', 'utf8');

const targetStr = `        if (hasOpenPosition) {
          // Immediately purge any ghost candidate for this active coin
          shadowGate.removeCandidate(deltaSymbol);
          shadowGate.removeCandidate(cleanDeltaSym);
          continue;
        }`;

const replacementStr = `        if (hasOpenPosition) {
          // Immediately purge any ghost candidate for this active coin
          shadowGate.removeCandidate(deltaSymbol);
          shadowGate.removeCandidate(cleanDeltaSym);
          continue;
        }

        // Check 1.5: Avoid resetting Shadow Gate timer!
        if (shadowGate.getCandidate(cleanDeltaSym) || shadowGate.getCandidate(deltaSymbol)) {
          continue;
        }`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacementStr);
  fs.writeFileSync('lib/deltaAutoTraderEngine.ts', code);
  console.log('Fixed timer reset exactly!');
} else {
  console.log('TARGET STRING NOT FOUND. Maybe line endings differ?');
}
