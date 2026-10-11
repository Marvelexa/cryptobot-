const fs = require('fs');
let code = fs.readFileSync('lib/deltaShadowConfirmationGate.ts', 'utf8');

const anchor = `    const safeAtr = Math.max(candidate.atr, 0.00001);\n    const atrDistance = priceDiff / safeAtr;\n    candidate.atrDistance = parseFloat(atrDistance.toFixed(3));`;

const insertion = `
    const currentSign = candidate.virtualPnlUSD > 0.05 ? 'PLUS' : (candidate.virtualPnlUSD < -0.05 ? 'MINUS' : 'ZERO');
    const lastSign = (candidate as any)._lastPnlSign || 'ZERO';

    if (lastSign !== 'ZERO' && currentSign !== 'ZERO' && currentSign !== lastSign) {
      console.log(\`[SHADOW GATE VOLATILITY] \${symbol} flipped from \${lastSign} to \${currentSign}. Restarting 3-minute wait timer!\`);
      candidate.firstSeenTime = Date.now();
    }
    (candidate as any)._lastPnlSign = currentSign;
`;

code = code.replace(anchor, anchor + '\n' + insertion);

fs.writeFileSync('lib/deltaShadowConfirmationGate.ts', code);
console.log('deltaShadowConfirmationGate.ts updated');
