const fs = require('fs');
let code = fs.readFileSync('lib/deltaAutoTraderEngine.ts', 'utf8');

// Match across any newline characters
const regex = /if\s*\(hasOpenPosition\)\s*\{\s*\/\/\s*Immediately\s*purge\s*any\s*ghost\s*candidate\s*for\s*this\s*active\s*coin\s*shadowGate\.removeCandidate\(deltaSymbol\);\s*shadowGate\.removeCandidate\(cleanDeltaSym\);\s*continue;\s*\}/;

const replacementStr = `if (hasOpenPosition) {
          // Immediately purge any ghost candidate for this active coin
          shadowGate.removeCandidate(deltaSymbol);
          shadowGate.removeCandidate(cleanDeltaSym);
          continue;
        }

        // Check 1.5: Avoid resetting Shadow Gate timer!
        if (shadowGate.getCandidate(cleanDeltaSym) || shadowGate.getCandidate(deltaSymbol)) {
          continue;
        }`;

if (regex.test(code)) {
  code = code.replace(regex, replacementStr);
  fs.writeFileSync('lib/deltaAutoTraderEngine.ts', code);
  console.log('Fixed timer reset with regex!');
} else {
  console.log('REGEX STILL FAILED');
}
