const fs = require('fs');

let code = fs.readFileSync('lib/deltaAutoTraderEngine.ts', 'utf8');

// 1. Remove Accuracy Check Enforcement
const accuracyRegex = /const accuracyCheck = this\.evaluateTradeAccuracy\([^;]+\);[\s\n]*if \(!accuracyCheck\.isAccurate\) \{[\s\n]*continue;[\s\n]*\}/g;
code = code.replace(accuracyRegex, `const accuracyCheck = this.evaluateTradeAccuracy(cleanDeltaSym, targetSide, candles15m, btcTrend);\n          // [Accuracy Filter REMOVED]`);

// 2. Change 15m to 1m for faster signals
code = code.replace(/await this\.fetchCandles\('BTCUSDT', '15m', 100\)/g, `await this.fetchCandles('BTCUSDT', '1m', 100)`);
code = code.replace(/await this\.fetchCandles\(symbol, '15m', 100\)/g, `await this.fetchCandles(symbol, '1m', 100)`);
code = code.replace(/15M/g, '1M'); // Update comments
code = code.replace(/15m/g, '1m'); // Update comments

fs.writeFileSync('lib/deltaAutoTraderEngine.ts', code);
console.log('deltaAutoTraderEngine.ts accuracy filter removed and timeframe set to 1m');
