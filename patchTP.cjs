const fs = require('fs');
let code = fs.readFileSync('lib/deltaAutoTraderEngine.ts', 'utf8');

// Replace the per-coin targetMult with a flat 1.8 for ALL coins
const oldTargetMult = /const targetMult = isSui \? [\d.]+ : \(isSol \? [\d.]+ : \(isEth \? [\d.]+ : \(isAvax \? [\d.]+ : \(isAda \? [\d.]+ : \(isBtc \? [\d.]+ : \(isDoge \? [\d.]+ : \(isXrp \? [\d.]+ : [\d.]+\)\)\)\)\)\)\);/;

code = code.replace(oldTargetMult, 'const targetMult = 1.80; // FLAT 1.8x ATR TP for ALL coins');

// Also fix the breakout confirmBreakoutPosition default
code = code.replace(/const targetMult = params\.candidate\.targetMult \|\| [\d.]+;/, 'const targetMult = params.candidate.targetMult || 1.80;');

fs.writeFileSync('lib/deltaAutoTraderEngine.ts', code);
console.log('TP ATR multiplier set to 1.8x for ALL coins');
