const fs = require('fs');
let code = fs.readFileSync('lib/deltaAutoTraderEngine.ts', 'utf8');

code = code.replace(/scanIntervalSeconds:\s*5/g, 'scanIntervalSeconds: 1');
code = code.replace(/this\.state\.scanIntervalSeconds\s*=\s*5/g, 'this.state.scanIntervalSeconds = 1');

fs.writeFileSync('lib/deltaAutoTraderEngine.ts', code);
console.log('Fixed scan interval to 1 second!');
