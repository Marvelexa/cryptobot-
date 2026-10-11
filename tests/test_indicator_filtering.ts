import { strategyEngine } from '../lib/cryptoDedicatedStrategyEngine';

const WATCHLIST = [
  'BTCUSDT',
  'ETHUSDT',
  'SOLUSDT',
  'XRPUSDT',
  'DOGEUSDT',
  'ADAUSDT',
  'AVAXUSDT',
  'SUIUSDT',
];

async function runTest() {
  console.log('================================================================');
  console.log('🧪 VERIFYING INDICATOR-ONLY STRICT FILTERING (LIVE TEST)');
  console.log('================================================================\n');

  for (const symbol of WATCHLIST) {
    try {
      const url = `https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=15m&limit=100`;
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`Failed to fetch candles for ${symbol}: HTTP ${res.status}`);
        continue;
      }
      const data = await res.json();
      const candles = data.map((k: any) => ({
        time: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      }));

      const evalResult = strategyEngine.evaluateSymbol(symbol, candles);
      const diag = evalResult.diagnostics;

      console.log(`Coin: ${diag.symbol.padEnd(8)} | Price: $${diag.price.toFixed(4)}`);
      console.log(`  Chop Index: ${diag.chopIndex?.toFixed(1) ?? 'N/A'} | ADX: ${diag.adx?.toFixed(1) ?? 'N/A'} | ChopShieldActive: ${diag.isAntiChopShieldActive}`);
      console.log(`  Trend Bullish: ${diag.isTrendBullish} | Candle: ${diag.lastCandlePattern ?? 'N/A'}`);
      console.log(`  👉 FINAL SIGNAL: ${evalResult.signal ? `🚨 ${evalResult.signal}` : '✅ NONE (Filtered)'}`);
      console.log(`  👉 REASON: ${evalResult.reason}`);
      console.log('----------------------------------------------------------------');
    } catch (e: any) {
      console.error(`Error with ${symbol}:`, e.message);
    }
  }
}

runTest();
