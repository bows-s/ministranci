const fs = require('fs');

function checkFile(filename) {
  const content = fs.readFileSync(filename, 'utf8');
  const lines = content.split('\n');
  console.log(`=== ${filename} (${lines.length} lines) ===`);
  
  let matchCount = 0;
  lines.forEach((line, idx) => {
    const l = line.trim();
    if (
      /miesiacIdx.*[89]/.test(l) ||
      /stan\.miesiacIdx\s*!==\s*undefined\s*\?\s*stan\.miesiacIdx\s*:\s*[0-9]+/.test(l) ||
      /targetDocKey.*Październik/.test(l) ||
      /września|października|listopada|grudnia/i.test(l) ||
      /option.*value=['"](Wrzesień|Październik)/i.test(l) ||
      /sName\.toLowerCase\(\)\.indexOf\("pa"\)/.test(l) ||
      /\|\|\s*2026\b/.test(l) ||
      /defaultDocKey\s*=/.test(l)
    ) {
      matchCount++;
      if (matchCount <= 80) {
        console.log(`${idx + 1}: ${l.substring(0, 140)}`);
      }
    }
  });
  console.log(`Total matches in ${filename}: ${matchCount}\n`);
}

checkFile('Index.html');
checkFile('Zamiany.js');
