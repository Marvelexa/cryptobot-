const fs = require('fs');

let code = fs.readFileSync('lib/quantMathematicalEngine.ts', 'utf8');

// 1. Remove the severe penalty for buying in a bearish trend
code = code.replace(/buyPoints \-= 25; \/\/ Severe penalty for buying in heavy downtrend without support bounce/g, 'buyPoints -= 0; // Disabled penalty for buying in heavy downtrend');

// 2. Remove the strict block on BUY if macroTrend is bearish
code = code.replace(/const hasValidBuyStructure = \(sr\.supportBounceConfirmed \|\| sr\.isAtSupport \|\| sr\.macroTrend === 'BULLISH'\) && sr\.macroTrend !== 'BEARISH';/g, "const hasValidBuyStructure = (sr.supportBounceConfirmed || sr.isAtSupport || sr.macroTrend === 'BULLISH' || sr.macroTrend === 'BEARISH');");

fs.writeFileSync('lib/quantMathematicalEngine.ts', code);
console.log('quantMathematicalEngine.ts patched successfully.');

let deltaCode = fs.readFileSync('lib/deltaAutoTraderEngine.ts', 'utf8');

// 1. Remove the massive penalty for altcoin BUYS when BTC is bearish
deltaCode = deltaCode.replace(/score \-= 20; \/\/ Altcoins crash when BTC dumps!/g, 'score -= 0; // Disabled penalty for Altcoin buys when BTC dumps');

fs.writeFileSync('lib/deltaAutoTraderEngine.ts', deltaCode);
console.log('deltaAutoTraderEngine.ts patched successfully.');
