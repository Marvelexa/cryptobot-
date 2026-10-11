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

async function testMathDetails() {
  const symbols = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD', 'DOGEUSD', 'ADAUSD', 'AVAXUSD', 'SUIUSD'];
  console.log('=== EXACT POINTS BREAKDOWN (15M MATH) ===');
  for (const sym of symbols) {
    try {
      const candles = await fetchBinanceCandles(sym);
      const closedCandles = candles.slice(0, -1);
      const v = quantMath.evaluateMarketMath(sym, closedCandles);
      console.log(`\nSymbol: ${sym}`);
      console.log(`  Side: ${v.recommendedSide || 'NONE'}`);
      console.log(`  QuantScore: ${v.quantScore}`);
      console.log(`  Reasons:`);
      v.reasons.forEach(r => console.log(`    - ${r}`));
    } catch (e: any) {
      console.log(`${sym} => Error: ${e.message}`);
    }
  }
}
testMathDetails();
