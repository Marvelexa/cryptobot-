import { deltaExchange } from './lib/deltaExchangeEngine';

async function checkPos() {
  (deltaExchange as any).config.isSimulation = false;
  const positions = await deltaExchange.getMarginedPositions();
  console.log('--- EXACT LIVE MARGINED POSITION ON DELTA EXCHANGE ---');
  if (positions && positions.length > 0) {
    for (const p of positions) {
      console.log('Symbol  :', p.product_symbol);
      console.log('Size    :', p.size);
      console.log('Entry   :', p.entry_price);
      console.log('Margin  :', p.margin);
      console.log('Pnl     :', p.realized_pnl, '| Unrealized:', p.unrealized_pnl);
    }
  } else {
    console.log('No positions found');
  }
}
checkPos();
