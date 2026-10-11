const fs = require('fs');
let code = fs.readFileSync('lib/deltaExchangeEngine.ts', 'utf8');

// Add debug logging to placeOrder - after the API call succeeds
const oldSuccess = `if (res && res.result) {
            const fillPrice = parseFloat(res.result.average_fill_price || res.result.price || params.price.toString());
            console.log(\`dYZ_ Real Delta Order Filled`;

const newSuccess = `console.log('[DEBUG] Delta API raw response:', JSON.stringify(res));
          if (res && res.result) {
            const fillPrice = parseFloat(res.result.average_fill_price || res.result.price || params.price.toString());
            console.log(\`dYZ_ Real Delta Order Filled`;

code = code.replace(oldSuccess, newSuccess);

// Add debug logging when order fails
const oldFail = `console.warn('Delta Exchange live order dispatch failed:', err.message);`;
const newFail = `console.warn('[DEBUG] Delta Exchange FULL order error:', err.message, JSON.stringify(err));`;
code = code.replace(oldFail, newFail);

// Add debug logging for paper fallback
const oldPaper = `// Simulation / Paper Execution: Re-anchored to market price`;
const newPaper = `console.warn('[DEBUG] >>> FALLING TO PAPER MODE! API Key:', this.config.apiKey?.substring(0,6), 'isSimulation:', this.config.isSimulation);
    // Simulation / Paper Execution: Re-anchored to market price`;
code = code.replace(oldPaper, newPaper);

fs.writeFileSync('lib/deltaExchangeEngine.ts', code);
console.log('Debug logging added to placeOrder');
