async function checkCandles() {
  const symbols = ['XRPUSDT', 'BTCUSDT', 'SOLUSDT'];
  for (const sym of symbols) {
    const resp = await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${sym}&interval=15m&limit=8`);
    const data = await resp.json();
    console.log(`\n=== ${sym} 15M CANDLES ===`);
    data.forEach(k => {
      const t = new Date(k[0]).toLocaleTimeString();
      const o = parseFloat(k[1]), h = parseFloat(k[2]), l = parseFloat(k[3]), c = parseFloat(k[4]);
      const col = c >= o ? 'GREEN (UP)' : 'RED (DOWN)';
      console.log(`${t} | O:${o} C:${c} H:${h} L:${l} | ${col}`);
    });
  }
}
checkCandles();
