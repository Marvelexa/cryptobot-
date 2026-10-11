import { CryptoDedicatedStrategyEngine } from './lib/cryptoDedicatedStrategyEngine';
import { CandlestickMasterPatternEngine } from './lib/candlestickMasterPatternEngine';
import { DeltaShadowConfirmationGate } from './lib/deltaShadowConfirmationGate';
import { KlinePoint } from './src/types';
import fs from 'fs';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ ${msg}`);
}

function makeCandles(count: number, startPrice: number, step: number, vol: number = 2000): KlinePoint[] {
  const candles: KlinePoint[] = [];
  let p = startPrice;
  for (let i = 0; i < count; i++) {
    const open = p;
    p += step;
    const close = p;
    const high = Math.max(open, close) + 0.2;
    const low = Math.min(open, close) - 0.2;
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

async function testAntiNaiveTrading() {
  console.log('================================================================');
  console.log('🧪 VERIFYING ANTI-NAIVE TRADING & INSTITUTIONAL CONFLUENCE');
  console.log('================================================================\n');

  const engine = new CryptoDedicatedStrategyEngine();

  // 1. Test SOL with arbitrary green/red candles in flat market
  console.log('--- TEST 1: SOL naive green candle rejection ---');
  // 50 flat candles with tiny green bar at the end
  const flatCandles = makeCandles(50, 150, 0, 1000);
  flatCandles[49].open = 150.0;
  flatCandles[49].close = 150.05; // tiny green candle
  flatCandles[49].high = 150.10;
  flatCandles[49].low = 149.95;
  const solRes = engine.evaluateSymbol('SOLUSD', flatCandles);
  assert(solRes.signal === null, `SOL green candle without setup does not trigger BUY (got ${solRes.signal})`);

  // 2. Test SUI with arbitrary green/red candles in flat market
  console.log('--- TEST 2: SUI naive green candle rejection ---');
  const suiFlatCandles = makeCandles(50, 1.5, 0, 1000);
  suiFlatCandles[49].open = 1.50;
  suiFlatCandles[49].close = 1.501; // tiny green candle
  suiFlatCandles[49].high = 1.502;
  suiFlatCandles[49].low = 1.498;
  const suiRes = engine.evaluateSymbol('SUIUSD', suiFlatCandles);
  assert(suiRes.signal === null, `SUI green candle without setup does not trigger BUY (got ${suiRes.signal})`);

  // 3. Test DOGE with arbitrary green candle in flat market
  console.log('--- TEST 3: DOGE naive green candle rejection ---');
  const dogeFlat = makeCandles(50, 0.10, 0, 1000);
  dogeFlat[49].open = 0.10;
  dogeFlat[49].close = 0.1001; // green
  dogeFlat[49].high = 0.1002;
  dogeFlat[49].low = 0.0998;
  const dogeRes = engine.evaluateSymbol('DOGEUSD', dogeFlat);
  assert(dogeRes.signal === null, `DOGE green candle without setup does not trigger BUY (got ${dogeRes.signal})`);

  // 4. Test XRP with arbitrary green candle in flat market
  console.log('--- TEST 4: XRP naive green candle rejection ---');
  const xrpFlat = makeCandles(50, 0.60, 0, 1000);
  xrpFlat[49].open = 0.60;
  xrpFlat[49].close = 0.6001; // green
  xrpFlat[49].high = 0.6002;
  xrpFlat[49].low = 0.5998;
  const xrpRes = engine.evaluateSymbol('XRPUSD', xrpFlat);
  assert(xrpRes.signal === null, `XRP green candle without setup does not trigger BUY (got ${xrpRes.signal})`);

  // 5. Test Generic Unknown Coin naive candle rejection
  console.log('--- TEST 5: Generic Fallback naive green candle rejection ---');
  const genericFlat = makeCandles(50, 20, 0, 1000);
  genericFlat[49].open = 20.0;
  genericFlat[49].close = 20.01;
  genericFlat[49].high = 20.02;
  genericFlat[49].low = 19.98;
  const genericRes = engine.evaluateSymbol('LINKUSD', genericFlat);
  assert(genericRes.signal === null, `Generic coin green candle does not trigger BUY (got ${genericRes.signal})`);

  // 5b. Test BTC, ETH, ADA, AVAX naive green candle rejection
  console.log('--- TEST 5b: BTC, ETH, ADA, AVAX naive green candle rejection ---');
  for (const sym of ['BTCUSD', 'ETHUSD', 'ADAUSD', 'AVAXUSD']) {
    const flat = makeCandles(50, 100, 0, 1000);
    flat[49].open = 100.0;
    flat[49].close = 100.05; // tiny green candle
    flat[49].high = 100.10;
    flat[49].low = 99.90;
    const res = engine.evaluateSymbol(sym, flat);
    assert(res.signal === null, `${sym} flat green candle without confluence does not trigger BUY (got ${res.signal})`);
  }

  // 6. Test Macro Downtrend Blocks Counter-Trend Bullish Patterns
  console.log('--- TEST 6: Downtrend counter-trend trap blocking ---');
  const downCandles = makeCandles(250, 200, -0.3, 2000);
  // Hammer at bottom
  downCandles[249].open = 125.0;
  downCandles[249].close = 125.2;
  downCandles[249].high = 125.25;
  downCandles[249].low = 124.0; // long lower shadow = hammer
  const candleAnalysis = CandlestickMasterPatternEngine.analyze('BTCUSD', downCandles, 1.02, true);
  assert(candleAnalysis.dominantSignal === 'NEUTRAL', `Counter-trend hammer in downtrend is blocked from dominantSignal (got ${candleAnalysis.dominantSignal})`);
  assert(candleAnalysis.highestConfidencePattern === null, 'highestConfidencePattern is null for blocked counter-trend pattern');

  // 6b. Test Institutional Multi-EMA Confluence Boundaries
  console.log('--- TEST 6b: Institutional Multi-EMA & RSI boundaries ---');
  // Bullish candles (clear uptrend)
  const upCandles = makeCandles(250, 100, 0.4, 2500);
  const upConfluence = CryptoDedicatedStrategyEngine.evaluateInstitutionalConfluence(upCandles);
  assert(upConfluence.isMacroBullish === true, 'Uptrend candles detect isMacroBullish === true');
  assert(upConfluence.allowsShort === false, 'allowsShort is strictly false in macro uptrend');

  // Downward candles (clear downtrend)
  const downConfluence = CryptoDedicatedStrategyEngine.evaluateInstitutionalConfluence(downCandles);
  assert(downConfluence.isMacroBearish === true, 'Downtrend candles detect isMacroBearish === true');
  assert(downConfluence.allowsLong === false, 'allowsLong is strictly false in macro downtrend');

  // 7. Verify .delta_auto_trader_state.json active positions remain preserved
  console.log('--- TEST 7: Active positions state audit ---');
  const stateRaw = fs.readFileSync('.delta_auto_trader_state.json', 'utf8');
  const state = JSON.parse(stateRaw);
  assert(Array.isArray(state.activePositions), `Active positions array valid: ${state.activePositions.length} positions open`);
  assert(state.isInverseTrading === false, 'isInverseTrading is strictly false');
  assert(state.dailyRealizedPnlUSD === 0 || state.dailyRealizedPnlUSD >= 0, `Realized PnL verified: $${state.dailyRealizedPnlUSD}`);

  console.log('\n================================================================');
  console.log('🎉 ALL ANTI-NAIVE TRADING AUDITS PASSED WITH 100% SUCCESS!');
  console.log('================================================================');
}

testAntiNaiveTrading().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
