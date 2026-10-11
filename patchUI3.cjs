const fs = require('fs');
let code = fs.readFileSync('src/components/DeltaAutoTraderCard.tsx', 'utf8');

// Just remove all of handleToggleInverse
code = code.replace(/const handleToggleInverse = async \(\) => \{[\s\S]*?\}\s*;\s*\n/g, '');

// Remove the span with INVERSE MODE ACTIVE
code = code.replace(/<span className={`px-2\.5 py-0\.5 rounded-full text-\[10px\] font-mono font-bold border flex items-center gap-1\.5 transition-colors \$\{[\s\S]*?<\/span>/g, '');

fs.writeFileSync('src/components/DeltaAutoTraderCard.tsx', code);
console.log('UI cleaned again');
