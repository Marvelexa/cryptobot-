const fs = require('fs');
let code = fs.readFileSync('src/components/DeltaAutoTraderCard.tsx', 'utf8');
code = code.replace(/Direct Signal Execution/g, 'Shadow Gate Waiting Room');
code = code.replace(/Indicator Signal z" Immediate Live Trade/g, 'Evaluating 3-Minute Holding Period');
code = code.replace(/>\s*DIRECT\s*</g, '>SHADOW_GATE<');
fs.writeFileSync('src/components/DeltaAutoTraderCard.tsx', code);
console.log('UI updated');
