import { CryptoDedicatedStrategyEngine } from '../lib/cryptoDedicatedStrategyEngine.js';

const WATCHLIST = [
  'BTCUSDT',
  'ETHUSDT',
  'SOLUSDT',
  'XRPUSDT',
  'DOGEUSDT',
  'ADAUSDT',
  'SUIUSDT',
  'AVAXUSDT'
];

async function testCleanIndicatorSignals() {
  console.log('=== TESTING PURE INDICATOR SIGNALS ACROSS LAST 50 CANDLES ===\n');

  for (const symbol of WATCHLIST) {
    try {
      const url = `https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=15m&limit=100`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const allCandles = data.map((k: any) => ({
        time: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      }));

      const closes = allCandles.map((c: any) => c.close);
      const fastZ = CryptoDedicatedStrategyEngine.calculateZLEMA(closes, 8);
      const slowZ = CryptoDedicatedStrategyEngine.calculateZLEMA(closes, 21);
      const ema100 = CryptoDedicatedStrategyEngine.calculateEMA(closes, 100);

      let buyCount = 0;
      let sellCount = 0;
      const recentSignals: string[] = [];

      // Check crossover across the last 30 candles
      for (let i = 70; i < allCandles.length; i++) {
        const prevF = fastZ[i - 1];
        const currF = fastZ[i];
        const prevS = slowZ[i - 1];
        const currS = slowZ[i];
        const price = closes[i];
        const trend = ema100[i] || price;
        const c = allCandles[i];
        const timeStr = new Date(c.time).toISOString().substring(11, 16);

        // Bullish Indicator Cross: Fast crosses above Slow
        if (prevF <= prevS && currF > currS) {
          buyCount++;
          recentSignals.push(`[${timeStr}] BUY (Bullish ZLEMA Cross) @ $${price} (Trend: ${price > trend ? 'BULL' : 'BEAR'})`);
        }
        // Bearish Indicator Cross: Fast crosses below Slow
        else if (prevF >= prevS && currF < currS) {
          sellCount++;
          recentSignals.push(`[${timeStr}] SELL (Bearish ZLEMA Cross) @ $${price} (Trend: ${price > trend ? 'BULL' : 'BEAR'})`);
        }
      }

      console.log(`Coin: ${symbol.padEnd(10)} | ZLEMA Cross Signals in last 30 candles (7.5 hours): ${buyCount + sellCount} (${buyCount} BUY, ${sellCount} SELL)`);
      if (recentSignals.length > 0) {
        recentSignals.slice(-3).forEach(s => console.log(`   ${s}`));
      }
      console.log('----------------------------------------------------');
    } catch (e: any) {
      console.error(`Error checking ${symbol}:`, e.message);
    }
  }
}

testCleanIndicatorSignals();
