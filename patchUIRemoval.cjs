const fs = require('fs');
let code = fs.readFileSync('src/components/DeltaAutoTraderCard.tsx', 'utf8');

const regex = /\{\/\*\s*SHADOW GATE CANDIDATES.*?\/\* 8-COIN BIDIRECTIONAL SIMULATION MATRIX \*\//s;
code = code.replace(regex, '{/* 8-COIN BIDIRECTIONAL SIMULATION MATRIX */}');

fs.writeFileSync('src/components/DeltaAutoTraderCard.tsx', code);
console.log('UI cleanup done');
