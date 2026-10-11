const fs = require('fs');
let code = fs.readFileSync('lib/deltaAutoTraderEngine.ts', 'utf8');

const regex = /public toggleInverse\(explicitState\?: boolean\): boolean \{[\s\S]*?return this\.state\.isInverseTrading;[\s\n]*\}/;
const replacement = `public toggleInverse(explicitState?: boolean): boolean {
    if (explicitState !== undefined) {
      this.state.isInverseTrading = explicitState;
    } else {
      this.state.isInverseTrading = !this.state.isInverseTrading;
    }
    this.saveState();
    console.log('[INVERSE MODE] Global Inverse Trading is now: ' + (this.state.isInverseTrading ? 'ON' : 'OFF'));
    return this.state.isInverseTrading;
  }`;

code = code.replace(regex, replacement);
fs.writeFileSync('lib/deltaAutoTraderEngine.ts', code);
console.log('toggleInverse fixed');
