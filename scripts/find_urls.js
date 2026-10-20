const fs = require('fs');
const readline = require('readline');

const file = 'C:/Users/Maciek/.gemini/antigravity/brain/6b8a03e2-dcc7-4cc1-8a26-f68629bbb98f/.system_generated/logs/transcript.jsonl';
const rl = readline.createInterface({ input: fs.createReadStream(file) });

const foundUrls = new Set();
rl.on('line', (line) => {
  try {
    const obj = JSON.parse(line);
    const text = typeof obj.content === 'string' ? obj.content : JSON.stringify(obj.content || '');
    const matches = text.match(/https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s"'>)]*/g);
    if (matches) {
      matches.forEach(m => {
        if (!m.includes('google') && !m.includes('firebase') && !m.includes('github') && !m.includes('unpkg') && !m.includes('cdnjs') && !m.includes('gstatic')) {
          foundUrls.add(m);
        }
      });
    }
  } catch(e) {}
});

rl.on('close', () => {
  console.log('Found external URLs:');
  foundUrls.forEach(u => console.log(' -', u));
});
