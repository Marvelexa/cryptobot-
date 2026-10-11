const fs = require('fs');

// 1. Update deltaAutoTraderEngine.ts
let engineCode = fs.readFileSync('lib/deltaAutoTraderEngine.ts', 'utf8');
const oldMarginBlock = /let marginUSD = 8\.0;[\r\n\s]+try \{[\r\n\s]+const bal = await deltaExchange\.getWalletBalance\(\);[\r\n\s]+if \(bal && bal\.availableUSD > 0\) \{[\r\n\s]+\/\/ Safe margin: 40% of available free balance or \$10, whichever is smaller, min \$5[\r\n\s]+marginUSD = Math\.max\(5, Math\.min\(10, Math\.floor\(bal\.availableUSD \* 0\.4\)\)\);[\r\n\s]+\}[\r\n\s]+\} catch \(e\) \{[\r\n\s]+marginUSD = 7\.0;[\r\n\s]+\}/;

const newMarginBlock = `let marginUSD = 0.50;
    try {
      const bal = await deltaExchange.getWalletBalance();
      if (bal && bal.availableUSD > 0) {
        // Micro-margin: 25% of available balance, max $1.00, min $0.20
        marginUSD = Math.max(0.20, Math.min(1.00, parseFloat((bal.availableUSD * 0.25).toFixed(2))));
      }
    } catch (e) {
      marginUSD = 0.50;
    }`;

if (oldMarginBlock.test(engineCode)) {
  engineCode = engineCode.replace(oldMarginBlock, newMarginBlock);
  fs.writeFileSync('lib/deltaAutoTraderEngine.ts', engineCode);
  console.log('Successfully updated deltaAutoTraderEngine.ts with micro-margin');
} else {
  console.log('Regex did not match, using fallback string replacement');
  engineCode = engineCode.replace('marginUSD = Math.max(5, Math.min(10, Math.floor(bal.availableUSD * 0.4)));', 'marginUSD = Math.max(0.20, Math.min(1.00, parseFloat((bal.availableUSD * 0.25).toFixed(2))));');
  engineCode = engineCode.replace('let marginUSD = 8.0;', 'let marginUSD = 0.50;');
  engineCode = engineCode.replace('marginUSD = 7.0;', 'marginUSD = 0.50;');
  fs.writeFileSync('lib/deltaAutoTraderEngine.ts', engineCode);
  console.log('Fallback string replacement applied');
}

// 2. Update deltaExchangeEngine.ts to retry with 1 contract on insufficient_margin
let exchangeCode = fs.readFileSync('lib/deltaExchangeEngine.ts', 'utf8');

const oldCleanErr = `if (cleanErrMsg.includes('immediate_liquidation')) {`;
const newCleanErr = `if (cleanErrMsg.includes('insufficient_margin') && contracts > 1) {
                console.warn(\`⚠️ Insufficient margin for \${contracts} contracts on \${deltaSymbol}. Retrying with minimum 1 contract...\`);
                res = await this.request('POST', '/v2/orders', {}, {
                  product_symbol: deltaSymbol,
                  size: 1,
                  side: params.side.toLowerCase(),
                  order_type: 'market_order',
                });
              } else if (cleanErrMsg.includes('immediate_liquidation')) {`;

if (exchangeCode.includes(oldCleanErr)) {
  exchangeCode = exchangeCode.replace(oldCleanErr, newCleanErr);
  fs.writeFileSync('lib/deltaExchangeEngine.ts', exchangeCode);
  console.log('Successfully updated deltaExchangeEngine.ts with 1-contract retry');
}
