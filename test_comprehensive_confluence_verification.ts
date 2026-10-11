import { DeltaShadowConfirmationGate } from './lib/deltaShadowConfirmationGate';
import { CryptoDedicatedStrategyEngine, InstitutionalConfluenceResult } from './lib/cryptoDedicatedStrategyEngine';
import { CandlestickMasterPatternEngine } from './lib/candlestickMasterPatternEngine';
import { KlinePoint } from './src/types';
import fs from 'fs';
import path from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

async function runComprehensiveTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING COMPREHENSIVE CONFLUENCE & NO-INVERSION TEST SUITE');
  console.log('================================================================\n');

  // =========================================================================
  // 1. SHADOW CONFIRMATION GATE TESTS (Zero Pre-Exposure & No Inverse Inversion)
  // =========================================================================
  console.log('--- TEST GROUP 1: Shadow Confirmation Gate (Branch A, B, C) ---');
  const gate = new DeltaShadowConfirmationGate();
  gate.setStats(0, 0, []);

  // Test 1.1: Registration calculation
  const candBuy = gate.registerCandidate({
    symbol: 'BTCUSD',
    strategyName: 'InstitutionalConfluenceTest',
    side: 'BUY',
    signalPrice: 65000,
    atr: 100, // 0.10 ATR = 10 USD
    notionalUSD: 650,
  });
  assert(candBuy.signalPrice === 65000, 'BUY Signal price anchored to 65000');
  assert(candBuy.favorableTargetPrice === 65010, 'BUY Favorable target is 65000 + 10 = 65010 (+0.10 ATR)');
  assert(candBuy.adverseThresholdPrice === 64990, 'BUY Adverse threshold is 65000 - 10 = 64990 (-0.10 ATR)');
  assert(candBuy.branch === 'MONITORING', 'Initial state is MONITORING');

  // Test 1.2: Branch A (Adverse Trap Filter - DISCARD with $0.00 loss, NEVER execute inverse)
  const holdTick = gate.updateTick('BTCUSD', 64990.5, 650);
  assert(holdTick !== null && holdTick.action === 'HOLD', 'Minor adverse move (< 0.10 ATR) remains in HOLD');

  const adverseTick = gate.updateTick('BTCUSD', 64990.0, 650);
  assert(adverseTick !== null && adverseTick.action === 'DISCARD', 'Adverse move (>= 0.10 ATR) triggers DISCARD');
  assert(adverseTick!.branch === 'BRANCH_A_FAKEOUT', 'Branch identifies BRANCH_A_FAKEOUT');
  assert(gate.getActiveCandidates().length === 0, 'Candidate removed from memory on discard');
  const statsA = gate.getStats();
  assert(statsA.trapsFilteredCount === 1, 'trapsFilteredCount incremented to 1');
  assert(statsA.capitalSavedUSD > 0, `capitalSavedUSD recorded ($${statsA.capitalSavedUSD})`);
  assert(statsA.recentFilteredTraps.length === 1, 'Audit ledger trap entry created');

  // Test 1.3: Branch B (5-Minute Flat Chop Timeout - DISCARD with $0.00 risk)
  const candTimeout = gate.registerCandidate({
    symbol: 'BTCUSD',
    strategyName: 'TimeoutTest',
    side: 'BUY',
    signalPrice: 65000,
    atr: 100,
    notionalUSD: 650,
  });
  candTimeout.firstSeenTime = Date.now() - 301000; // 301s elapsed
  const timeoutTick = gate.updateTick('BTCUSD', 65002, 650);
  assert(timeoutTick !== null && timeoutTick.action === 'DISCARD', 'Stall > 300s triggers DISCARD');
  assert(timeoutTick!.branch === 'BRANCH_B_TIMEOUT', 'Branch identifies BRANCH_B_TIMEOUT');

  // Test 1.4: Branch C (Favorable Breakout -> EXECUTE SAME SIDE!)
  const candBreakout = gate.registerCandidate({
    symbol: 'SOLUSD',
    strategyName: 'SolanaMomentum',
    side: 'BUY',
    signalPrice: 150.00,
    atr: 2.00, // 0.10 ATR = 0.20 USD -> target 150.20
    notionalUSD: 500,
  });
  const subBreakoutTick = gate.updateTick('SOLUSD', 150.05, 500);
  assert(subBreakoutTick !== null && subBreakoutTick.action === 'HOLD', 'Sub-breakout tick holds in gate');

  const breakoutTick = gate.updateTick('SOLUSD', 150.25, 500);
  assert(breakoutTick !== null && breakoutTick.action === 'EXECUTE', 'Breakout >= 0.10 ATR triggers EXECUTE');
  assert(breakoutTick!.branch === 'BRANCH_C_CONFIRMED', 'Branch identifies BRANCH_C_CONFIRMED');
  assert(breakoutTick!.executedSide === 'BUY', 'Executed side is SAME SIDE (BUY ➔ BUY, NOT INVERTED)');
  assert(breakoutTick!.executionType === 'SAME_PROFIT', 'Execution type is SAME_PROFIT');

  // Test 1.5: Simulator validation
  const simA = gate.simulateBranch('AVAXUSD', 'BRANCH_A_FAKEOUT');
  assert(simA !== null && simA.action === 'DISCARD', 'Simulator Branch A returns DISCARD');
  assert(simA!.branch === 'BRANCH_A_FAKEOUT', 'Branch is BRANCH_A_FAKEOUT');

  const simB = gate.simulateBranch('DOGEUSD', 'BRANCH_B_TIMEOUT');
  assert(simB !== null && simB.action === 'DISCARD', 'Simulator Branch B returns DISCARD');
  assert(simB!.branch === 'BRANCH_B_TIMEOUT', 'Branch is BRANCH_B_TIMEOUT');

  const simC = gate.simulateBranch('XRPUSD', 'BRANCH_C_CONFIRMED');
  assert(simC !== null && simC.action === 'EXECUTE', 'Simulator Branch C returns EXECUTE');
  assert(simC!.branch === 'BRANCH_C_CONFIRMED', 'Branch is BRANCH_C_CONFIRMED');
  assert(simC!.executedSide === 'BUY', 'Simulated execution side is SAME SIDE (BUY)');

  // =========================================================================
  // 2. INSTITUTIONAL CONFLUENCE ENGINE TESTS (Multi-EMA, RSI, Volume, ATR)
  // =========================================================================
  console.log('\n--- TEST GROUP 2: Institutional Confluence Math & Trend Stack ---');

  // Helper to construct synthetic candles
  function makeCandles(count: number, startPrice: number, step: number, vol: number = 1000): KlinePoint[] {
    const candles: KlinePoint[] = [];
    let p = startPrice;
    for (let i = 0; i < count; i++) {
      const open = p;
      p += step;
      const close = p;
      const high = Math.max(open, close) + 0.5;
      const low = Math.min(open, close) - 0.5;
      candles.push({
        time: 1700000000 + i * 900000,
        open,
        high,
        low,
        close,
        volume: vol,
      });
    }
    return candles;
  }

  // 2.1: Strong Bullish Stack (250 candles stepping up steadily)
  const bullCandles = makeCandles(250, 100, 0.5, 2000);
  const bullConfluence = CryptoDedicatedStrategyEngine.evaluateInstitutionalConfluence(bullCandles);
  assert(bullConfluence.trendDirection === 'BULLISH', `Bullish trend recognized (trend: ${bullConfluence.trendDirection})`);
  assert(bullConfluence.isMacroBullish === true, 'isMacroBullish is true');
  assert(bullConfluence.isMacroBearish === false, 'isMacroBearish is false');
  assert(bullConfluence.ema20 > bullConfluence.ema50, 'EMA 20 > EMA 50');
  assert(bullConfluence.ema50 > bullConfluence.ema200, 'EMA 50 > EMA 200');

  // 2.2: Strong Bearish Stack (250 candles stepping down steadily)
  const bearCandles = makeCandles(250, 250, -0.5, 2000);
  const bearConfluence = CryptoDedicatedStrategyEngine.evaluateInstitutionalConfluence(bearCandles);
  assert(bearConfluence.trendDirection === 'BEARISH', `Bearish trend recognized (trend: ${bearConfluence.trendDirection})`);
  assert(bearConfluence.isMacroBearish === true, 'isMacroBearish is true');
  assert(bearConfluence.isMacroBullish === false, 'isMacroBullish is false');
  assert(bearConfluence.ema20 < bearConfluence.ema50, 'EMA 20 < EMA 50');
  assert(bearConfluence.ema50 < bearConfluence.ema200, 'EMA 50 < EMA 200');

  // 2.3: Low Volume Trap Filter (Volume < 0.90x SMA 20)
  const lowVolCandles = makeCandles(250, 100, 0.2, 2000);
  // Slash the last candle volume to 100 (5% of 2000 avg)
  lowVolCandles[lowVolCandles.length - 1].volume = 100;
  const lowVolConfluence = CryptoDedicatedStrategyEngine.evaluateInstitutionalConfluence(lowVolCandles);
  assert(lowVolConfluence.isVolumeConfirmed === false, 'Low volume candle correctly flagged (isVolumeConfirmed = false)');
  assert(lowVolConfluence.allowsLong === false, 'allowsLong blocked due to low RVOL trap');
  assert(lowVolConfluence.summaryReason.includes('Low RVOL'), 'Summary reason flags Low RVOL');

  // 2.4: Empty & Boundary Candle Inputs
  const emptyConfluence = CryptoDedicatedStrategyEngine.evaluateInstitutionalConfluence([]);
  assert(emptyConfluence.hasSufficientData === false, 'Empty candles handled safely (hasSufficientData = false)');
  assert(emptyConfluence.allowsLong === false, 'allowsLong is false on empty candles');
  assert(emptyConfluence.allowsShort === false, 'allowsShort is false on empty candles');

  const shortConfluence = CryptoDedicatedStrategyEngine.evaluateInstitutionalConfluence(bullCandles.slice(0, 5));
  assert(shortConfluence.hasSufficientData === false, '5 candles handled safely (hasSufficientData = false)');
  assert(shortConfluence.allowsLong === false, 'allowsLong false on < 10 candles');

  // =========================================================================
  // 3. CANDLESTICK PATTERN CONFLUENCE GATING (Secondary Trigger Only)
  // =========================================================================
  console.log('\n--- TEST GROUP 3: Candlestick Pattern Engine Confluence Gating ---');

  // A bullish hammer created during a strong BEARISH downtrend:
  // In the old broken system: green candle / hammer -> triggers BUY (or inverted to SELL tukka).
  // In institutional confluence mode: counter-trend hammer MUST NOT become dominantSignal!
  const bearWithHammer = [...bearCandles];
  const lastBear = bearWithHammer[bearWithHammer.length - 1];
  // Make last candle a bullish hammer
  bearWithHammer[bearWithHammer.length - 1] = {
    time: lastBear.time,
    open: lastBear.close - 0.5,
    high: lastBear.close + 0.2,
    low: lastBear.close - 4.0, // huge lower wick
    close: lastBear.close, // green body
    volume: 500, // low volume
  };

  const patternAnalysis = CandlestickMasterPatternEngine.analyze('BTCUSD', bearWithHammer, 1.02, true);
  assert(patternAnalysis.dominantSignal === 'NEUTRAL', `Counter-trend pattern rejected from dominantSignal (actual: ${patternAnalysis.dominantSignal})`);
  assert(patternAnalysis.highestConfidencePattern === null, 'highestConfidencePattern is null because pattern failed confluence');

  // =========================================================================
  // 4. STRATEGY ENGINE CONFLUENCE GATE (No Counter-Trend Trade Execution)
  // =========================================================================
  console.log('\n--- TEST GROUP 4: Strategy Dispatcher Strict Confluence Gating ---');
  const stratEngine = new CryptoDedicatedStrategyEngine();

  // Evaluate bear market with symbol
  const stratResult = stratEngine.evaluateSymbol('BTC', bearWithHammer);
  const signal = stratResult.signal as string | null;
  if (signal === 'BUY') {
    assert(false, 'CRITICAL BUG: BUY signal generated in a macro downtrend!');
  } else {
    assert(signal !== 'BUY', `No BUY signal emitted in macro downtrend (Signal: ${signal || 'NONE'})`);
  }

  // =========================================================================
  // 5. STATE & ACTIVE POSITIONS PRESERVATION VERIFICATION
  // =========================================================================
  console.log('\n--- TEST GROUP 5: Active Positions Protection & State Audit ---');
  const statePath = path.join(process.cwd(), '.delta_auto_trader_state.json');
  assert(fs.existsSync(statePath), '.delta_auto_trader_state.json exists');

  const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  assert(Array.isArray(state.activePositions), 'activePositions is an array');
  assert(state.activePositions.length <= 4, `Active positions valid: ${state.activePositions.length}/4 maximum capacity`);
  assert(typeof state.totalTradesCount === 'number', `Total trades count is a valid number: ${state.totalTradesCount}`);
  assert(state.isInverseTrading === false, 'isInverseTrading is strictly false in state file');

  console.log(`Current active positions: ${state.activePositions.length}, Realized PnL: $${state.totalRealizedPnlUSD}`);

  console.log('\n================================================================');
  console.log('🎉 ALL COMPREHENSIVE CONFLUENCE TESTS PASSED (100% SUCCESS)');
  console.log('================================================================');
}

runComprehensiveTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
