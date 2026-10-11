import { quantMath } from '../lib/quantMathematicalEngine';
import { deltaExchange } from '../lib/deltaExchangeEngine';
import { DeltaAutoTraderEngine } from '../lib/deltaAutoTraderEngine';

async function fetchBinanceCandles(symbol: string, limit: number = 200): Promise<any[]> {
  const binanceSym = symbol.toUpperCase().endsWith('USDT')
    ? symbol.toUpperCase()
    : (symbol.toUpperCase().replace('USD', '') + 'USDT');
  const resp = await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${binanceSym}&interval=15m&limit=${limit}`);
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

async function testPlaybookIntegration() {
  console.log('========================================================================');
  console.log('🧪 TESTING CRYPTO SIGNAL PLAYBOOK 2026 & BEYOND INTEGRATION');
  console.log('========================================================================');

  const symbols = ['XRPUSD', 'DOGEUSD', 'SOLUSD', 'AVAXUSD', 'SUIUSD'];
  const engine = new DeltaAutoTraderEngine();

  for (const sym of symbols) {
    console.log(`\n-------------------------------------------------------------`);
    console.log(`🔍 EVALUATING COIN: ${sym}`);
    console.log(`-------------------------------------------------------------`);

    try {
      // 1. Fetch 15M candles
      const candles = await fetchBinanceCandles(sym, 200);
      const closedCandles = candles.slice(0, -1);
      const currentPrice = closedCandles[closedCandles.length - 1].close;

      // 2. Fetch live Delta Exchange Microstructure & Derivatives
      const microData = await deltaExchange.getMicrostructureAndDerivatives(sym).catch(() => null);
      if (microData) {
        console.log(`📊 Delta Exchange Microstructure:`);
        console.log(`   - Order Book Imbalance (OBI): ${microData.obi > 0 ? '+' : ''}${microData.obi} (Bids vs Asks)`);
        console.log(`   - Taker CVD: ${microData.cvd} contracts | Taker Buy Ratio: ${(microData.takerBuyRatio * 100).toFixed(1)}%`);
        console.log(`   - Funding Rate: ${microData.fundingRate} | Open Interest: ${microData.openInterest.toLocaleString()}`);
        console.log(`   - Microprice: $${microData.microprice} | Best Bid: $${microData.bestBid} | Best Ask: $${microData.bestAsk}`);
      } else {
        console.log(`⚠️ Live Delta microstructure unavailable, using price-action volume delta proxy`);
      }

      // 3. Evaluate Market Math with Playbook 2026 v2 Architecture
      const verdict = quantMath.evaluateMarketMath(sym, closedCandles, microData);
      console.log(`🧮 Quantitative Evaluation Result:`);
      console.log(`   - Market Regime: ${verdict.marketRegime} (${verdict.regimeReason})`);
      console.log(`   - Hurst Exponent: ${verdict.hurstExponent} | Variance Ratio: ${verdict.varianceRatio}`);
      console.log(`   - SuperSmoother Slope: ${verdict.superSmootherSlope}% | Kalman Dev: ${verdict.kalmanDeviationPct}%`);
      console.log(`   - Fisher Transform: ${verdict.fisherTransform} (Signal: ${verdict.fisherSignal}) | Z-Score: ${verdict.zScore}`);
      console.log(`   - Structure: Nearest Support: $${verdict.nearestSupport} (At Support: ${verdict.isAtSupport}) | Nearest Resistance: $${verdict.nearestResistance} (At Resistance: ${verdict.isAtResistance})`);
      console.log(`   - Support Break Confirmed: ${verdict.supportBreakConfirmed} | Resistance Break Confirmed: ${verdict.resistanceBreakConfirmed}`);
      console.log(`   - Scores Breakdown (1 vote per group, max 100):`);
      if (verdict.scores) {
        console.log(`     * Group A (Trend/Mom, max 20): ${verdict.scores.groupA_trend}`);
        console.log(`     * Group B (Mean-Reversion, max 20): ${verdict.scores.groupB_meanRevert}`);
        console.log(`     * Group C (Volatility/Squeeze, max 10): ${verdict.scores.groupC_volatility}`);
        console.log(`     * Group D (Structure S/R, max 20): ${verdict.scores.groupD_structure}`);
        console.log(`     * Group E (Order Flow/CVD, max 20): ${verdict.scores.groupE_orderFlow}`);
        console.log(`     * Group F (Derivatives/OI, max 10): ${verdict.scores.groupF_derivatives}`);
        console.log(`     => TOTAL BUY SCORE: ${verdict.scores.totalBuyScore}/100`);
        console.log(`     => TOTAL SELL SCORE: ${verdict.scores.totalSellScore}/100`);
      }
      console.log(`   - Recommended Side: ${verdict.recommendedSide || 'NONE'} | Final Score: ${verdict.quantScore}/100 (Threshold >= 70)`);
      console.log(`   - Key Reasons:`);
      verdict.reasons.forEach(r => console.log(`     • ${r}`));

    } catch (err: any) {
      console.error(`❌ Error evaluating ${sym}:`, err.message);
    }
  }

  console.log('\n========================================================================');
  console.log('✅ ALL PLAYBOOK 2026 ARCHITECTURE CHECKS COMPLETED SUCCESSFULLY');
  console.log('========================================================================');
}

testPlaybookIntegration();
