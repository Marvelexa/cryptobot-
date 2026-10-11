const fs = require('fs');
const state = JSON.parse(fs.readFileSync('.delta_auto_trader_state.json', 'utf8'));
console.log('--- LIVE PROOF OF ACTIVE POSITION ---');
console.log('Total Active Positions:', state.activePositions.length);
for (const p of state.activePositions) {
  console.log('SYMBOL      :', p.symbol);
  console.log('SIDE        :', p.side);
  console.log('ENTRY PRICE :', p.entryPrice);
  console.log('CURRENT PRIC:', p.currentPrice);
  console.log('PNL USD     :', p.pnlUSD);
  console.log('TAKE PROFIT :', p.takeProfitPrice);
  console.log('STOP LOSS   :', p.stopLossPrice);
  console.log('STRATEGY    :', p.strategyName);
}
