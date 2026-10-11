const fs = require('fs');
let code = fs.readFileSync('lib/deltaAutoTraderEngine.ts', 'utf8');

code = code.replace(/const modeLabel = shouldInvert[\s\S]*?;/, 'const modeLabel = `DIRECT NATURAL ${targetSide}`;');

fs.writeFileSync('lib/deltaAutoTraderEngine.ts', code);
console.log('Fixed shouldInvert');
