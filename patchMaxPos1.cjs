const fs = require('fs');

let code = fs.readFileSync('lib/deltaAutoTraderEngine.ts', 'utf8');

// 1. Change maxConcurrentPositions to 1
code = code.replace(/this\.state\.maxConcurrentPositions = 2;/g, 'this.state.maxConcurrentPositions = 1;');
code = code.replace(/this\.state\.maxConcurrentPositions = config\.maxConcurrentPositions;/g, 'this.state.maxConcurrentPositions = 1;');
code = code.replace(/const maxTrades = this\.state\.maxConcurrentPositions \|\| 2;/g, 'const maxTrades = this.state.maxConcurrentPositions || 1;');
code = code.replace(/const maxPositionsAllowed = this\.state\.maxConcurrentPositions \|\| 2;/g, 'const maxPositionsAllowed = this.state.maxConcurrentPositions || 1;');

// 2. Change dynamic margin calculation to use 90% of free cash for 1 trade
const oldMarginBlock = `      // Select optimal high margin: up to 48% of free balance per slot (approx ,12,300 - ,12,400 INR per trade)
      let marginUSD = Math.min(
        availableUSD * 0.48, // Up to 48% of free cash per trade
        Math.max(10.00, Math.min(baseMarginPerSlot, dynamicMarginFromAvailable))
      );`;

const newMarginBlock = `      // Select optimal high margin: up to 90% of free balance for 1 trade
      let marginUSD = Math.min(
        availableUSD * 0.90, // Up to 90% of free cash per trade since it's 1 trade
        Math.max(10.00, Math.min(baseMarginPerSlot, dynamicMarginFromAvailable))
      );`;

// Let's just do a regex replace to be safe
code = code.replace(/availableUSD \* 0\.48/g, 'availableUSD * 0.90');

fs.writeFileSync('lib/deltaAutoTraderEngine.ts', code);
console.log('Fixed max trades to 1 and increased margin utilization to 90%');
