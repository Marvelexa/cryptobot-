const fs = require('fs');

let code = fs.readFileSync('lib/deltaAutoTraderEngine.ts', 'utf8');

// 1. Fix the tiny SL/TP logic by using pure ATR instead of hardcoded USD amounts
code = code.replace(/const tpDist = notionalUSD > 0 \? [^;]+;/g, 'const tpDist = Math.max(2.5 * (exPos.atr || entryPrice * 0.015), entryPrice * 0.01);');
code = code.replace(/const slDist = notionalUSD > 0 \? [^;]+;/g, 'const slDist = Math.max(1.5 * (exPos.atr || entryPrice * 0.015), entryPrice * 0.005);');

code = code.replace(/const targetPriceDistance = notionalUSD > 0\s*\?\s*\([^)]+\)\s*\*\s*fillPrice\s*:\s*Math\.max\([^)]+\);/g, 'const targetPriceDistance = Math.max(2.5 * params.candidate.atr, fillPrice * 0.01);');
code = code.replace(/const slPriceDistance = notionalUSD > 0\s*\?\s*\([^)]+\)\s*\*\s*fillPrice\s*:\s*Math\.max\([^)]+\);/g, 'const slPriceDistance = Math.max(1.5 * params.candidate.atr, fillPrice * 0.005);');

// Fix instant TP closure logic
code = code.replace(/const targetProfitUSD = isBtcTrade \? 0\.25 : 6\.00;/g, 'const targetProfitUSD = 999999.00; // Disabled');

// 2. Disable Dedicated Strategy Engine (PineScript indicators) from adding candidates, 
// so we ONLY trade on the Math Engine signals.
const evalBlock = `      try {
        const evalResult = strategyEngine.evaluateSymbol(symbol, closedCandles15m);
        if (evalResult && evalResult.signal && (!mathVerdict.recommendedSide || evalResult.signal === mathVerdict.recommendedSide)) {
          candidates.push({
            symbol: cleanSym,
            timeframe: '15m',
            strategyName: evalResult.strategyName,
            side: evalResult.signal,
            confidenceScore: evalResult.confidenceScore || 85,
            atr: evalResult.atr || atr15m,
            reason: \`Dedicated Token Sniper (\${evalResult.strategyName}) triggered \${evalResult.signal}: \${evalResult.reason}\`,
          });
        }
      } catch (e) {}`;

const disabledEvalBlock = `      // Disabled Dedicated Strategy Engine per user request, relying purely on Math Engine.`;
code = code.replace(evalBlock, disabledEvalBlock);

fs.writeFileSync('lib/deltaAutoTraderEngine.ts', code);
console.log('Fixed SL logic and disabled Dedicated Strategy Engine');
