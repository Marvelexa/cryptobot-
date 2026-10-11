import { marketTraps } from '../lib/marketTrapsAndChopEngine';
import { quantMath } from '../lib/quantMathematicalEngine';
import { priceActionPlaybook } from '../lib/priceActionPlaybook2026Engine';
import { KlinePoint } from '../src/types';

async function fetchCandles(symbol: string, interval: string = '15m', limit: number = 100): Promise<KlinePoint[]> {
  const binanceSym = symbol.toUpperCase().endsWith('USDT')
    ? symbol.toUpperCase()
    : (symbol.toUpperCase().replace('USD', '') + 'USDT');
  const resp = await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${binanceSym}&interval=${interval}&limit=${limit}`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  return data.map((k: any) => ({
    time: k[0],
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }));
}

async function runTrapsVerification() {
  console.log('=============================================================');
  console.log('VERIFYING CHOP & MARKET TRAPS PLAYBOOK 2026');
  console.log('=============================================================');

  const symbols = ['SUIUSD', 'AVAXUSD', 'XRPUSD', 'DOGEUSD', 'SOLUSD'];

  for (const sym of symbols) {
    console.log(`\n----------------- ${sym} CHOP & TRAP ANALYSIS -----------------`);
    try {
      const candles = await fetchCandles(sym, '15m', 100);
      if (!candles || candles.length < 35) {
        console.log(`❌ Could not fetch candles for ${sym}`);
        continue;
      }

      const closedCandles = candles.slice(0, -1);
      const lastCandle = closedCandles[closedCandles.length - 1];
      console.log(`Last Closed Bar: Close=$${lastCandle.close}, Range=$${(lastCandle.high - lastCandle.low).toFixed(4)}`);

      // 1. Chop Analysis
      const chop = marketTraps.evaluateChop(sym, closedCandles);
      console.log(`Chop Assessment: Score=${chop.chopScore}/100 | isChopMode=${chop.isChopMode}`);
      console.log(`   Metrics: CI=${chop.choppinessIndex} (Chop > 58) | ADX=${chop.adx} (Weak < 20) | KER=${chop.efficiencyRatio} (Chop < 0.3)`);
      console.log(`   Price Action: Overlap=${chop.rangeOverlapPct}% | MedianBody=${(chop.medianBodyPct * 100).toFixed(0)}% | Whipsaws=${chop.whipsawEma20Count} | RVOL=${chop.rvol}x`);
      console.log(`   Key Reasons: ${chop.reasons.join(' | ') || 'None (Clean Trend)'}`);

      // 2. Range Validation in case of Chop
      const atr = (lastCandle.high - lastCandle.low);
      const rangeCheck = marketTraps.validateRangeStrategy(sym, closedCandles, atr);
      console.log(`Range Strategy: Valid=${rangeCheck.isValidRange} | Width=${rangeCheck.rangeWidthAtr} ATR | Reason: ${rangeCheck.reason}`);

      // 3. Price Action & Market Structure
      const paVerdict = priceActionPlaybook.evaluatePriceAction(sym, closedCandles);
      const swings = priceActionPlaybook.findSwings(closedCandles, 3);
      const structure = priceActionPlaybook.evaluateMarketStructure(closedCandles, swings.swingHighs, swings.swingLows);

      // 4. Trap Check for Long and Short setups
      const longTrap = marketTraps.evaluateMarketTraps({
        symbol: sym,
        side: 'BUY',
        setupType: paVerdict?.setupType,
        marketStructure: structure.structure,
        candles: closedCandles,
        targetLevelPrice: paVerdict?.entryPrice,
        levelType: 'SUPPORT',
      });

      const shortTrap = marketTraps.evaluateMarketTraps({
        symbol: sym,
        side: 'SELL',
        setupType: paVerdict?.setupType,
        marketStructure: structure.structure,
        candles: closedCandles,
        targetLevelPrice: paVerdict?.entryPrice,
        levelType: 'RESISTANCE',
      });

      console.log(`Trap Shield (BUY): Blocked=${longTrap.isBlockedByTrap} | Reason: ${longTrap.trapReason}`);
      console.log(`Trap Shield (SELL): Blocked=${shortTrap.isBlockedByTrap} | Reason: ${shortTrap.trapReason}`);

      // 5. Time Stop Simulation
      const timeStopSim = marketTraps.shouldTimeStopExit(
        Date.now() - (15 * 15 * 60 * 1000), // 15 bars ago (3.75 hours)
        lastCandle.close,
        lastCandle.close * 0.999, // only 0.1% move
        'BUY',
        atr,
        14
      );
      console.log(`Time Stop Sim (15 bars stalled): ShouldExit=${timeStopSim.shouldExit} | Reason: ${timeStopSim.reason}`);

    } catch (err: any) {
      console.error(`Error analyzing ${sym}:`, err.message || err);
    }
  }

  console.log('\n=============================================================');
  console.log('VERIFICATION COMPLETE');
  console.log('=============================================================');
}

runTrapsVerification().catch(console.error);
