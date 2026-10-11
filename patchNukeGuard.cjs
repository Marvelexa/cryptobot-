const fs = require('fs');

let code = fs.readFileSync('lib/deltaAutoTraderEngine.ts', 'utf8');

// Completely nuke the 4K capital guard so it NEVER auto-liquidates
code = code.replace(/if \(liveEquityINR <= minFloorINR \|\| liveEquityUSD <= minFloorUSD\) \{[\s\S]*?return;\s*\}/g, '// Capital guard removed');

// Ensure minCapitalFloorINR is just a dummy
code = code.replace(/const minFloorINR = this\.state\.minCapitalFloorINR \|\| 4000;/g, 'const minFloorINR = 1000;');

// Also remove minCapitalFloorINR from being 4000 in the initial state
code = code.replace(/minCapitalFloorINR: 4000,/g, 'minCapitalFloorINR: 1000,');

fs.writeFileSync('lib/deltaAutoTraderEngine.ts', code);
console.log('Nuked the 4K capital guard completely');
