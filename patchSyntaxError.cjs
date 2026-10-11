const fs = require('fs');

let code = fs.readFileSync('lib/deltaAutoTraderEngine.ts', 'utf8');

// Replace the dangling catch block
code = code.replace(/\/\/ -------------------------------------------------------------\r?\n\s*\} catch \(e\) \{\}/, '// -------------------------------------------------------------');

fs.writeFileSync('lib/deltaAutoTraderEngine.ts', code);
console.log('Fixed syntax error');
