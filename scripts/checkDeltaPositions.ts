import { deltaExchange } from '../lib/deltaExchangeEngine.ts';

async function checkDeltaPositions() {
  try {
    const pos = await deltaExchange.getMarginedPositions();
    console.log('Open Margined Positions on Delta Exchange:', JSON.stringify(pos, null, 2));
    const orders = await deltaExchange.getOpenOrders();
    console.log('Open Orders on Delta Exchange:', JSON.stringify(orders, null, 2));
  } catch (e: any) {
    console.error('Error:', e.message);
  }
}

checkDeltaPositions();
