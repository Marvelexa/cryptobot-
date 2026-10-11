import { strategyEngine } from '../lib/cryptoDedicatedStrategyEngine';
import { quantMath } from '../lib/quantMathematicalEngine';

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

async function testAll() {
  const symbols = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD', 'DOGEUSD', 'ADAUSD', 'AVAXUSD', 'SUIUSD'];
  console.log('=== BOTH INDICATOR & MATH LIVE SCAN ===');
  for (const sym of symbols) {
    try {
      const candles = await fetchBinanceCandles(sym);
      const closedCandles = candles.slice(0, -1);
      const math = quantMath.evaluateMarketMath(sym, closedCandles);
      const ind = strategyEngine.evaluateSymbol(sym, closedCandles);
      console.log(`\n[${sym}]`);
      console.log(`  Math Engine     : Side=${math.recommendedSide || 'NONE'} | Points=${math.quantScore}`);
      console.log(`  Indicator Engine: Side=${ind?.signal || 'NONE'} | Strat=${ind?.strategyName || 'None'} | Reason=${ind?.reason || 'None'}`);
    } catch (e: any) {
      console.log(`${sym} => Error: ${e.message}`);
    }
  }
}
testAll();
