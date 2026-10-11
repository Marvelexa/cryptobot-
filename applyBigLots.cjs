const fs = require('fs');

// 1. Update deltaAutoTraderEngine.ts for BIG LOT SIZING
let engineCode = fs.readFileSync('lib/deltaAutoTraderEngine.ts', 'utf8');

// Target $10 - $18 margin per trade @ 30x leverage = $300 - $540 notional per trade
const oldMarginBlock = /let marginUSD = 3\.00;[\r\n\s]+try \{[\r\n\s]+const bal = await deltaExchange\.getWalletBalance\(\);[\r\n\s]+if \(bal && bal\.availableUSD > 0\) \{[\r\n\s]+\/\/ Balanced sizing with 30x leverage: 35% of available balance, max \$5\.00, min \$1\.00[\r\n\s]+marginUSD = Math\.max\(1\.00, Math\.min\(5\.00, parseFloat\(\(bal\.availableUSD \* 0\.35\)\.toFixed\(2\)\)\)\);[\r\n\s]+\}[\r\n\s]+\} catch \(e\) \{[\r\n\s]+marginUSD = 3\.00;[\r\n\s]+\}/;

const newMarginBlock = `let marginUSD = 12.00;
    try {
      const bal = await deltaExchange.getWalletBalance();
      if (bal && bal.availableUSD > 0) {
        // High impact lot sizing: Target $10-$18 margin ($300-$540 notional @ 30x)
        marginUSD = Math.max(8.00, Math.min(18.00, parseFloat((bal.availableUSD * 0.50).toFixed(2))));
      }
    } catch (e) {
      marginUSD = 12.00;
    }`;

if (oldMarginBlock.test(engineCode)) {
  engineCode = engineCode.replace(oldMarginBlock, newMarginBlock);
} else {
  engineCode = engineCode.replace('let marginUSD = 3.00;', 'let marginUSD = 12.00;');
  engineCode = engineCode.replace('marginUSD = Math.max(1.00, Math.min(5.00, parseFloat((bal.availableUSD * 0.35).toFixed(2))));', 'marginUSD = Math.max(8.00, Math.min(18.00, parseFloat((bal.availableUSD * 0.50).toFixed(2))));');
}

fs.writeFileSync('lib/deltaAutoTraderEngine.ts', engineCode);
console.log('Updated deltaAutoTraderEngine.ts with high-impact lot sizing ($10-$18 margin)');

// 2. Update deltaExchangeEngine.ts: remove 1-lot downgrade fallback
let exchangeCode = fs.readFileSync('lib/deltaExchangeEngine.ts', 'utf8');

// Replace the fallback that forced size: 1
const oldRetry1Contract = /if \(cleanErrMsg\.includes\('insufficient_margin'\) && contracts > 1\) \{[\s\S]*?size: 1,[\s\S]*?\}\);[\s\S]*?\} else if \(cleanErrMsg\.includes\('immediate_liquidation'\)\) \{/;

const newRetrySizing = `if (cleanErrMsg.includes('insufficient_margin') && contracts > 5) {
                const reducedContracts = Math.max(Math.floor(contracts * 0.6), 5);
                console.warn(\`⚠️ Insufficient margin for \${contracts} contracts on \${deltaSymbol}. Retrying with \${reducedContracts} contracts...\`);
                res = await this.request('POST', '/v2/orders', {}, {
                  product_symbol: deltaSymbol,
                  size: reducedContracts,
                  side: params.side.toLowerCase(),
                  order_type: 'market_order',
                });
              } else if (cleanErrMsg.includes('immediate_liquidation')) {`;

if (oldRetry1Contract.test(exchangeCode)) {
  exchangeCode = exchangeCode.replace(oldRetry1Contract, newRetrySizing);
  fs.writeFileSync('lib/deltaExchangeEngine.ts', exchangeCode);
  console.log('Updated deltaExchangeEngine.ts to avoid tiny 1-contract sizing');
} else {
  console.log('Could not find 1-contract regex match in deltaExchangeEngine.ts, checking manual replace');
  exchangeCode = exchangeCode.replace('size: 1,', 'size: Math.max(Math.floor(contracts * 0.6), 5),');
  fs.writeFileSync('lib/deltaExchangeEngine.ts', exchangeCode);
}
