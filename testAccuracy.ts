import { DeltaAutoTraderEngine } from './lib/deltaAutoTraderEngine';

async function testAccuracy() {
  const engine = new DeltaAutoTraderEngine();
  const respEth = await fetch('https://data-api.binance.vision/api/v3/klines?symbol=ETHUSDT&interval=15m&limit=150');
  const dataEth = await respEth.json();
  const klinesEth = dataEth.map((k: any) => ({
    time: k[0], open: parseFloat(k[1]), high: parseFloat(k[2]),
    low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5])
  })).slice(0, -1);

  const respBtc = await fetch('https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=15m&limit=150');
  const dataBtc = await respBtc.json();
  const klinesBtc = dataBtc.map((k: any) => ({
    time: k[0], open: parseFloat(k[1]), high: parseFloat(k[2]),
    low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5])
  })).slice(0, -1);

  const btcConfluence = (engine as any).CryptoDedicatedStrategyEngine?.evaluateInstitutionalConfluence?.(klinesBtc) || { trendDirection: 'NEUTRAL' };
  const btcTrend = btcConfluence.trendDirection || 'NEUTRAL';

  console.log('BTC Trend:', btcTrend);
  const ethAcc = engine.evaluateTradeAccuracy('ETHUSD', 'BUY', klinesEth, btcTrend);
  console.log('ETH BUY Accuracy:', ethAcc);

  const respAvax = await fetch('https://data-api.binance.vision/api/v3/klines?symbol=AVAXUSDT&interval=15m&limit=150');
  const dataAvax = await respAvax.json();
  const klinesAvax = dataAvax.map((k: any) => ({
    time: k[0], open: parseFloat(k[1]), high: parseFloat(k[2]),
    low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5])
  })).slice(0, -1);

  const avaxAcc = engine.evaluateTradeAccuracy('AVAXUSD', 'SELL', klinesAvax, btcTrend);
  console.log('AVAX SELL Accuracy:', avaxAcc);
}
testAccuracy();
