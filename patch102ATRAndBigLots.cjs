const fs = require('fs');

// 1. Update lib/deltaAutoTraderEngine.ts
let engineCode = fs.readFileSync('lib/deltaAutoTraderEngine.ts', 'utf8');

// Replace targetMult with 1.02
engineCode = engineCode.replace(
  /const targetMult = 1\.30; \/\/ FLAT 1\.3x ATR TP for ALL coins/g,
  'const targetMult = 1.02; // FLAT 1.02x ATR TP for ALL coins'
);
engineCode = engineCode.replace(
  /const targetMult = params\.candidate\.targetMult \|\| 1\.30;/g,
  'const targetMult = params.candidate.targetMult || 1.02;'
);

// High impact lot sizing: $28-$30 margin (~$840-$900+ notional @ 30x leverage)
const oldMarginBlockRegex = /let marginUSD = 12\.00;[\s\S]*?const notionalUSD = marginUSD \* this\.state\.leverage;/;
const newMarginBlock = `let marginUSD = 28.00;
    try {
      const bal = await deltaExchange.getWalletBalance();
      if (bal && bal.availableUSD > 0) {
        // High impact lot sizing: Target $24-$30 margin (~$720-$900+ notional @ 30x)
        marginUSD = Math.max(22.00, Math.min(30.00, parseFloat((bal.availableUSD * 0.25).toFixed(2))));
        if (bal.availableUSD < 25.00) {
          marginUSD = Math.max(10.00, parseFloat((bal.availableUSD * 0.80).toFixed(2)));
        }
      }
    } catch (e) {
      marginUSD = 28.00;
    }
    const notionalUSD = marginUSD * this.state.leverage;`;

if (oldMarginBlockRegex.test(engineCode)) {
  engineCode = engineCode.replace(oldMarginBlockRegex, newMarginBlock);
  console.log('✓ Updated marginUSD to big lot sizing ($28-$30 margin, ~$840-$900 notional)');
} else {
  console.log('✗ oldMarginBlockRegex not matched');
}

fs.writeFileSync('lib/deltaAutoTraderEngine.ts', engineCode, 'utf8');
console.log('✓ Successfully updated lib/deltaAutoTraderEngine.ts with 1.02 ATR and Big Lots');

// 2. Update UI component src/components/DeltaAutoTraderCard.tsx
let uiCode = fs.readFileSync('src/components/DeltaAutoTraderCard.tsx', 'utf8');
uiCode = uiCode.replace(/Target TP \(1\.3x ATR\)/g, 'Target TP (1.02x ATR)');
uiCode = uiCode.replace(/Dynamic 1\.3x ATR/g, 'Dynamic 1.02x ATR');
fs.writeFileSync('src/components/DeltaAutoTraderCard.tsx', uiCode, 'utf8');
console.log('✓ Successfully updated src/components/DeltaAutoTraderCard.tsx');

// 3. Update existing active positions in .delta_auto_trader_state.json with 1.02 ATR TP
const state = JSON.parse(fs.readFileSync('.delta_auto_trader_state.json', 'utf8'));
for (const pos of state.activePositions) {
  const atr = pos.atr || 0;
  if (atr > 0 && pos.entryPrice > 0) {
    const oldTP = pos.takeProfitPrice;
    if (pos.side === 'BUY') {
      pos.takeProfitPrice = parseFloat((pos.entryPrice + 1.02 * atr).toFixed(4));
    } else {
      pos.takeProfitPrice = parseFloat((pos.entryPrice - 1.02 * atr).toFixed(4));
    }
    console.log(`Updated TP for ${pos.symbol} (${pos.side}): ${oldTP} -> ${pos.takeProfitPrice} (1.02 ATR)`);
  }
}
fs.writeFileSync('.delta_auto_trader_state.json', JSON.stringify(state, null, 2), 'utf8');
console.log('✓ Successfully updated active positions in state file to 1.02x ATR');
