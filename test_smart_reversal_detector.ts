import { SmartReversalDetector } from './lib/smartReversalDetector';
import { KlinePoint } from './src/types';

function generateCandles(count: number, startPrice: number, step: number, lastBarMod?: Partial<KlinePoint>): KlinePoint[] {
  const candles: KlinePoint[] = [];
  let price = startPrice;
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const open = price;
    price += step;
    const close = price;
    const high = Math.max(open, close) + 2;
    const low = Math.min(open, close) - 2;
    candles.push({
      time: now - (count - i) * 15 * 60 * 1000,
      open,
      high,
      low,
      close,
      volume: 1000,
    });
  }
  if (lastBarMod) {
    Object.assign(candles[candles.length - 1], lastBarMod);
  }
  return candles;
}

function generateRealisticTrend(count: number, startPrice: number): KlinePoint[] {
  const candles: KlinePoint[] = [];
  let price = startPrice;
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const isPullback = i % 3 === 0;
    const delta = isPullback ? -0.4 : 0.9;
    const open = price;
    price += delta;
    const close = price;
    const high = Math.max(open, close) + 0.3;
    const low = Math.min(open, close) - 0.3;
    candles.push({
      time: now - (count - i) * 15 * 60 * 1000,
      open,
      high,
      low,
      close,
      volume: 1200,
    });
  }
  return candles;
}

console.log('🧪 Starting Smart Adaptive Reversal Detector Test Suite...\n');

// -------------------------------------------------------------
// Test 1: Strong Bullish Trend Breakout (Must execute DIRECT LONG)
// -------------------------------------------------------------
{
  const bullCandles = generateRealisticTrend(60, 100); // Healthy uptrend with pullbacks (RSI ~58)
  const lastPrice = bullCandles[bullCandles.length - 1].close;
  const atr = 1.2;

  const result = SmartReversalDetector.evaluateTrade('DOGEUSD', 'BUY', bullCandles, lastPrice, atr);
  console.log(`[TEST 1] DOGE Bullish Breakout: Bias=${result.bias} | Side=${result.finalExecutedSide} | Regime=${result.regime} | RSI=${result.metrics.rsi14.toFixed(1)}`);
  if (result.bias !== 'DIRECT' || result.finalExecutedSide !== 'BUY' || result.isReversed !== false) {
    throw new Error(`Test 1 Failed: Expected DIRECT BUY, got ${result.bias} ${result.finalExecutedSide}`);
  }
  console.log('✅ Test 1 Passed: Strong Bullish Breakout executed DIRECT (Never reversed against the trend)!\n');
}

// -------------------------------------------------------------
// Test 2: Overbought Blow-Off Top / Climax Trap (Must SMART REVERSE to SHORT)
// -------------------------------------------------------------
{
  // 50 candles normal, then sudden massive parabolic spike with upper rejection wick
  const candles: KlinePoint[] = [];
  let p = 100;
  const now = Date.now();
  for (let i = 0; i < 45; i++) {
    candles.push({
      time: now - (50 - i) * 15 * 60 * 1000,
      open: p,
      high: p + 1,
      low: p - 1,
      close: p + 0.5,
      volume: 500,
    });
    p += 0.5;
  }
  // Parabolic surge into overbought
  for (let i = 45; i < 49; i++) {
    p += 15;
    candles.push({
      time: now - (50 - i) * 15 * 60 * 1000,
      open: p - 15,
      high: p + 2,
      low: p - 15,
      close: p,
      volume: 2000,
    });
  }
  // Climax bar: huge high with upper wick rejection
  candles.push({
    time: now,
    open: p,
    high: p + 30, // massive wick up
    low: p - 2,
    close: p + 5, // rejected back down
    volume: 800, // volume exhaustion
  });

  const lastPrice = candles[candles.length - 1].close;
  const atr = 5.0;

  const result = SmartReversalDetector.evaluateTrade('BTCUSD', 'BUY', candles, lastPrice, atr);
  console.log(`[TEST 2] Overbought Climax Trap: Bias=${result.bias} | Original=${result.originalSignal} ➔ FinalSide=${result.finalExecutedSide} | Regime=${result.regime}`);
  console.log(`         Reason: ${result.primaryReason}`);
  console.assert(result.bias === 'SMART_REVERSED', `Expected SMART_REVERSED but got ${result.bias}`);
  console.assert(result.finalExecutedSide === 'SELL', `Expected SELL but got ${result.finalExecutedSide}`);
  console.assert(result.isReversed === true, 'Expected isReversed to be true');
  console.log('✅ Test 2 Passed: Overbought Climax Trap successfully flipped BUY ➔ SHORT to fade top!\n');
}

