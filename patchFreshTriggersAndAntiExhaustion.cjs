const fs = require('fs');

let engineCode = fs.readFileSync('lib/deltaAutoTraderEngine.ts', 'utf8');

const regex = /(const currentPrice = await deltaExchange\.getMarketPrice\(cleanDeltaSym\);\s*this\.candidateLastAttemptTime\.set\(cleanDeltaSym,\s*Date\.now\(\)\);)/;

const guardCode = `$1\r\n\r\n          // Anti-Late-Chase & Trend Exhaustion Guard:\r\n          // If price has already moved far away from 21 EMA base (> 1.25x ATR), the move already happened.\r\n          // Never enter a late/exhausted trend. Only enter fresh setups!\r\n          const closes15m = candles15m.map(c => c.close);\r\n          const ema21 = CryptoDedicatedStrategyEngine.calculateEMA(closes15m, 21);\r\n          const lastEma21 = ema21[ema21.length - 1] || currentPrice;\r\n          const distanceAtr = Math.abs(currentPrice - lastEma21) / (evalResult.atr || 1);\r\n          if (distanceAtr > 1.25) {\r\n            console.log(\`⏱️ [EXHAUSTED/LATE TREND BLOCKED] \${cleanDeltaSym}: Price ($\${currentPrice.toFixed(2)}) is overextended (\${distanceAtr.toFixed(2)}x ATR from 21 EMA). Trend has already passed. Waiting for fresh setup.\`);\r\n            continue;\r\n          }`;

if (regex.test(engineCode)) {
  engineCode = engineCode.replace(regex, guardCode);
  fs.writeFileSync('lib/deltaAutoTraderEngine.ts', engineCode, 'utf8');
  console.log('✓ Successfully inserted Anti-Late-Chase & Trend Exhaustion Guard into deltaAutoTraderEngine.ts');
} else {
  console.log('✗ Regex not matched in deltaAutoTraderEngine.ts');
}
