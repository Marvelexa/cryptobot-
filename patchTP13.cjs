const fs = require('fs');

// 1. Update lib/deltaAutoTraderEngine.ts
let engineCode = fs.readFileSync('lib/deltaAutoTraderEngine.ts', 'utf8');

engineCode = engineCode.replace(/const targetMult = 1\.80; \/\/ FLAT 1\.8x ATR TP for ALL coins/, 'const targetMult = 1.30; // FLAT 1.3x ATR TP for ALL coins');
engineCode = engineCode.replace(/const targetMult = params\.candidate\.targetMult \|\| 1\.80;/, 'const targetMult = params.candidate.targetMult || 1.30;');

fs.writeFileSync('lib/deltaAutoTraderEngine.ts', engineCode);
console.log('Updated deltaAutoTraderEngine.ts with 1.3x ATR');

// 2. Update src/components/DeltaAutoTraderCard.tsx
let uiCode = fs.readFileSync('src/components/DeltaAutoTraderCard.tsx', 'utf8');
uiCode = uiCode.replace(/Dynamic 1\.8x ATR/g, 'Dynamic 1.3x ATR');
uiCode = uiCode.replace(/Target TP \(1\.8x ATR\)/g, 'Target TP (1.3x ATR)');
fs.writeFileSync('src/components/DeltaAutoTraderCard.tsx', uiCode);
console.log('Updated DeltaAutoTraderCard.tsx with 1.3x ATR labels');
