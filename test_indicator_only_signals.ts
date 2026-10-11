import { CryptoDedicatedStrategyEngine } from './lib/cryptoDedicatedStrategyEngine.js';

const WATCHLIST = [
  { symbol: 'BTCUSDT', type: 'momentum' },
  { symbol: 'ETHUSDT', type: 'hybrid' },
  { symbol: 'SOLUSDT', type: 'momentum' },
  { symbol: 'XRPUSDT', type: 'momentum' },
  { symbol: 'DOGEUSDT', type: 'momentum' },
  { symbol: 'ADAUSDT', type: 'momentum' },
  { symbol: 'AVAXUSDT', type: 'bands' },
  { symbol: 'SUIUSDT', type: 'bands' },
];

async function main() {
  console.log('=== TESTING PURE INDICATOR-ONLY EVALUATOR (1-2 BAR WINDOW) ===\n');

  for (const item of WATCHLIST) {
    try {
      const url = `https://data-api.binance.vision/api/v3/klines?symbol=${item.symbol}&interval=15m&limit=100`;
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

      const closes = candles.map((c: any) => c.close);
      const len = candles.length;
      const currentPrice = closes[len - 1];

      // 1. ZLEMA 8/21
      const fastZ = CryptoDedicatedStrategyEngine.calculateZLEMA(closes, 8);
      const slowZ = CryptoDedicatedStrategyEngine.calculateZLEMA(closes, 21);

      // 2. Momentum Wave
      const vel: number[] = [];
      for (let i = 0; i < closes.length; i++) {
        vel.push((fastZ[i] || closes[i]) - (slowZ[i] || closes[i]));
      }
      const acc: number[] = [];
      for (let i = 0; i < closes.length; i++) {
        const prevVel = i > 0 ? vel[i - 1] : vel[0];
        acc.push((vel[i] - prevVel) * 1.5);
      }
      const velPlusAcc = vel.map((v, i) => v + acc[i]);
      const wave = CryptoDedicatedStrategyEngine.calculateEMA(velPlusAcc, 3);
      const sig = CryptoDedicatedStrategyEngine.calculateEMA(wave, 9);

      // 3. Bollinger Bands & RSI
      const { upper: bbUppers, lower: bbLowers } = CryptoDedicatedStrategyEngine.calculateBollingerBands(closes, 18, 1.8);
      const rsi5 = CryptoDedicatedStrategyEngine.calculateRSI(closes, 5);

      // ZLEMA Crossover (Current bar or 1 bar ago)
      const prevF = fastZ[len - 2];
      const currF = fastZ[len - 1];
      const prevS = slowZ[len - 2];
      const currS = slowZ[len - 1];
      const prev2F = fastZ[len - 3] || prevF;
      const prev2S = slowZ[len - 3] || prevS;
      const isZlemaBullCrossNow = prevF <= prevS && currF > currS;
      const isZlemaBearCrossNow = prevF >= prevS && currF < currS;
      const isZlemaBullCrossPrev = prev2F <= prev2S && prevF > prevS && currF > currS;
      const isZlemaBearCrossPrev = prev2F >= prev2S && prevF < prevS && currF < currS;
      const isZlemaBullCross = isZlemaBullCrossNow || isZlemaBullCrossPrev;
      const isZlemaBearCross = isZlemaBearCrossNow || isZlemaBearCrossPrev;

      // Wave Crossover (Current bar or 1 bar ago)
      const prevWave = wave[len - 2] || 0;
      const currWave = wave[len - 1] || 0;
      const prevSig = sig[len - 2] || 0;
      const currSig = sig[len - 1] || 0;
      const prev2Wave = wave[len - 3] || prevWave;
      const prev2Sig = sig[len - 3] || prevSig;
      const isWaveBullCrossNow = prevWave <= prevSig && currWave > currSig;
      const isWaveBearCrossNow = prevWave >= prevSig && currWave < currSig;
      const isWaveBullCrossPrev = prev2Wave <= prev2Sig && prevWave > prevSig && currWave > currSig;
      const isWaveBearCrossPrev = prev2Wave >= prev2Sig && prevWave < prevSig && currWave < currSig;
      const isWaveBullCross = isWaveBullCrossNow || isWaveBullCrossPrev;
      const isWaveBearCross = isWaveBearCrossNow || isWaveBearCrossPrev;

      // Bollinger Bands Reclaim
      const currBbUpper = bbUppers[len - 1];
      const currBbLower = bbLowers[len - 1];
      const prevBbLower = bbLowers[len - 2];
      const prevBbUpper = bbUppers[len - 2];
      const lastCandle = candles[len - 1];
      const prevCandle = candles[len - 2];
      const lowerPierced = (prevCandle.low <= prevBbLower) || (lastCandle.low <= currBbLower);
      const upperPierced = (prevCandle.high >= prevBbUpper) || (lastCandle.high >= currBbUpper);
      const bullBbReclaim = lowerPierced && (lastCandle.close > currBbLower) && (rsi5[len - 1] <= 45);
      const bearBbReclaim = upperPierced && (lastCandle.close < currBbUpper) && (rsi5[len - 1] >= 55);

      let indicatorSignal: 'BUY' | 'SELL' | null = null;
      let indicatorReason = '';

      if (isZlemaBullCross || isWaveBullCross || bullBbReclaim) {
        indicatorSignal = 'BUY';
        indicatorReason = isZlemaBullCross
          ? `ZLEMA (8/21) Bullish Cross (Fast ${currF.toFixed(4)} > Slow ${currS.toFixed(4)})`
          : isWaveBullCross
          ? `Momentum Wave Bullish Cross (Wave ${currWave.toFixed(2)} > Signal ${currSig.toFixed(2)})`
          : `Bollinger Band Lower Reclaim + RSI (${rsi5[len - 1]?.toFixed(1)})`;
      } else if (isZlemaBearCross || isWaveBearCross || bearBbReclaim) {
        indicatorSignal = 'SELL';
        indicatorReason = isZlemaBearCross
          ? `ZLEMA (8/21) Bearish Cross (Fast ${currF.toFixed(4)} < Slow ${currS.toFixed(4)})`
          : isWaveBearCross
          ? `Momentum Wave Bearish Cross (Wave ${currWave.toFixed(2)} < Signal ${currSig.toFixed(2)})`
          : `Bollinger Band Upper Reclaim + RSI (${rsi5[len - 1]?.toFixed(1)})`;
      }

      const symClean = item.symbol.replace('USDT', '');
      console.log(`[PURE INDICATOR] ${symClean.padEnd(6)} => Signal: ${(indicatorSignal || 'NONE').padEnd(4)} | Reason: ${indicatorReason || 'No fresh crossover'}`);
    } catch (e: any) {
      console.error(`Error with ${item.symbol}:`, e.message);
    }
  }
}

main();
