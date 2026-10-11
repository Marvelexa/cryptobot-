const fs = require('fs');
let code = fs.readFileSync('src/components/DeltaAutoTraderCard.tsx', 'utf8');

// 1. Remove const [togglingInverse, setTogglingInverse] = useState(false);
code = code.replace(/const \[togglingInverse, setTogglingInverse\] = useState\(false\);\n?/g, '');

// 2. Remove const isInverseTrading = status?.isInverseTrading !== false;
code = code.replace(/const isInverseTrading = status\?\.isInverseTrading !== false;\n?/g, '');

// 3. Remove handleToggleInverse block
code = code.replace(/const handleToggleInverse = async \(\) => \{[\s\S]*?setTogglingInverse\(false\);\n\s*\};\n?/g, '');

// 4. Remove the badge
code = code.replace(/\{isInverseTrading \? \([\s\S]*?INVERSE MODE ACTIVE[\s\S]*?\) : null\}/g, '');
code = code.replace(/isInverseTrading\n\s*\?\s*'border-purple-500\/50'\n\s*:\s*'border-emerald-500\/50'/g, "'border-emerald-500/50'");
code = code.replace(/isInverseTrading\n\s*\?\s*'text-purple-400'\n\s*:\s*'text-emerald-400'/g, "'text-emerald-400'");

// 5. Remove the button
code = code.replace(/{\/\* Inverse Mode Toggle Button \*\/}[\s\S]*?<\/button>\n/g, '');

fs.writeFileSync('src/components/DeltaAutoTraderCard.tsx', code);
console.log('UI cleaned');
