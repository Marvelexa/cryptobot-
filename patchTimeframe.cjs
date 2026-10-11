const fs = require('fs');

let code = fs.readFileSync('lib/deltaAutoTraderEngine.ts', 'utf8');

// Revert 1m back to 15m
code = code.replace(/await this\.fetchCandles\('BTCUSDT', '1m', 100\)/g, `await this.fetchCandles('BTCUSDT', '15m', 100)`);
code = code.replace(/await this\.fetchCandles\(symbol, '1m', 100\)/g, `await this.fetchCandles(symbol, '15m', 100)`);
code = code.replace(/1M/g, '15M');
code = code.replace(/1m/g, '15m');

fs.writeFileSync('lib/deltaAutoTraderEngine.ts', code);
console.log('deltaAutoTraderEngine.ts timeframe set back to 15m to fix tight TP/SL exits');
