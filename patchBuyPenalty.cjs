const fs = require('fs');

let code = fs.readFileSync('lib/deltaAutoTraderEngine.ts', 'utf8');

// Remove the severe penalty for buying in heavy downtrend
code = code.replace(/score \-= 20; \/\/ Severe penalty for buying in heavy downtrend/g, 'score -= 0; // Disabled penalty for buying in heavy downtrend');

fs.writeFileSync('lib/deltaAutoTraderEngine.ts', code);
console.log('Fixed evaluateTradeAccuracy BUY penalty');
