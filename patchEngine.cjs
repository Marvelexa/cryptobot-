const fs = require('fs');
let code = fs.readFileSync('lib/deltaAutoTraderEngine.ts', 'utf8');

const targetBlock = `          // DIRECT EXECUTION ON DELTA EXCHANGE (NO VIRTUAL WAITING BUFFER / NO BOUNCING CARDS)
          const newPos = await this.executeNewPosition({
            symbol: cleanDeltaSym,
            strategyName: \`\${evalResult.strategyName} [Direct Real Execution]\`,
            side: targetSide,
            signalPrice: currentPrice,
            atr: evalResult.atr,
            shadowConfirmedSeconds: 0,
          });

          if (newPos) {
            this.symbolLastTradeTime.set(cleanDeltaSym, Date.now());
            console.log(\`✅ [REAL TRADE PLACED] \${cleanDeltaSym} \${targetSide} successfully entered in Delta Exchange India! 30-min cooldown locked.\`);
          }`;

const replacementBlock = `          // NEW PIPELINE: ROUTE TO SHADOW GATE
          if (this.state.shadowGateEnabled !== false) {
            console.log(\`🛡️ [SHADOW GATE PIPELINE] \${cleanDeltaSym} signal intercepted! Routing to 3-minute virtual waiting room.\`);
            shadowGate.registerCandidate({
              symbol: cleanDeltaSym,
              strategyName: evalResult.strategyName,
              side: targetSide,
              signalPrice: currentPrice,
              atr: evalResult.atr,
              notionalUSD: (this.state.accountCapitalUSD * (this.state.marginPercentPerTrade / 100)) * this.state.leverage
            });
          } else {
            // Fallback: DIRECT EXECUTION
            const newPos = await this.executeNewPosition({
              symbol: cleanDeltaSym,
              strategyName: \`\${evalResult.strategyName} [Direct Real Execution]\`,
              side: targetSide,
              signalPrice: currentPrice,
              atr: evalResult.atr,
              shadowConfirmedSeconds: 0,
            });

            if (newPos) {
              this.symbolLastTradeTime.set(cleanDeltaSym, Date.now());
              console.log(\`✅ [REAL TRADE PLACED] \${cleanDeltaSym} \${targetSide} successfully entered in Delta Exchange India!\`);
            }
          }`;

// Let's do a more robust regex replacement in case of spacing differences
const escapedTarget = `          // DIRECT EXECUTION ON DELTA EXCHANGE[\\s\\S]*?console.log[\\s\\S]*?30-min cooldown locked.*\\);\\s*}`;

code = code.replace(new RegExp(escapedTarget), replacementBlock);

fs.writeFileSync('lib/deltaAutoTraderEngine.ts', code);
console.log('Engine patched');
