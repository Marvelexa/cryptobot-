const fs = require('fs');

async function fetchBinance(symbol, interval = '15m', limit = 100) {
  const binanceSym = symbol.toUpperCase().endsWith('USDT')
    ? symbol.toUpperCase()
    : (symbol.toUpperCase().replace('USD', '') + 'USDT');
  try {
    const res = await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${binanceSym}&interval=${interval}&limit=${limit}`);
    const data = await res.json();
    return data.map(k => ({
      time: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));
  } catch (e) {
    return [];
  }
}

async function run() {
  const coins = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD', 'DOGEUSD', 'ADAUSD', 'AVAXUSD', 'SUIUSD'];
  console.log('Fetching live candle diagnostics across 8 coins...\n');

  for (const c of coins) {
    const candles = await fetchBinance(c, '15m', 100);
    if (!candles.length) {
      console.log(`[${c}] Failed to fetch candles.`);
      continue;
    }
    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    const closes = candles.map(x => x.close);

    // Simple RSI 14
    let gains = 0, losses = 0;
    for (let i = closes.length - 14; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }
    const rs = losses === 0 ? 100 : gains / losses;
    const rsi = 100 - (100 / (1 + rs));

    console.log(`[${c}] Close: $${last.close} | RSI(14): ${rsi.toFixed(1)} | Change: ${((last.close - prev.close)/prev.close * 100).toFixed(2)}%`);
  }
}

run();
