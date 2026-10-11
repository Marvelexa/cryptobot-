import { deltaExchange } from './lib/deltaExchangeEngine';

async function testRealDelta() {
  console.log('Testing live Delta Exchange API with configured credentials...');
  // Force isSimulation to false for test
  (deltaExchange as any).config.isSimulation = false;
  try {
    const bal = await deltaExchange.getWalletBalance();
    console.log('Wallet Balance Success!', bal);
  } catch (e: any) {
    console.log('Wallet Balance Failed:', e.message);
  }

  try {
    const pos = await deltaExchange.getMarginedPositions();
    console.log('Margined Positions Success! Count:', pos ? pos.length : 0);
  } catch (e: any) {
    console.log('Margined Positions Failed:', e.message);
  }
}
testRealDelta();
