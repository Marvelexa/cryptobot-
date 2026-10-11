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

async function addLots() {
  console.log('--- ADDING LOTS TO ACTIVE POSITIONS ---');
  
  // 1. Add 30 lots to SUIUSD BUY
  console.log('Adding 30 lots to SUIUSD...');
  const suiRes = await placeDeltaOrder('SUIUSD', 30, 'buy');
  console.log('SUI Result:', JSON.stringify(suiRes));

  // 2. Add 3 lots (300 DOGE) to DOGEUSD BUY
  console.log('Adding 3 lots (300 DOGE) to DOGEUSD...');
  const dogeRes = await placeDeltaOrder('DOGEUSD', 3, 'buy');
  console.log('DOGE Result:', JSON.stringify(dogeRes));

  // 3. Add 2 lots to AVAXUSD BUY
  console.log('Adding 2 lots to AVAXUSD...');
  const avaxRes = await placeDeltaOrder('AVAXUSD', 2, 'buy');
  console.log('AVAX Result:', JSON.stringify(avaxRes));

  // 4. Add 80 lots to ADAUSD BUY
  console.log('Adding 80 lots to ADAUSD...');
  const adaRes = await placeDeltaOrder('ADAUSD', 80, 'buy');
  console.log('ADA Result:', JSON.stringify(adaRes));
}

addLots().catch(console.error);
