const fs = require('fs');
const html = fs.readFileSync('Index.html', 'utf8');
const scripts = [...html.matchAll(/<script[\s\S]*?>([\s\S]*?)<\/script>/gi)];
console.log('Found scripts:', scripts.length);
scripts.forEach((s, idx) => {
  const code = s[1].trim();
  if (!code) return;
  try {
    new Function(code);
    console.log(`Script ${idx} OK (${code.length} chars)`);
  } catch(err) {
    console.error(`Script ${idx} Error:`, err.message);
    process.exit(1);
  }
});
console.log('All scripts validated successfully!');
