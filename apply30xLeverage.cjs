const fs = require('fs');

// 1. Update lib/deltaAutoTraderEngine.ts
let engineCode = fs.readFileSync('lib/deltaAutoTraderEngine.ts', 'utf8');

// Update initial state leverage: 25 -> 30
engineCode = engineCode.replace(/leverage:\s*25,/, 'leverage: 30,');

// Update marginUSD calculation to balanced size with 30x leverage
const oldMargin = /let marginUSD = 0\.50;[\r\n\s]+try \{[\r\n\s]+const bal = await deltaExchange\.getWalletBalance\(\);[\r\n\s]+if \(bal && bal\.availableUSD > 0\) \{[\r\n\s]+\/\/ Micro-margin: 25% of available balance, max \$1\.00, min \$0\.20[\r\n\s]+marginUSD = Math\.max\(0\.20, Math\.min\(1\.00, parseFloat\(\(bal\.availableUSD \* 0\.25\)\.toFixed\(2\)\)\)\);[\r\n\s]+\}[\r\n\s]+\} catch \(e\) \{[\r\n\s]+marginUSD = 0\.50;[\r\n\s]+\}/;

const newMargin = `let marginUSD = 3.00;
    try {
      const bal = await deltaExchange.getWalletBalance();
      if (bal && bal.availableUSD > 0) {
        // Balanced sizing with 30x leverage: 35% of available balance, max $5.00, min $1.00
        marginUSD = Math.max(1.00, Math.min(5.00, parseFloat((bal.availableUSD * 0.35).toFixed(2))));
      }
    } catch (e) {
      marginUSD = 3.00;
    }`;

if (oldMargin.test(engineCode)) {
  engineCode = engineCode.replace(oldMargin, newMargin);
} else {
  // Direct replacements if needed
  engineCode = engineCode.replace('let marginUSD = 0.50;', 'let marginUSD = 3.00;');
  engineCode = engineCode.replace('marginUSD = 0.50;', 'marginUSD = 3.00;');
}

fs.writeFileSync('lib/deltaAutoTraderEngine.ts', engineCode);
console.log('Updated deltaAutoTraderEngine.ts with 30x leverage and balanced margin');

// 2. Update lib/deltaExchangeEngine.ts
let exchangeCode = fs.readFileSync('lib/deltaExchangeEngine.ts', 'utf8');
exchangeCode = exchangeCode.replace(/ensureProductsLeverage\(25\)/g, 'ensureProductsLeverage(30)');
exchangeCode = exchangeCode.replace(/ensureProductsLeverage\(leverage: number = 25\)/g, 'ensureProductsLeverage(leverage: number = 30)');
fs.writeFileSync('lib/deltaExchangeEngine.ts', exchangeCode);
console.log('Updated deltaExchangeEngine.ts with 30x leverage synchronization');

// 3. Update state file if exists
if (fs.existsSync('.delta_auto_trader_state.json')) {
  try {
    const state = JSON.parse(fs.readFileSync('.delta_auto_trader_state.json', 'utf8'));
    state.leverage = 30;
    if (Array.isArray(state.activePositions)) {
      state.activePositions.forEach(p => { p.leverage = 30; });
    }
    fs.writeFileSync('.delta_auto_trader_state.json', JSON.stringify(state, null, 2));
    console.log('Updated .delta_auto_trader_state.json with 30x leverage');
  } catch (e) {
    console.warn('State file update note:', e.message);
  }
}

// 4. Update UI labels in src/components/DeltaAutoTraderCard.tsx
if (fs.existsSync('src/components/DeltaAutoTraderCard.tsx')) {
  let uiCode = fs.readFileSync('src/components/DeltaAutoTraderCard.tsx', 'utf8');
  uiCode = uiCode.replace(/25x Iso/g, '30x Iso');
  uiCode = uiCode.replace(/\{pos\.side\}\s+25x/g, '{pos.side} {pos.leverage || 30}x');
  fs.writeFileSync('src/components/DeltaAutoTraderCard.tsx', uiCode);
  console.log('Updated DeltaAutoTraderCard.tsx UI labels to 30x');
}
