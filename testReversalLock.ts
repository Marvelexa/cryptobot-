import { deltaAutoTrader } from './lib/deltaAutoTraderEngine.ts';
import { DeltaPosition } from './src/types.ts';

async function testReversalLock() {
  console.log('Testing $2.50 Profit Milestone ➔ Market Reversal ➔ $2.30 SL Lock (0ms delay)...');

  // Create a synthetic BUY position
  const entryPrice = 10.00;
  const quantity = 100; // 100 AVAX, so $0.01 price move = $1.00 USD PnL
  const notionalUSD = entryPrice * quantity; // $1000

  const pos: DeltaPosition = {
    id: 'test-reversal-pos-' + Date.now(),
    symbol: 'AVAXUSD',
    side: 'BUY',
    entryPrice: 10.00,
    currentPrice: 10.00,
    quantity: 100,
    marginUSD: 50,
    notionalUSD: 1000,
    leverage: 20,
    takeProfitPrice: 10.06, // $6 profit target
    stopLossPrice: 9.97,    // $3 max loss
    initialStopLossPrice: 9.97,
    atr: 0.05,
    isBreakevenLocked: false,
    pnlUSD: 0,
    pnlPercent: 0,
    entryTime: Date.now(),
    strategyName: 'Test Strategy',
    shadowConfirmedSeconds: 0,
  };

  // Add to active positions
  (deltaAutoTrader as any).state.activePositions = [pos];

  // Step 1: Price rises to $10.02 (Profit = +$2.00) -> Below $2.50 threshold
  await deltaAutoTrader.evaluatePositionSLTP(pos, 10.02, 0);
  console.log(`Step 1 (Price=$10.02): PnL=$${pos.pnlUSD}, HighestPnL=$${pos.highestPnlUSD}, LockArmed=${pos.isProfitLockArmed}, SL=$${pos.stopLossPrice}`);

  // Step 2: Price hits $10.026 (Profit = +$2.60) -> Crosses $2.50 threshold!
  await deltaAutoTrader.evaluatePositionSLTP(pos, 10.026, 0);
  console.log(`Step 2 (Price=$10.026): PnL=$${pos.pnlUSD}, HighestPnL=$${pos.highestPnlUSD}, LockArmed=${pos.isProfitLockArmed}, SL=$${pos.stopLossPrice}`);

  // Step 3: Market starts reversing: Price drops to $10.024 (Profit drops by >= $0.05 from peak $2.60 down to $2.40)
  await deltaAutoTrader.evaluatePositionSLTP(pos, 10.024, 0);
  console.log(`Step 3 (Price=$10.024, Pullback): PnL=$${pos.pnlUSD}, LockArmed=${pos.isProfitLockArmed}, SL=$${pos.stopLossPrice}, IsBreakevenLocked=${pos.isBreakevenLocked}`);

  // Step 4: Price drops to $10.023 (Exact +$2.30 profit line hit!)
  await deltaAutoTrader.evaluatePositionSLTP(pos, 10.023, 0);
  console.log(`Step 4 (Price=$10.023, At Lock Level): ActivePositions=${(deltaAutoTrader as any).state.activePositions.length}`);

  const history = (deltaAutoTrader as any).closedTradesHistory;
  const lastTrade = history[0];
  console.log(`\nClosed Trade Verification:`);
  console.log(`Exit Reason: ${lastTrade?.exitReason}`);
  console.log(`Realized PnL: $${lastTrade?.pnlUSD}`);
  console.log(`Exit Price: $${lastTrade?.exitPrice}`);

  if (lastTrade?.exitReason === 'REVERSAL_PROFIT_LOCKED' && lastTrade?.pnlUSD >= 2.29) {
    console.log('✅ TEST PASSED: Reversal Lock successfully triggered with 0ms delay at +$2.30!');
  } else {
    console.log('❌ TEST FAILED: Check logs.');
  }
}

testReversalLock();
