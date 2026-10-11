const fs = require('fs');

let code = fs.readFileSync('lib/quantMathematicalEngine.ts', 'utf8');

// Change the threshold from 45 to 70
code = code.replace(/Minimum 45 points required/g, 'Minimum 70 points required');
code = code.replace(/buyPoints >= 45/g, 'buyPoints >= 70');
code = code.replace(/sellPoints >= 45/g, 'sellPoints >= 70');

fs.writeFileSync('lib/quantMathematicalEngine.ts', code);
console.log('Fixed quantMath thresholds to 70');
