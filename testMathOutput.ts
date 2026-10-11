import { quantMath } from './lib/quantMathematicalEngine';

async function fetchBinanceCandles(symbol: string): Promise<any[]> {
  const binanceSym = symbol.toUpperCase().endsWith('USDT')
    ? symbol.toUpperCase()
    : (symbol.toUpperCase().replace('USD', '') + 'USDT');
  const resp = await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${binanceSym}&interval=15m&limit=150`);
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

async function testMath() {
  const symbols = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD', 'DOGEUSD', 'ADAUSD', 'AVAXUSD', 'SUIUSD'];
  console.log('--- 15M QUANT MATHEMATICAL ENGINE SCAN ---');
  for (const sym of symbols) {
    try {
      const candles = await fetchBinanceCandles(sym);
      const closedCandles = candles.slice(0, -1);
      const v = quantMath.evaluateMarketMath(sym, closedCandles);
      console.log(`${sym.padEnd(8)} => Side: ${(v.recommendedSide || 'NONE').padEnd(5)} | Score: ${v.quantScore} | Regime: ${v.marketRegime.padEnd(14)} | Fisher: ${v.fisherTransform.toFixed(2)} | Hurst: ${v.hurstExponent.toFixed(2)} | SS Slope: ${v.superSmootherSlope.toFixed(2)}% | Kalman Dev: ${v.kalmanDeviationPct.toFixed(2)}% | Reasons: ${v.reasons.join('; ')}`);
    } catch (e: any) {
      console.log(`${sym} => Error: ${e.message}`);
    }
  }
}
testMath();
