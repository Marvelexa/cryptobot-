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

async function runLiveVerification() {
  console.log('=============================================================');
  console.log('VERIFYING PLAYBOOK 2026 (LOCATION + TRIGGER + CONFIRMATION)');
  console.log('=============================================================');

  const symbols = ['SUIUSD', 'AVAXUSD', 'XRPUSD', 'DOGEUSD', 'SOLUSD'];

  for (const sym of symbols) {
    console.log(`\n----------------- ANALYZING ${sym} -----------------`);
    try {
      const candles = await fetchCandles(sym, '15m', 100);
      if (!candles || candles.length < 35) {
        console.log(`❌ Could not fetch sufficient candles for ${sym}`);
        continue;
      }

      const closedCandles = candles.slice(0, -1);
      const lastCandle = closedCandles[closedCandles.length - 1];
      console.log(`Last Closed Bar: Close=$${lastCandle.close}, High=$${lastCandle.high}, Low=$${lastCandle.low}`);

      // 1. Price Action Playbook 2026
      const paVerdict = priceActionPlaybook.evaluatePriceAction(sym, closedCandles);
      const swings = priceActionPlaybook.findSwings(closedCandles, 3);
      const structure = priceActionPlaybook.evaluateMarketStructure(closedCandles, swings.swingHighs, swings.swingLows);

      console.log(`Market Structure: ${structure.structure} | LastSwingHigh=$${structure.lastSwingHigh.toFixed(4)}, LastSwingLow=$${structure.lastSwingLow.toFixed(4)}`);

      if (paVerdict) {
        console.log(`🎯 [PA SETUP TRIGGERED] Side=${paVerdict.side} Setup=${paVerdict.setupType} Score=${paVerdict.confluenceScore}/100`);
        console.log(`   Location: ${paVerdict.locationReason}`);
        console.log(`   Trigger:  ${paVerdict.triggerReason}`);
        console.log(`   Volume:   ${paVerdict.volumeReason}`);
        console.log(`   R:R:      ${paVerdict.riskRewardRatio} (SL=$${paVerdict.stopLossPrice}, TP=$${paVerdict.takeProfitPrice})`);
      } else {
        console.log(`ℹ️ [PA No Setup]: No confirmed Location + Trigger confluence >= 70 threshold.`);
      }

      // 2. Quant Mathematical Engine
      const mathVerdict = quantMath.evaluateMarketMath(sym, closedCandles);

      console.log(`Quant Math Verdict: Regime=${mathVerdict.marketRegime} Recommendation=${mathVerdict.recommendedSide || 'NONE'} Score=${mathVerdict.quantScore}/100`);
      console.log(`   Scores: Trend=${mathVerdict.scores?.groupA_trend}, MeanRev=${mathVerdict.scores?.groupB_meanRevert}, Vol=${mathVerdict.scores?.groupC_volatility}, Struct=${mathVerdict.scores?.groupD_structure}, Flow=${mathVerdict.scores?.groupE_orderFlow}, Deriv=${mathVerdict.scores?.groupF_derivatives}`);
      console.log(`   Nearest S/R: Support=$${mathVerdict.nearestSupport}, Resistance=$${mathVerdict.nearestResistance} | isAtSupport=${mathVerdict.isAtSupport}, isAtResistance=${mathVerdict.isAtResistance}`);
      console.log(`   Key Reasons: ${mathVerdict.reasons.slice(0, 3).join(' | ')}`);

      // Verify that SUI or coins in downtrend are NOT forced to BUY
      if (structure.structure === 'DOWNTREND' && mathVerdict.recommendedSide === 'BUY') {
        console.log(`⚠️ CAUTION: Counter-trend BUY produced in DOWNTREND! (Should be shielded by Market Structure Shield)`);
      } else {
        console.log(`✅ Clean Alignment: No counter-trend forced BUYs in downtrend.`);
      }

    } catch (err: any) {
      console.error(`Error analyzing ${sym}:`, err.stack || err.message || err);
    }
  }

  console.log('\n=============================================================');
  console.log('VERIFICATION COMPLETE');
  console.log('=============================================================');
}

runLiveVerification().catch(console.error);
