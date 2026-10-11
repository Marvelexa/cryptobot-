const fs = require('fs');

let code = fs.readFileSync('lib/deltaAutoTraderEngine.ts', 'utf8');

// Change the threshold from 65 to 70 for Indicator Accuracy
code = code.replace(/score >= 65/g, 'score >= 70');

fs.writeFileSync('lib/deltaAutoTraderEngine.ts', code);
console.log('Fixed deltaAutoTraderEngine threshold to 70');
