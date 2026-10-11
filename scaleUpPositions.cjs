const crypto = require('crypto');
require('dotenv').config();

const apiKey = process.env.DELTA_API_KEY;
const apiSecret = process.env.DELTA_API_SECRET;
const hostname = 'https://api.india.delta.exchange';

async function placeDeltaOrder(productSymbol, size, side) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const path = '/v2/orders';
  const body = {
    product_symbol: productSymbol,
    size: size,
    side: side.toLowerCase(),
    order_type: 'market_order',
  };
  const bodyStr = JSON.stringify(body);
  const signatureData = 'POST' + timestamp + path + bodyStr;
  const signature = crypto.createHmac('sha256', apiSecret).update(signatureData).digest('hex');

  const res = await fetch(hostname + path, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'timestamp': timestamp,
      'signature': signature,
      'Content-Type': 'application/json',
    },
    body: bodyStr,
  });

  const data = await res.json();
  return data;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scaleUpAllPositions() {
  console.log('=== SCALING UP LOTS ON ALL ACTIVE POSITIONS ===\n');

  // 1. AVAXUSD: Add 9 lots (Total -> 10 lots)
  console.log('1. Adding 9 lots to AVAXUSD (BUY)...');
  const avax = await placeDeltaOrder('AVAXUSD', 9, 'buy');
  console.log('AVAX Result:', avax.success ? `SUCCESS! Avg price: ${avax.result?.average_fill_price}` : avax.error?.code || avax);
  await sleep(1500);

  // 2. ADAUSD: Add 360 lots (Total -> 400 lots)
  console.log('2. Adding 360 lots to ADAUSD (BUY)...');
  const ada = await placeDeltaOrder('ADAUSD', 360, 'buy');
  console.log('ADA Result:', ada.success ? `SUCCESS! Avg price: ${ada.result?.average_fill_price}` : ada.error?.code || ada);
  await sleep(1500);

  // 3. SUIUSD: Add 69 lots (Total -> 100 lots)
  console.log('3. Adding 69 lots to SUIUSD (BUY)...');
  const sui = await placeDeltaOrder('SUIUSD', 69, 'buy');
  console.log('SUI Result:', sui.success ? `SUCCESS! Avg price: ${sui.result?.average_fill_price}` : sui.error?.code || sui);
  await sleep(1500);

  // 4. DOGEUSD: Add 6 lots (600 DOGE -> Total 1,000 DOGE)
  console.log('4. Adding 6 lots (600 DOGE) to DOGEUSD (BUY)...');
  const doge = await placeDeltaOrder('DOGEUSD', 6, 'buy');
  console.log('DOGE Result:', doge.success ? `SUCCESS! Avg price: ${doge.result?.average_fill_price}` : doge.error?.code || doge);
  await sleep(1500);

  // 5. ETHUSD: Add 4 lots (Total -> 8 lots)
  console.log('5. Adding 4 lots to ETHUSD (BUY)...');
  const eth = await placeDeltaOrder('ETHUSD', 4, 'buy');
  console.log('ETH Result:', eth.success ? `SUCCESS! Avg price: ${eth.result?.average_fill_price}` : eth.error?.code || eth);
  await sleep(1500);

  // 6. BTCUSD: Add 1 lot (Total -> 2 lots)
  console.log('6. Adding 1 lot to BTCUSD (BUY)...');
  const btc = await placeDeltaOrder('BTCUSD', 1, 'buy');
  console.log('BTC Result:', btc.success ? `SUCCESS! Avg price: ${btc.result?.average_fill_price}` : btc.error?.code || btc);
  await sleep(1500);

  console.log('\n=== DONE SCALING UP ===');
}

scaleUpAllPositions().catch(console.error);
