const fs = require('fs');
let code = fs.readFileSync('lib/deltaShadowConfirmationGate.ts', 'utf8');

const anchor = `    (candidate as any)._lastPnlSign = currentSign;`;
const insertion = `
    // -------------------------------------------------------------
    // FAST TRACK: $1.00 PROFIT EXECUTION
    // -------------------------------------------------------------
    if (candidate.virtualPnlUSD >= 1.0) {
      console.log(\`[SHADOW GATE FAST TRACK] \${symbol} hit +\$\${candidate.virtualPnlUSD.toFixed(2)} profit! Executing immediately.\`);
      candidate.status = 'EXECUTED';
      candidate.branch = 'BRANCH_C_CONFIRMED';
      candidate.tradeOutcome = \`FAST TRACK (+\$\${candidate.virtualPnlUSD.toFixed(2)}) ➔ REAL SAME \${candidate.side}\`;
      this.candidates.delete(symbol);
      return {
        action: 'EXECUTE',
        candidate,
        reason: \`Profit reached $1.00 fast-track threshold (+\$\${candidate.virtualPnlUSD.toFixed(2)}). Executing SAME (\${candidate.side})\`,
        branch: 'BRANCH_C_CONFIRMED',
        executedSide: candidate.side,
        executionType: 'SAME_PROFIT'
      };
    }
`;

code = code.replace(anchor, anchor + '\n' + insertion);
fs.writeFileSync('lib/deltaShadowConfirmationGate.ts', code);
console.log('deltaShadowConfirmationGate.ts updated with fast track');
