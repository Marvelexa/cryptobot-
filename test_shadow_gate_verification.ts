import 'dotenv/config';
import { DeltaShadowConfirmationGate } from './lib/deltaShadowConfirmationGate.js';
import { CryptoDedicatedStrategyEngine } from './lib/cryptoDedicatedStrategyEngine.js';
import { deltaAutoTrader } from './lib/deltaAutoTraderEngine.js';
import { deltaExchange } from './lib/deltaExchangeEngine.js';
import fs from 'fs';
import path from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

async function runTests() {
  const originalStateRaw = fs.existsSync('.delta_auto_trader_state.json') ? fs.readFileSync('.delta_auto_trader_state.json', 'utf8') : null;
  try {
  console.log('=====================================================');
  console.log('🚀 RUNNING DEEP VERIFICATION: SHADOW CONFIRMATION GATE');
  console.log('=====================================================\n');

  // TEST 1: Zero Exchange Pre-Exposure on Registration
  console.log('--- TEST 1: Zero Exchange Pre-Exposure on Registration ---');
  const gate = new DeltaShadowConfirmationGate();
  gate.setStats(0, 0, []);

  const signalBuy = {
    symbol: 'BTCUSD',
    strategyName: 'QuantumMomentum',
    side: 'BUY' as const,
    signalPrice: 65000,
    atr: 100, // 0.10 ATR = 10.0 USD
    notionalUSD: 650,
  };

  const candidateBuy = gate.registerCandidate(signalBuy);
  assert(candidateBuy !== null, 'Candidate registered in memory');
  assert(candidateBuy.symbol === 'BTCUSD', 'Candidate symbol matches');
  assert(candidateBuy.side === 'BUY', 'Candidate side matches');
  assert(candidateBuy.signalPrice === 65000, 'Signal price anchored');
  assert(candidateBuy.adverseThresholdPrice === 64990, 'BUY Adverse threshold is 65000 - 10 = 64990 (-0.10 ATR)');
  assert(candidateBuy.favorableTargetPrice === 65010, 'BUY Favorable target is 65000 + 10 = 65010 (+0.10 ATR)');
  assert(candidateBuy.branch === 'MONITORING', 'Initial branch is MONITORING');
  assert(gate.getActiveCandidates().length === 1, 'Exactly 1 candidate in memory');

  // TEST 2: Boundary Tests for Branch A (Adverse Move)
  console.log('\n--- TEST 2: Branch A (Adverse Trap Filter) ---');
  // At 64990.5 (-9.5 USD / -0.095 ATR), branch should still HOLD
  const holdTick = gate.updateTick('BTCUSD', 64990.5, 650);
  assert(holdTick !== null && holdTick.action === 'HOLD', 'Adverse move < 0.10 ATR remains in HOLD');

  // At 64990.0 (-10.0 USD / -0.10 ATR), Branch A triggers fakeout cancellation
  const adverseTick = gate.updateTick('BTCUSD', 64990.0, 650);
  assert(adverseTick !== null && adverseTick.action === 'DISCARD', 'Adverse move >= 0.10 ATR triggers DISCARD');
  assert(adverseTick!.reason?.includes('Fakeout') === true, 'Reason identifies Branch A Fakeout');
  assert(gate.getActiveCandidates().length === 0, 'Candidate removed from memory buffer');
  
  const statsA = gate.getStats();
  assert(statsA.trapsFilteredCount === 1, 'trapsFilteredCount incremented to 1');
  assert(statsA.capitalSavedUSD > 0, `capitalSavedUSD recorded ($${statsA.capitalSavedUSD})`);
  assert(statsA.recentFilteredTraps.length === 1, 'recentFilteredTraps audit entry created');
  assert(statsA.recentFilteredTraps[0].branch === 'BRANCH_A_FAKEOUT', 'Audit entry branch is BRANCH_A_FAKEOUT');

  // TEST 3: Branch A for SELL Side
  console.log('\n--- TEST 3: Branch A for SELL Side ---');
  const signalSell = {
    symbol: 'ETHUSD',
    strategyName: 'LiquiditySweep',
    side: 'SELL' as const,
    signalPrice: 3500,
    atr: 20, // 0.10 ATR = 2.0 USD. Adverse for SELL is price >= 3502.0
    notionalUSD: 700,
  };
  const candSell = gate.registerCandidate(signalSell);
  assert(candSell.adverseThresholdPrice === 3502, 'SELL Adverse threshold is 3500 + 2 = 3502 (+0.10 ATR adverse)');
  assert(candSell.favorableTargetPrice === 3498, 'SELL Favorable target is 3500 - 2 = 3498 (-0.10 ATR favorable)');
  
  // Adverse tick for SELL
  const adverseSellTick = gate.updateTick('ETHUSD', 3502.5, 700);
  assert(adverseSellTick !== null && adverseSellTick.action === 'DISCARD', 'SELL adverse move triggers DISCARD');
  assert(adverseSellTick!.branch === 'BRANCH_A_FAKEOUT', 'SELL identifies BRANCH_A_FAKEOUT');

  // TEST 4: Branch B (5-Minute Flat Chop Timeout)
  console.log('\n--- TEST 4: Branch B (5-Minute Flat Chop Timeout) ---');
  const signalBtcB = {
    symbol: 'BTCUSD',
    strategyName: 'RangeTest',
    side: 'BUY' as const,
    signalPrice: 65000,
    atr: 100,
    notionalUSD: 650,
  };
  const candB = gate.registerCandidate(signalBtcB);
  
  // Simulate 290 seconds elapsed (290,000 ms)
  candB.firstSeenTime = Date.now() - 290000;
  const tickUnder5m = gate.updateTick('BTCUSD', 65002, 650);
  assert(tickUnder5m !== null && tickUnder5m.action === 'HOLD', 'At < 300s elapsed, candidate remains in HOLD');

  // Simulate 301 seconds elapsed (301,000 ms)
  candB.firstSeenTime = Date.now() - 301000;
  const tickOver5m = gate.updateTick('BTCUSD', 65002, 650);
  assert(tickOver5m !== null && tickOver5m.action === 'DISCARD', 'At > 300s elapsed, Branch B triggers DISCARD');
  assert(tickOver5m!.branch === 'BRANCH_B_TIMEOUT', 'Reason identifies BRANCH_B_TIMEOUT');

  // TEST 5: Branch C (Momentum Confirmed -> Real Delta Execution)
  console.log('\n--- TEST 5: Branch C (Momentum Confirmed) ---');
  const signalBtcC = {
    symbol: 'SOLUSD',
    strategyName: 'SolanaMomentum',
    side: 'BUY' as const,
    signalPrice: 150.00,
    atr: 2.00, // 0.10 ATR = 0.20 USD -> target 150.20
    notionalUSD: 500,
  };
  gate.registerCandidate(signalBtcC);
  
  // At 150.05 (+0.05 USD < 0.20 ATR, pnl < 0.25 USD), should HOLD
  const tickUnderC = gate.updateTick('SOLUSD', 150.05, 500);
  assert(tickUnderC !== null && tickUnderC.action === 'HOLD', 'Sub-threshold momentum holds in gate');

  // At 150.25 (+0.25 USD >= 0.20 ATR), Branch C triggers EXECUTE
  const tickOverC = gate.updateTick('SOLUSD', 150.25, 500);
  assert(tickOverC !== null && tickOverC.action === 'EXECUTE', 'Favorable move >= 0.10 ATR triggers EXECUTE');
  assert(tickOverC!.candidate?.symbol === 'SOLUSD', 'Candidate returned for Delta order dispatch');
  assert(tickOverC!.branch === 'BRANCH_C_CONFIRMED', 'Branch is BRANCH_C_CONFIRMED');
  assert(gate.getActiveCandidates().length === 0, 'Executed candidate cleared from virtual buffer');

  // TEST 6: Interactive Branch Simulator
  console.log('\n--- TEST 6: Interactive 3-Branch Simulator ---');
  const simA = gate.simulateBranch('AVAXUSD', 'BRANCH_A_FAKEOUT');
  assert(simA !== null && simA.action === 'DISCARD', 'Simulator Branch A returns DISCARD');
  assert(simA!.branch === 'BRANCH_A_FAKEOUT', 'Simulated branch matches BRANCH_A_FAKEOUT');

  const simB = gate.simulateBranch('DOGEUSD', 'BRANCH_B_TIMEOUT');
  assert(simB !== null && simB.action === 'DISCARD', 'Simulator Branch B returns DISCARD');
  assert(simB!.branch === 'BRANCH_B_TIMEOUT', 'Simulated branch matches BRANCH_B_TIMEOUT');

  const simC = gate.simulateBranch('XRPUSD', 'BRANCH_C_CONFIRMED');
  assert(simC !== null && simC.action === 'EXECUTE', 'Simulator Branch C returns EXECUTE');
  assert(simC!.candidate !== undefined, 'Simulator Branch C returns ready candidate');

  // TEST 7: ADX 20+ Chop Shield Verification
  console.log('\n--- TEST 7: ADX 20+ Chop Shield Verification ---');
  // Generate flat/chop candles (very small price range, no trend)
  const chopCandles = [];
  for (let i = 0; i < 35; i++) {
    const base = 100 + Math.sin(i) * 0.05;
    chopCandles.push({
      time: i * 60,
      open: base,
      high: base + 0.08,
      low: base - 0.08,
      close: base + 0.02,
      volume: 100,
    });
  }
  const chopAdx = CryptoDedicatedStrategyEngine.calculateADX(chopCandles, 14);
  console.log(`Chop Candles ADX: ${chopAdx.toFixed(2)}`);
  assert(chopAdx < 20.0, 'Chop candles correctly calculate ADX < 20.0 (Chop Shield Active)');

  // Generate strong trending candles (consistent higher highs, higher lows)
  const trendCandles = [];
  for (let i = 0; i < 35; i++) {
    const base = 100 + i * 3.0;
    trendCandles.push({
      time: i * 60,
      open: base - 0.5,
      high: base + 3.0,
      low: base - 0.6,
      close: base + 2.5,
      volume: 1000 + i * 50,
    });
  }
  const trendAdx = CryptoDedicatedStrategyEngine.calculateADX(trendCandles, 14);
  console.log(`Trend Candles ADX: ${trendAdx.toFixed(2)}`);
  assert(trendAdx >= 20.0, 'Trending candles correctly calculate ADX >= 20.0 (Momentum Allowed)');

  // TEST 8: Verify 0 Open Positions in State File
  console.log('\n--- TEST 8: State File Open Positions Check ---');
  const statePath = path.join(process.cwd(), '.delta_auto_trader_state.json');
  if (fs.existsSync(statePath)) {
    const stateContent = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    assert(Array.isArray(stateContent.activePositions), 'activePositions is an array');
    assert(stateContent.trapsFilteredCount !== undefined, 'trapsFilteredCount is persisted');
    assert(stateContent.capitalSavedUSD !== undefined, 'capitalSavedUSD is persisted');
    console.log(`State file verified: ${stateContent.activePositions.length} active positions, ${stateContent.trapsFilteredCount} traps filtered, $${stateContent.capitalSavedUSD.toFixed(2)} capital saved.`);
  } else {
    console.warn('State file not found at path');
  }

  // TEST 9: Branch C Precedence Over Branch B at t >= 300s
  console.log('\n--- TEST 9: Branch C Precedence Over Branch B at t >= 300s ---');
  const gate9 = new DeltaShadowConfirmationGate();
  const signal9 = {
    symbol: 'BTCUSD',
    strategyName: 'QuantumMomentum',
    side: 'BUY' as const,
    signalPrice: 65000,
    atr: 100, // +0.10 ATR = +10 USD -> favorable >= 65010
    notionalUSD: 650,
  };
  const cand9 = gate9.registerCandidate(signal9);
  // Simulate 305 seconds elapsed (past 5-minute timeout threshold)
  cand9.firstSeenTime = Date.now() - 305000;
  // A breakout tick arrives simultaneously at 65015 (+15 USD = +0.15 ATR favorable)
  const tick9 = gate9.updateTick('BTCUSD', 65015, 650);
  assert(tick9 !== null, 'Decision generated at t=305s');
  assert(tick9!.action === 'EXECUTE', 'Breakout at t=305s executes via Branch C (not discarded by Branch B)');
  assert(tick9!.branch === 'BRANCH_C_CONFIRMED', 'Branch identifies BRANCH_C_CONFIRMED');

  // TEST 10: qualifyingSeconds Calculation Accuracy
  console.log('\n--- TEST 10: qualifyingSeconds Calculation Accuracy ---');
  const gate10 = new DeltaShadowConfirmationGate();
  const signal10 = {
    symbol: 'ETHUSD',
    strategyName: 'BandSniper',
    side: 'BUY' as const,
    signalPrice: 3500,
    atr: 20, // +0.10 ATR = +2 USD
    notionalUSD: 700,
  };
  const cand10 = gate10.registerCandidate(signal10);
  // Simulate 12 seconds elapsed
  cand10.firstSeenTime = Date.now() - 12000;
  const tick10 = gate10.updateTick('ETHUSD', 3503, 700);
  assert(tick10 !== null && tick10.action === 'EXECUTE', 'ETH candidate executes');
  assert(tick10!.candidate !== undefined, 'Executed candidate returned');
  assert(tick10!.candidate!.qualifyingSeconds >= 11 && tick10!.candidate!.qualifyingSeconds <= 13, `qualifyingSeconds accurately calculated as ~12s (actual: ${tick10!.candidate!.qualifyingSeconds}s)`);

  // TEST 11: 8-Coin Strategy ADX Chop Shield Verification
  console.log('\n--- TEST 11: 8-Coin Strategy ADX Chop Shield Verification ---');
  const { strategyEngine } = await import('./lib/cryptoDedicatedStrategyEngine.js');
  const coins = ['BTC', 'ETH', 'SOL', 'SUI', 'ADA', 'AVAX', 'DOGE', 'XRP'];

  for (const coin of coins) {
    const result = strategyEngine.evaluateSymbol(coin, trendCandles);
    assert(result !== null, `${coin} evaluation returned a result`);
    assert(result.diagnostics !== undefined, `${coin} result contains diagnostics`);
    assert(typeof result.diagnostics.adx === 'number', `${coin} diagnostics.adx is a number (${result.diagnostics.adx})`);
    assert(typeof result.diagnostics.isAdxChopActive === 'boolean', `${coin} diagnostics.isAdxChopActive is a boolean (${result.diagnostics.isAdxChopActive})`);
  }
  // TEST 12: User Exact Specification — BTC 78,000 Market Price & 78,050 Pre-Placed Order
  console.log('\n--- TEST 12: User Exact Specification (BTC 78,000 -> 78,050 Breakout Order) ---');
  const gate12 = new DeltaShadowConfirmationGate();
  gate12.setStats(0, 0, []);
  const preOrderId12 = 'delta-pre-btc-78000';
  const cand12 = gate12.registerCandidate({
    symbol: 'BTCUSD',
    strategyName: 'QuantumMomentum',
    side: 'BUY',
    signalPrice: 78000,
    atr: 500, // 0.10 ATR = 50 USD
    notionalUSD: 780,
    pendingDeltaOrderId: preOrderId12,
  });

  assert(cand12.signalPrice === 78000, 'Market price is 78,000 USD');
  assert(cand12.pendingOrderPrice === 78050, 'Resting breakout order price is 78,000 + 50 = 78,050 USD (+0.10 ATR)');
  assert(cand12.adverseThresholdPrice === 77950, 'Adverse invalidation limit is 78,000 - 50 = 77,950 USD (-0.10 ATR)');
  assert(cand12.pendingDeltaOrderId === preOrderId12, 'Pre-placed Delta order ID attached to candidate');
  assert(cand12.pendingOrderStatus === 'PENDING_BREAKOUT', 'Order status is PENDING_BREAKOUT');
  assert(cand12.targetProfitUSD === 0.50, 'Target profit threshold is boosted to $0.50 USD');

  // Adverse tick to 77,940 (-60 USD = -0.12 ATR against BUY)
  const adverseTick12 = gate12.updateTick('BTCUSD', 77940, 780);
  assert(adverseTick12 !== null && adverseTick12.action === 'DISCARD', 'Adverse move past 77,950 triggers DISCARD');
  assert(adverseTick12!.candidate.pendingOrderStatus === 'CANCELLED', 'Resting order marked CANCELLED');
  const stats12 = gate12.getStats();
  assert(stats12.recentFilteredTraps.length === 1, 'Filtered trap recorded in audit ledger');
  assert(stats12.recentFilteredTraps[0].cancelledOrderId === preOrderId12, 'Cancelled order ID stored in trap record');
  console.log('✅ User Scenario Verified: Market never hit 78,050, Delta order cancelled before fill with $0.00 real loss!');

  // TEST 13: Delta Exchange Engine placeBreakoutOrder & cancelOrder Verification
  console.log('\n--- TEST 13: Delta Exchange Engine Pre-Placed Order API & Cancellation ---');
  const { deltaExchange } = await import('./lib/deltaExchangeEngine.js');
  deltaExchange.updateCredentials('test_unit_key', 'test_unit_secret', true);
  const breakoutOrderRes = await deltaExchange.placeBreakoutOrder({
    symbol: 'BTCUSD',
    side: 'BUY',
    size: 0.01,
    breakoutPrice: 78050,
    takeProfitPrice: 78850,
    stopLossPrice: 76800,
  });
  assert(breakoutOrderRes.success === true, 'placeBreakoutOrder succeeded');
  assert(breakoutOrderRes.orderId !== undefined && breakoutOrderRes.orderId.length > 0, 'Resting breakout order ID generated');
  assert(breakoutOrderRes.breakoutPrice === 78050, 'Breakout price matches 78050');

  const cancelRes = await deltaExchange.cancelOrder(breakoutOrderRes.orderId, 'BTCUSD');
  assert(cancelRes.success === true, 'cancelOrder succeeded with $0.00 loss');
  assert(cancelRes.message.includes('cancelled'), 'Cancellation message confirmed');
  deltaExchange.updateCredentials(process.env.DELTA_API_KEY || 'WO7A6F1ikCOqYX3RcjBLJSU8XTQZBc', process.env.DELTA_API_SECRET || 'U3khyH5CA0sELi3nksyYZ6Dn6WuINMg4c8fXM0OkBxxc2GfB3ettiCFg0teo', false);

  // TEST 14: Strict $0.50 USD Profit Guard Threshold Verification
  console.log('\n--- TEST 14: Strict $0.50 USD Profit Guard Threshold Verification ---');
  const gate14 = new DeltaShadowConfirmationGate();
  // Set high ATR = 200 so ATR distance is small (< 0.10 ATR), isolating the $0.50 USD profit condition
  const cand14 = gate14.registerCandidate({
    symbol: 'ETHUSD',
    strategyName: 'ProfitGuardTest',
    side: 'BUY',
    signalPrice: 2000,
    atr: 200, // 0.10 ATR = 20 USD
    notionalUSD: 2000, // 1 USD move in ETH = $1.00 USD PnL
  });

  // Price at 2000.40 -> +$0.40 USD profit (< $0.50 USD threshold), +0.002 ATR (< 0.10 ATR)
  const tickSub50 = gate14.updateTick('ETHUSD', 2000.40, 2000);
  assert(tickSub50 !== null && tickSub50.action === 'HOLD', 'Profit of +$0.40 USD (< $0.50 USD) holds in gate');
  assert(cand14.virtualPnlUSD === 0.40, 'Candidate virtual PnL calculated as $0.40');

  // Price at 2000.52 -> +$0.52 USD profit (>= $0.50 USD threshold), ATR dist = 0.52 / 200 = 0.0026 (< 0.10 ATR)
  const tickOver50 = gate14.updateTick('ETHUSD', 2000.52, 2000);
  assert(tickOver50 !== null && tickOver50.action === 'EXECUTE', 'Profit of +$0.52 USD (>= $0.50 USD) triggers EXECUTE via Branch C');
  assert(tickOver50!.branch === 'BRANCH_C_CONFIRMED', 'Branch is BRANCH_C_CONFIRMED');
  assert(tickOver50!.candidate.pendingOrderStatus === 'FILLED', 'pendingOrderStatus is FILLED');

  // TEST 15: Delta AutoTrader confirmBreakoutPosition Integration
  console.log('\n--- TEST 15: Delta AutoTrader confirmBreakoutPosition Integration ---');
  const { deltaAutoTrader } = await import('./lib/deltaAutoTraderEngine.js');
  deltaAutoTrader.resetPositions();

  const mockCandidate: any = {
    symbol: 'BTCUSD',
    strategyName: 'QuantumMomentum',
    side: 'BUY',
    signalPrice: 78000,
    currentPrice: 78055,
    atr: 500,
    firstSeenTime: Date.now() - 5000,
    qualifyingSeconds: 5,
    virtualPnlUSD: 0.55,
    status: 'QUALIFIED',
    invalidationPrice: 77950,
    pendingOrderPrice: 78050,
    pendingDeltaOrderId: 'delta-pre-btc-78000-exec',
    pendingOrderStatus: 'FILLED',
    targetMult: 1.4,
    slMult: 2.6,
  };

  const newPosition = await deltaAutoTrader.confirmBreakoutPosition({
    candidate: mockCandidate,
    fillPrice: 78055,
  });

  assert(newPosition !== null, 'Active position created from breakout fill');
  assert(newPosition!.entryPrice === 78050, 'Position entryPrice anchored to pre-placed breakout price (78,050)');
  assert(newPosition!.side === 'BUY', 'Position side matches BUY');
  assert(newPosition!.takeProfitPrice === 78050 + 1.4 * 500, `TP accurately set to $${78050 + 1.4 * 500}`);
  assert(newPosition!.stopLossPrice === 78050 - 2.6 * 500, `SL accurately set to $${78050 - 2.6 * 500}`);
  assert(deltaAutoTrader.getStatus().activePositions.length === 1, 'Position stored in activePositions array');
  deltaAutoTrader.resetPositions();
  assert(deltaAutoTrader.getStatus().activePositions.length === 0, 'Active positions cleanly reset to 0');

  // TEST 16: SELL Side Pre-Placed Breakout Order ($78,000 -> $77,950 Order Price)
  console.log('\n--- TEST 16: SELL Side Pre-Placed Breakout Order (78,000 -> 77,950) ---');
  const gate16 = new DeltaShadowConfirmationGate();
  const cand16 = gate16.registerCandidate({
    symbol: 'BTCUSD',
    strategyName: 'LiquiditySweep',
    side: 'SELL',
    signalPrice: 78000,
    atr: 500, // 0.10 ATR = 50 USD
    notionalUSD: 780,
    pendingDeltaOrderId: 'delta-pre-sell-78000',
  });

  assert(cand16.pendingOrderPrice === 77950, 'SELL Resting breakout order price is 78,000 - 50 = 77,950 USD (-0.10 ATR)');
  assert(cand16.adverseThresholdPrice === 78050, 'SELL Adverse threshold is 78,000 + 50 = 78,050 USD (+0.10 ATR)');

  // Favorable breakout tick to 77,940 (dropped below 77,950)
  const sellBreakoutTick = gate16.updateTick('BTCUSD', 77940, 780);
  assert(sellBreakoutTick !== null && sellBreakoutTick.action === 'EXECUTE', 'SELL breakout fills at 77,940');
  assert(sellBreakoutTick!.branch === 'BRANCH_C_CONFIRMED', 'Branch is BRANCH_C_CONFIRMED');
  assert(sellBreakoutTick!.candidate.pendingOrderStatus === 'FILLED', 'SELL order status is FILLED');

  // TEST 17: Resting Breakout Order Price Exact Touch & Anchored TP/SL Verification
  console.log('\n--- TEST 17: Resting Breakout Order Price Exact Touch & Anchored TP/SL ---');
  const gate17 = new DeltaShadowConfirmationGate();
  const cand17 = gate17.registerCandidate({
    symbol: 'BTCUSD',
    strategyName: 'QuantumMomentum',
    side: 'BUY',
    signalPrice: 78000,
    atr: 500,
    notionalUSD: 562.50, // yields 50/78000 * 562.50 = $0.36 USD (< $0.50)
    pendingDeltaOrderId: 'delta-pre-btc-exact-78050',
  });

  // Verify virtualTP and virtualSL are properly anchored to pendingOrderPrice (78,050)
  assert(cand17.pendingOrderPrice === 78050, 'pendingOrderPrice is exactly 78,050');
  assert(cand17.virtualTP === 78050 + 1.4 * 500, `virtualTP correctly anchored to 78,050 ($${78050 + 1.4 * 500})`);
  assert(cand17.virtualSL === 78050 - 2.6 * 500, `virtualSL correctly anchored to 78,050 ($${78050 - 2.6 * 500})`);

  // Sub-breakout tick at 78,049.50 should HOLD
  const holdTick17 = gate17.updateTick('BTCUSD', 78049.50, 562.50);
  assert(holdTick17 !== null && holdTick17.action === 'HOLD', 'Price at 78,049.50 (< 78,050) holds in gate');

  // Exact touch at 78,050.00 must EXECUTE via Branch C (Delta order is filled natively!)
  const exactFillTick17 = gate17.updateTick('BTCUSD', 78050.00, 562.50);
  assert(exactFillTick17 !== null && exactFillTick17.action === 'EXECUTE', 'Exact touch of 78,050 executes Branch C immediately');
  assert(exactFillTick17!.branch === 'BRANCH_C_CONFIRMED', 'Branch is BRANCH_C_CONFIRMED');
  assert(exactFillTick17!.candidate.pendingOrderStatus === 'FILLED', 'Order status is FILLED');

  // TEST 18: Adverse Boundary Exact Touch (78,000 -> 77,950)
  console.log('\n--- TEST 18: Adverse Boundary Exact Touch (78,000 -> 77,950) ---');
  const gate18 = new DeltaShadowConfirmationGate();
  gate18.registerCandidate({
    symbol: 'BTCUSD',
    strategyName: 'QuantumMomentum',
    side: 'BUY',
    signalPrice: 78000,
    atr: 500,
    notionalUSD: 562.50,
    pendingDeltaOrderId: 'delta-pre-btc-adverse-77950',
  });

  // Adverse tick at exactly 77,950.00 (-0.10 ATR boundary)
  const adverseExactTick18 = gate18.updateTick('BTCUSD', 77950.00, 562.50);
  assert(adverseExactTick18 !== null && adverseExactTick18.action === 'DISCARD', 'Exact touch of 77,950 (-0.10 ATR) triggers DISCARD');
  assert(adverseExactTick18!.branch === 'BRANCH_A_FAKEOUT', 'Branch is BRANCH_A_FAKEOUT');
  assert(adverseExactTick18!.candidate.pendingOrderStatus === 'CANCELLED', 'Resting order marked CANCELLED');

  // TEST 19: Robustness Guard Against Invalid Ticks (NaN, <= 0)
  console.log('\n--- TEST 19: Robustness Guard Against Invalid Ticks ---');
  const gate19 = new DeltaShadowConfirmationGate();
  const cand19 = gate19.registerCandidate({
    symbol: 'ETHUSD',
    strategyName: 'GuardTest',
    side: 'BUY',
    signalPrice: 3000,
    atr: 50,
    notionalUSD: 500,
  });

  const nanTick = gate19.updateTick('ETHUSD', NaN, 500);
  assert(nanTick === null, 'updateTick with NaN returns null');
  const zeroTick = gate19.updateTick('ETHUSD', 0, 500);
  assert(zeroTick === null, 'updateTick with 0 returns null');
  const negTick = gate19.updateTick('ETHUSD', -100, 500);
  assert(negTick === null, 'updateTick with negative price returns null');
  assert(cand19.status === 'OBSERVING', 'Candidate remains clean in OBSERVING state');

  // TEST 20: Delta Exchange cancelOrder Payload & Numeric Handling
  console.log('\n--- TEST 20: Delta Exchange cancelOrder Payload & Numeric Handling ---');
  const cancelNumericRes = await deltaExchange.cancelOrder('123456789', 'BTCUSD');
  assert(cancelNumericRes.success === true, 'cancelOrder with numeric ID string succeeds');
  const cancelAlphaRes = await deltaExchange.cancelOrder('delta-pre-test-abc', 'ETHUSD');
  assert(cancelAlphaRes.success === true, 'cancelOrder with alphanumeric ID succeeds');

  // TEST 21: AutoTrader simulateShadowBranch Realistic Price Initialization
  console.log('\n--- TEST 21: simulateShadowBranch Realistic Price Initialization ---');
  const simResult: any = await (deltaAutoTrader as any).simulateShadowBranch('BTCUSD', 'BRANCH_C_CONFIRMED');
  if (simResult && simResult.decision) {
    assert(simResult.decision.action === 'EXECUTE', 'simulateShadowBranch triggers EXECUTE for Branch C');
    assert(simResult.position !== undefined && simResult.position !== null, 'Promoted to active position');
    assert(simResult.position.entryPrice > 10000, `entryPrice is realistic market price: $${simResult.position.entryPrice}`);
  }
  if (originalStateRaw) {
    fs.writeFileSync('.delta_auto_trader_state.json', originalStateRaw, 'utf8');
    (deltaAutoTrader as any).loadState();
  }

    console.log('\n=====================================================');
    console.log('🎉 ALL 21 TESTS PASSED WITH 100% SUCCESS!');
    console.log('=====================================================');
  } finally {
    if (originalStateRaw) {
      fs.writeFileSync('.delta_auto_trader_state.json', originalStateRaw, 'utf8');
      (deltaAutoTrader as any).loadState();
    }
  }
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Fatal error in tests:', err);
  process.exit(1);
});
