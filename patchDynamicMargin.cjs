const fs = require('fs');
let code = fs.readFileSync('lib/deltaAutoTraderEngine.ts', 'utf8');

const oldMargin = `      let marginUSD = 8.0;
      try {
        const bal = await deltaExchange.getWalletBalance();
        if (bal && bal.availableUSD > 0) {
          // Safe margin: 40% of available free balance or $10, whichever is smaller, min $5
          marginUSD = Math.max(5, Math.min(10, Math.floor(bal.availableUSD * 0.4)));
        }
      } catch (e) {
        marginUSD = 7.0;
      }`;

const newMargin = `      let marginUSD = 5.0;
      try {
        const bal = await deltaExchange.getWalletBalance();
        if (bal && bal.availableUSD > 0) {
          // Dynamic margin: up to $10, or 65% of available balance to avoid insufficient_margin
          marginUSD = Math.min(10, Math.max(0.5, parseFloat((bal.availableUSD * 0.65).toFixed(2))));
        }
      } catch (e) {
        marginUSD = 2.0;
      }`;

code = code.replace(oldMargin, newMargin);
fs.writeFileSync('lib/deltaAutoTraderEngine.ts', code);
console.log('Dynamic margin sizing applied');
