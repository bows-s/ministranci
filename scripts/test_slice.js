const fs = require('fs');
const path = require('path');

const html = fs.readFileSync('Index.html', 'utf8');
const lines = html.split('\n');

// 1. Extract CSS
const styleStart = lines.findIndex(l => l.includes('<style>'));
const styleEnd = lines.findIndex(l => l.includes('</style>'));
const cssContent = lines.slice(styleStart + 1, styleEnd).join('\n').trim();

// 2. Extract HTML body (without the main <script>)
const bodyStart = lines.findIndex(l => l.includes('<body>'));
const mainScriptStart = lines.findIndex((l, i) => i > bodyStart && l.includes('<script>'));
const mainScriptEnd = lines.findLastIndex(l => l.includes('</script>'));

const htmlHead = lines.slice(0, styleStart).join('\n');
const htmlBody = lines.slice(styleEnd + 1, mainScriptStart).join('\n');
const htmlFoot = lines.slice(mainScriptEnd + 1).join('\n');

// Script lines: mainScriptStart + 1 to mainScriptEnd - 1
const sLines = lines.slice(mainScriptStart + 1, mainScriptEnd);

// Let's define the line ranges (0-indexed in sLines)
// Map based on line numbers in original Index.html: (original line number - (mainScriptStart + 1))
function getSlice(fromOriginal, toOriginal) {
  const fromIdx = fromOriginal - (mainScriptStart + 1);
  const toIdx = toOriginal - (mainScriptStart + 1);
  return lines.slice(fromOriginal - 1, toOriginal).join('\n').trim();
}

console.log('mainScriptStart line:', mainScriptStart + 1);
console.log('mainScriptEnd line:', mainScriptEnd + 1);

// Modules mapping:
// firebase-config: 2698 to 2751
const firebaseConfigCode = getSlice(2698, 2751);

// utils: 3079 to 3375
const utilsCode = getSlice(3079, 3375);

// auth: 2752 to 3045 AND 3907 to 4357
const authCode = getSlice(2752, 3045) + '\n\n' + getSlice(3907, 4357);

// pwa: 3046 to 3078 (callBackend) AND 3376 to 3809 (PWA & FCM)
const pwaCode = getSlice(3046, 3078) + '\n\n' + getSlice(3376, 3809);

// liturgia: 5733 to 6385
const liturgiaCode = getSlice(5733, 6385);

// gamification: 4358 to 5111
const gamificationCode = getSlice(4358, 5111);

// ranking: 5112 to 5555
const rankingCode = getSlice(5112, 5555);

// gielda: 5556 to 5732 AND 11717 to 13025
const gieldaCode = getSlice(5556, 5732) + '\n\n' + getSlice(11717, 13025);

// zakrystia: 7491 to 11022
const zakrystiaCode = getSlice(7491, 11022);

// tabela: 11023 to 11716
const tabelaCode = getSlice(11023, 11716);

// app: 3810 to 3906 AND 6386 to 7490 AND 13026 to 13410
const appCode = getSlice(3810, 3906) + '\n\n' + getSlice(6386, 7490) + '\n\n' + getSlice(13026, 13410);

const modules = {
  'firebase-config.js': firebaseConfigCode,
  'utils.js': utilsCode,
  'auth.js': authCode,
  'pwa.js': pwaCode,
  'liturgia.js': liturgiaCode,
  'gamification.js': gamificationCode,
  'ranking.js': rankingCode,
  'gielda.js': gieldaCode,
  'zakrystia.js': zakrystiaCode,
  'tabela.js': tabelaCode,
  'app.js': appCode
};

console.log('Extracted modules:');
for (const [name, code] of Object.entries(modules)) {
  console.log(`- ${name}: ${code.length} chars, ${code.split('\n').length} lines`);
  try {
    new Function(code);
    console.log(`  [OK] Syntax valid for ${name}`);
  } catch (err) {
    console.error(`  [FAIL] Syntax error in ${name}:`, err.message);
  }
}
