const fs = require('fs');

const content = fs.readFileSync('Index.html', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  const lineNum = idx + 1;
  const l = line.trim();

  const isMonthRef = 
    l.includes('miesiacIdx') ||
    l.includes('targetDocKey') ||
    l.includes('września') ||
    l.includes('października') ||
    l.includes('M9_') ||
    (l.includes('2026') && !l.includes('color:') && !l.includes('border:') && !l.includes('background:') && !l.includes('#27272a'));

  if (isMonthRef) {
    if (
      l.includes(': 8') ||
      l.includes(': 9') ||
      l.includes('!== 8') ||
      l.includes('!== 9') ||
      l.includes('Październik') ||
      l.includes('Wrzesień') ||
      l.includes('|| 2026') ||
      l.includes('2026,') ||
      l.includes(', 2026') ||
      l.includes('M9_') ||
      l.includes('września') ||
      l.includes('października')
    ) {
      console.log(`${lineNum}: ${l.substring(0, 140)}`);
    }
  }
});
