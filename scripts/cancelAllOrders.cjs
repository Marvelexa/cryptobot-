// Script to cancel all open, pending, and untriggered stop orders on Delta Exchange India
const crypto = require('crypto');
require('dotenv').config();

const apiKey = process.env.DELTA_API_KEY;
const apiSecret = process.env.DELTA_API_SECRET;
const isTestnet = process.env.DELTA_IS_TESTNET === 'true';
const baseUrl = isTestnet ? 'https://cdn-ind.testnet.deltaex.org' : 'https://api.india.delta.exchange';

async function request(method, path, body = null) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const bodyStr = body ? JSON.stringify(body) : '';
  const signatureData = method + timestamp + path + bodyStr;
  const signature = crypto.createHmac('sha256', apiSecret).update(signatureData).digest('hex');

  const headers = {
    'api-key': apiKey,
    'timestamp': timestamp,
    'signature': signature,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'DeltaAutoTrader/1.0',
  };

  const res = await fetch(baseUrl + path, {
    method,
    headers,
    body: body ? bodyStr : undefined,
  });

  const txt = await res.text();
  try {
    return JSON.parse(txt);
  } catch (e) {
    return { status: res.status, text: txt };
  }
}

async function main() {
  console.log(`Connecting to ${baseUrl}...`);
  console.log(`API Key: ${apiKey ? apiKey.substring(0, 8) + '...' : 'NONE'}`);

  // 1. Check wallet balance
  const bal = await request('GET', '/v2/wallet/balances');
  console.log('Wallet Balances Response:', JSON.stringify(bal));

  if (bal?.error?.code === 'ip_not_whitelisted_for_api_key') {
    console.error('\n======================================================');
    console.error('🛑 DELTA EXCHANGE ERROR: IP NOT WHITELISTED');
    console.error(`Your current IP is: ${bal.error.context?.client_ip}`);
    console.error('Please go to Delta Exchange -> API Keys -> Edit Key:');
    console.error('1) Either uncheck "Restrict IP addresses"');
    console.error(`2) Or add IP: ${bal.error.context?.client_ip}`);
    console.error('======================================================\n');
    return;
  }

  // 2. Fetch and cancel all open and untriggered stop orders
  const states = ['open', 'pending', 'untriggered'];
  let totalCancelled = 0;

  for (const st of states) {
    console.log(`Fetching orders with state=${st}...`);
    const res = await request('GET', `/v2/orders?state=${st}&limit=100`);
    if (res && res.result && Array.isArray(res.result) && res.result.length > 0) {
      console.log(`Found ${res.result.length} orders in state=${st}`);
      for (const order of res.result) {
        console.log(`Cancelling order ID ${order.id} (${order.product_symbol || order.product_id} - ${order.stop_order_type || order.order_type})...`);
        const delRes = await request('DELETE', `/v2/orders/${order.id}`, { id: order.id });
        console.log('Result:', JSON.stringify(delRes));
        totalCancelled++;
      }
    } else {
      console.log(`No orders found in state=${st}`);
    }
  }

  // 3. Batch cancel all orders across all active products
  console.log('Sending global cancel all orders request...');
  const cancelAllRes = await request('DELETE', '/v2/orders/all', {});
  console.log('Global cancel result:', JSON.stringify(cancelAllRes));

  console.log(`\n✅ Finished cleanup. Total cancelled orders: ${totalCancelled}`);
}

main().catch(console.error);
