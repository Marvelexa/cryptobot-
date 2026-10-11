const fs = require('fs');

let code = fs.readFileSync('lib/deltaAutoTraderEngine.ts', 'utf8');

// Lower the 4K capital guard so it doesn't freeze the bot if capital is slightly below 4000
code = code.replace(/minCapitalFloorINR: 4000,/g, 'minCapitalFloorINR: 3500, // Reduced floor to allow trading');
code = code.replace(/minFloorINR = 4000/g, 'minFloorINR = 3500');

fs.writeFileSync('lib/deltaAutoTraderEngine.ts', code);
console.log('Lowered capital floor to 3500 INR');
