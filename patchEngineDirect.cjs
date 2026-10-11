const fs = require('fs');

let engineCode = fs.readFileSync('lib/deltaAutoTraderEngine.ts', 'utf8');

// 1. Set isInverseTrading default to true
engineCode = engineCode.replace(/isInverseTrading: false/g, 'isInverseTrading: true');
engineCode = engineCode.replace(/this\.state\.isInverseTrading = false/g, 'this.state.isInverseTrading = true');

// 2. runScanCycle targetSide
const targetSideRegex = /\/\/\s*Global Inverse is DISABLED\. We always pass the natural signal to Shadow Gate\.\s*const targetSide: 'BUY' \| 'SELL' = evalResult\.signal;/g;
engineCode = engineCode.replace(targetSideRegex, `
          const isInverse = this.state.isInverseTrading !== false;
          const targetSide: 'BUY' | 'SELL' = isInverse ? (evalResult.signal === 'BUY' ? 'SELL' : 'BUY') : evalResult.signal;
`);

// 3. Remove Shadow Gate pipeline
const shadowGatePipelineRegex = /\/\/ NEW PIPELINE: ROUTE TO SHADOW GATE\s*if \(this\.state\.shadowGateEnabled !== false\) \{[\s\S]*?\} else \{\s*\/\/\s*Fallback: DIRECT EXECUTION\s*const newPos = await this\.executeNewPosition\(\{[\s\S]*?shadowConfirmedSeconds: 0,\s*\}\);\s*if \(newPos\) \{\s*this\.symbolLastTradeTime\.set\(cleanDeltaSym, Date\.now\(\)\);\s*console\.log\(\`.*successfully entered in Delta Exchange India!\`\);\s*\}\s*\}/g;

const directExecutionBlock = `
          // DIRECT REAL MARKET EXECUTION (Shadow Gate Removed)
          const newPos = await this.executeNewPosition({
            symbol: cleanDeltaSym,
            strategyName: \`\${evalResult.strategyName} [\${isInverse ? 'INVERSE' : 'DIRECT'}]\`,
            side: targetSide,
            signalPrice: currentPrice,
            atr: evalResult.atr,
            shadowConfirmedSeconds: 0,
          });

          if (newPos) {
            this.symbolLastTradeTime.set(cleanDeltaSym, Date.now());
            console.log(\`[REAL TRADE PLACED] \${cleanDeltaSym} \${targetSide} successfully entered in Delta Exchange India!\`);
          }
`;

engineCode = engineCode.replace(shadowGatePipelineRegex, directExecutionBlock);

// 4. Remove runTickCycle shadow gate logic
const runTickCycleRegex = /\/\/ 1\. Evaluate Shadow Gate Waiting Room[\s\S]*?\/\/ 2\. Evaluate Active Positions/g;
engineCode = engineCode.replace(runTickCycleRegex, `// 1. (Shadow Gate Removed)\n\n        // 2. Evaluate Active Positions`);

// 5. Remove 'Avoid resetting Shadow Gate timer' check
const shadowGateTimerCheckRegex = /\/\/ Check 1\.5: Avoid resetting Shadow Gate timer![\s\S]*?continue;\s*\}/g;
engineCode = engineCode.replace(shadowGateTimerCheckRegex, '');

fs.writeFileSync('lib/deltaAutoTraderEngine.ts', engineCode);
console.log('deltaAutoTraderEngine.ts successfully patched for Global Inverse & Direct Market');
