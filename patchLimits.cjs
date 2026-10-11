const fs = require('fs');
let code = fs.readFileSync('lib/deltaAutoTraderEngine.ts', 'utf8');

// Replace limit 3
code = code.replace(/if\s*\(\s*this\.state\.activePositions\.length\s*>=\s*2\s*\)\s*\{/g, 'if (false) {');

// Replace debounce 4
code = code.replace(/if\s*\(\s*Date\.now\(\)\s*-\s*lastCandidateAttempt\s*<\s*5\s*\*\s*60\s*\*\s*1000\s*\)\s*\{/g, 'if (false) {');

fs.writeFileSync('lib/deltaAutoTraderEngine.ts', code);
console.log('Done');
