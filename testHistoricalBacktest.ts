import { QuantMathematicalEngine } from './lib/quantMathematicalEngine.ts';

async function testHistorical() {
  const res = await fetch('https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=15m&limit=500');
  const data = await res.json();
  const allCandles = data.map((k: any) => ({
    time: k[0],
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }));

  let buySignals = 0;
  let sellSignals = 0;
  let chopBlocks = 0;
  let neutralCount = 0;

  for (let i = 50; i < allCandles.length; i += 3) {
    const window = allCandles.slice(i - 50, i);
    const v = QuantMathematicalEngine.evaluateMarketMath('BTCUSDT', window);
    if (v.recommendedSide === 'BUY') {
      buySignals++;
      console.log(`[Bar ${i} - ${new Date(window[window.length - 1].time).toISOString()}] BUY Score=${v.quantScore} | Reasons: ${v.reasons.slice(0, 3).join(' + ')}`);
    } else if (v.recommendedSide === 'SELL') {
      sellSignals++;
      console.log(`[Bar ${i} - ${new Date(window[window.length - 1].time).toISOString()}] SELL Score=${v.quantScore} | Reasons: ${v.reasons.slice(0, 3).join(' + ')}`);
    } else if (v.reasons[0]?.includes('CHOPPING')) {
      chopBlocks++;
    } else {
      neutralCount++;
    }
  }

  console.log(`\n=== HISTORICAL VALIDATION SUMMARY ===`);
  console.log(`BUY Signals: ${buySignals}`);
  console.log(`SELL Signals: ${sellSignals}`);
  console.log(`Chop Blocks: ${chopBlocks}`);
  console.log(`Neutral/Scanning: ${neutralCount}`);
}

testHistorical();
