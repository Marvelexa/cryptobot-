import { CryptoDedicatedStrategyEngine } from './lib/cryptoDedicatedStrategyEngine.js';

const WATCHLIST = [
  'BTCUSDT',
  'ETHUSDT',
  'SOLUSDT',
  'XRPUSDT',
  'DOGEUSDT',
  'ADAUSDT',
  'AVAXUSDT',
  'SUIUSDT'
];

async function main() {
  const engine = new CryptoDedicatedStrategyEngine();

  console.log('=== VERIFYING EVALUATESYMBOL() ACROSS ALL 8 COINS ===\n');

  let activeSignals = 0;

  for (const symbol of WATCHLIST) {
    try {
      const url = `https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=15m&limit=100`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const candles = data.map((k: any) => ({
        time: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      }));

      const cleanSym = symbol.replace('USDT', '');
      const result = engine.evaluateSymbol(cleanSym, candles);

      if (result.signal) activeSignals++;

      console.log(`[EVALUATOR] ${cleanSym.padEnd(5)} | Signal: ${(result.signal || 'NONE').padEnd(4)} | Reason: ${result.reason}`);
    } catch (e: any) {
      console.error(`Error with ${symbol}:`, e.message);
    }
  }

  console.log(`\nActive Indicator Signals Right Now: ${activeSignals} / 8 coins`);
}

main();
