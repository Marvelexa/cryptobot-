const fs = require('fs');

let file = fs.readFileSync('lib/deltaAutoTraderEngine.ts', 'utf8');

// 1. Startup check in runScanCycle: maximum 4 positions
const scanStartRegex = /(if\s*\(\s*Date\.now\(\)\s*-\s*this\.engineStartTime\s*<\s*this\.STARTUP_GRACE_PERIOD_MS\s*\)\s*\{\s*return;\s*\})/;
if (scanStartRegex.test(file)) {
  file = file.replace(scanStartRegex, `$1\r\n\r\n      // STRICT HARD CAP: Maximum 4 positions active at any time\r\n      if (this.state.activePositions.length >= 4) {\r\n        return;\r\n      }`);
  console.log('✓ Added 4-position check at start of runScanCycle');
} else {
  console.log('✗ scanStartRegex failed');
}

// 2. Check 3 in runScanCycle
const check3Regex = /\/\/\s*Check 3:\s*Max capacity limit[^\r\n]*[\r\n]+\s*if\s*\(false\)\s*\{\s*continue;\s*\}/;
if (check3Regex.test(file)) {
  file = file.replace(check3Regex, `// Check 3: Max capacity limit (strictly 4 concurrent positions maximum)\r\n        if (this.state.activePositions.length >= 4) {\r\n          console.log(\`⚠️ Active positions limit reached (4/4). Skipping trade scan for \${cleanDeltaSym}.\`);\r\n          break;\r\n        }`);
  console.log('✓ Updated Check 3 to strict 4 positions');
} else {
  console.log('✗ check3Regex failed');
}

// 3. executeNewPosition check
const execRegex = /(if\s*\(\s*existing\s*\)\s*\{[\s\S]*?return existing;\s*\})/;
if (execRegex.test(file)) {
  file = file.replace(execRegex, `$1\r\n\r\n    // HARD LIMIT: Strictly maximum 4 active positions allowed\r\n    if (this.state.activePositions.length >= 4) {\r\n      console.warn(\`🛑 Maximum concurrent positions limit (4) reached. Cannot execute new position for \${params.symbol}.\`);\r\n      return null;\r\n    }`);
  console.log('✓ Added 4-position check to executeNewPosition');
} else {
  console.log('✗ execRegex failed');
}

// 4. Candidate loop in runTickCycle
const candRegex = /(const candidates = shadowGate\.getActiveCandidates\(\);\s*for\s*\(const candidate of candidates\)\s*\{)/;
if (candRegex.test(file)) {
  file = file.replace(candRegex, `$1\r\n        if (this.state.activePositions.length >= 4) {\r\n          continue;\r\n        }`);
  console.log('✓ Added 4-position check to candidate evaluation in runTickCycle');
} else {
  console.log('✗ candRegex failed');
}

fs.writeFileSync('lib/deltaAutoTraderEngine.ts', file, 'utf8');
console.log('Successfully completed all updates to lib/deltaAutoTraderEngine.ts');
