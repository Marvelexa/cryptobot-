const fs = require('fs');
let env = fs.readFileSync('.env', 'utf8');
env = env.replace(/DELTA_IS_TESTNET=true/g, 'DELTA_IS_TESTNET=false');
fs.writeFileSync('.env', env);
console.log('.env updated to use REAL Delta Exchange (Testnet disabled)');
