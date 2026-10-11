const fs = require('fs');
let code = fs.readFileSync('lib/deltaAutoTraderEngine.ts', 'utf8');

// Add max 4 positions check right before signal execution
const oldBlock = `// When a real 15M indicator trade signal fires:
          if (evalResult.signal) {`;

const newBlock = `// When a real 15M indicator trade signal fires:
          if (evalResult.signal) {
            // MAX 4 ACTIVE POSITIONS LIMIT
            if (this.state.activePositions.length >= 4) {
              continue; // Skip new trades when 4 positions already open
            }`;

code = code.replace(oldBlock, newBlock);

fs.writeFileSync('lib/deltaAutoTraderEngine.ts', code);
console.log('Max 4 positions limit added');