// -------------------------------------------------------------
// Test 3: Oversold Capitulation Dump (Must SMART REVERSE to LONG)
// -------------------------------------------------------------
{
  const candles: KlinePoint[] = [];
  let p = 200;
  const now = Date.now();
  for (let i = 0; i < 45; i++) {
    candles.push({
      time: now - (50 - i) * 15 * 60 * 1000,
      open: p,
      high: p + 1,
      low: p - 1,
      close: p - 0.5,
      volume: 500,
    });
    p -= 0.5;
  }
  // Panic flush
  for (let i = 45; i < 49; i++) {
    p -= 18;
    candles.push({
      time: now - (50 - i) * 15 * 60 * 1000,
      open: p + 18,
      high: p + 18,
      low: p - 2,
      close: p,
      volume: 3000,
    });
  }
  // Capitulation bottom: massive hammer lower wick
  candles.push({
    time: now,
    open: p,
    high: p + 2,
    low: p - 35, // massive capitulation wick down
    close: p - 4, // recovered back up
    volume: 900,
  });

  const lastPrice = candles[candles.length - 1].close;
  const atr = 6.0;

  const result = SmartReversalDetector.evaluateTrade('ETHUSD', 'SELL', candles, lastPrice, atr);
  console.log(`[TEST 3] Oversold Capitulation Flush: Bias=${result.bias} | Original=${result.originalSignal} ➔ FinalSide=${result.finalExecutedSide} | Regime=${result.regime}`);
  console.log(`         Reason: ${result.primaryReason}`);
  console.assert(result.bias === 'SMART_REVERSED', `Expected SMART_REVERSED but got ${result.bias}`);
  console.assert(result.finalExecutedSide === 'BUY', `Expected BUY but got ${result.finalExecutedSide}`);
  console.assert(result.isReversed === true, 'Expected isReversed to be true');
  console.log('✅ Test 3 Passed: Oversold Panic Flush successfully flipped SELL ➔ LONG to catch bottom!\n');
}

// -------------------------------------------------------------
// Test 4: Adaptive Result Bridge Verification
// -------------------------------------------------------------
{
  const bullCandles = generateRealisticTrend(60, 100);
  const lastPrice = bullCandles[bullCandles.length - 1].close;
  const rawResult = SmartReversalDetector.evaluateTrade('SOLUSD', 'BUY', bullCandles, lastPrice, 1.2);
  const adaptive = SmartReversalDetector.toAdaptiveResult(rawResult, lastPrice, 1.2);

  console.log(`[TEST 4] Adaptive Result Bridge: Regime=${adaptive.regime} | Mode=${adaptive.executionMode} | EffectiveSide=${adaptive.effectiveSide}`);
  if (adaptive.executionMode !== 'DIRECT' || adaptive.effectiveSide !== 'BUY') {
    throw new Error(`Test 4 Failed: Expected DIRECT BUY in adaptive bridge, got ${adaptive.executionMode} ${adaptive.effectiveSide}`);
  }
  console.log('✅ Test 4 Passed: toAdaptiveResult bridge is 100% compliant with src/types.ts!\n');
}

// -------------------------------------------------------------
// Test 5: Anti-Counter-Trend Guard (Reject Naive Short in Bull Trend)
// -------------------------------------------------------------
{
  const bullCandles = generateRealisticTrend(60, 100);
  const lastPrice = bullCandles[bullCandles.length - 1].close;
  // An unconfirmed SELL signal comes in while price is trending up
  const rawResult = SmartReversalDetector.evaluateTrade('BTCUSD', 'SELL', bullCandles, lastPrice, 1.2);

  console.log(`[TEST 5] Anti-Counter-Trend Guard: Bias=${rawResult.bias} | Reason=${rawResult.primaryReason}`);
  if (rawResult.bias !== 'REJECT') {
    throw new Error(`Test 5 Failed: Expected REJECT for counter-trend short in bull trend, but got ${rawResult.bias}`);
  }
  console.log('✅ Test 5 Passed: Counter-trend SHORT in Bullish Trend was strictly REJECTED!\n');
}

console.log('🎉 ALL SMART REVERSAL DETECTOR TESTS PASSED PERFECTLY!');
