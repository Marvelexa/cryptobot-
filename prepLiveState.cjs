const fs = require('fs');

if (fs.existsSync('.delta_auto_trader_state.json')) {
  const state = JSON.parse(fs.readFileSync('.delta_auto_trader_state.json', 'utf8'));
  state.mode = 'LIVE_DELTA_INDIA';
  state.minCapitalFloorINR = 2000;
  state.activePositions = [];
  state.isNewTradesPaused = false;
  state.isRunning = true;
  state.maxConcurrentPositions = 2;
  state.isInverseTrading = false;
  state.shadowGateEnabled = false;
  fs.writeFileSync('.delta_auto_trader_state.json', JSON.stringify(state, null, 2), 'utf8');
  console.log('Cleaned state for LIVE_DELTA_INDIA execution');
}
