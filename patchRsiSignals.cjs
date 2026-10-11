const fs = require('fs');

let code = fs.readFileSync('lib/cryptoDedicatedStrategyEngine.ts', 'utf8');

// Stop DOGE and other indicators from selling on green pumps
code = code.replace(/if \(lastRsi > 65 && lowerWickPct < 10\) \{([\s\S]*?)signal = 'SELL';/g, "if (lastRsi > 65 && lowerWickPct < 10) {$1signal = 'BUY'; // Fixed: Trend is UP, so BUY!");
code = code.replace(/if \(lastRsi < 35 && upperWickPct < 10\) \{([\s\S]*?)signal = 'BUY';/g, "if (lastRsi < 35 && upperWickPct < 10) {$1signal = 'SELL'; // Fixed: Trend is DOWN, so SELL!");

// Just in case, let's reverse the meaning of "RSI > 65" throughout the specific indicator if it's explicitly 'SELL'
code = code.replace(/signal = 'SELL';\n        reason = `RSI \$\{lastRsi\.toFixed\(1\)\} Momentum/g, "signal = 'BUY';\n        reason = `RSI \${lastRsi.toFixed(1)} Momentum");

fs.writeFileSync('lib/cryptoDedicatedStrategyEngine.ts', code);
console.log('Fixed RSI pump/dump signals in strategy engine');
