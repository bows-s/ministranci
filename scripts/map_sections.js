const fs = require('fs');
const lines = fs.readFileSync('Index.html', 'utf8').split('\n');

const sections = [];
let currentSec = null;

for (let i = 2695; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('// =============================================================') ||
      line.includes('// ========================================================') ||
      line.includes('// =========================================================')) {
    const nextLine = lines[i + 1] ? lines[i + 1].replace(/\/\/\s*/, '').trim() : '';
    if (nextLine && !nextLine.includes('====') && !nextLine.startsWith('var ') && !nextLine.startsWith('function ')) {
      if (currentSec) {
        currentSec.endLine = i;
        sections.push(currentSec);
      }
      currentSec = {
        title: nextLine,
        startLine: i + 1,
        functions: [],
        linesCount: 0
      };
    }
  }
  if (currentSec) {
    const fnMatch = line.match(/function\s+([a-zA-Z0-9_$]+)\s*\(/);
    if (fnMatch) {
      currentSec.functions.push(fnMatch[1]);
    }
  }
}
if (currentSec) {
  currentSec.endLine = lines.length;
  sections.push(currentSec);
}

sections.forEach((s, idx) => {
  s.linesCount = s.endLine - s.startLine;
  console.log(`[${idx + 1}] Lines ${s.startLine}-${s.endLine} (${s.linesCount} lines, ${s.functions.length} funcs): ${s.title}`);
  if (s.functions.length > 0) {
    console.log(`     Funcs: ${s.functions.slice(0, 6).join(', ')}${s.functions.length > 6 ? '...' : ''}`);
  }
});
