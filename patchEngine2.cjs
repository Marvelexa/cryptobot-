const fs = require('fs');
let code = fs.readFileSync('lib/deltaExchangeEngine.ts', 'utf8');
code = code.replace(/console\.warn\('Error fetching margined positions from Delta:', err\.message\);\s*return \[\];/g, "console.warn('Error fetching margined positions from Delta:', err.message);\n        throw err;");
code = code.replace(/console\.warn\('Error fetching open orders from Delta:', err\.message\);\s*return \[\];/g, "console.warn('Error fetching open orders from Delta:', err.message);\n        throw err;");
fs.writeFileSync('lib/deltaExchangeEngine.ts', code);
console.log("Patched!");
