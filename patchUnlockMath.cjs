const fs = require('fs');

let code = fs.readFileSync('lib/quantMathematicalEngine.ts', 'utf8');

// Completely unlock buy and sell structure logic in Math Engine
// Remove the strict requirements so if math points say BUY, it buys.
code = code.replace(/const hasValidBuyStructure = [^;]+;/g, 'const hasValidBuyStructure = true; // UNLOCKED');
code = code.replace(/const hasValidSellStructure = [^;]+;/g, 'const hasValidSellStructure = true; // UNLOCKED');

fs.writeFileSync('lib/quantMathematicalEngine.ts', code);
console.log('Unlocked structural requirements in Math Engine');
