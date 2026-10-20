const fs = require('fs');
const content = fs.readFileSync('Index.html', 'utf8');

const styleMatch = content.match(/<style>([\s\S]*?)<\/style>/);
console.log('CSS size:', styleMatch ? styleMatch[1].length : 'not found');

const scriptMatch = content.match(/<body[\s\S]*?<script>([\s\S]*?)<\/script>\s*<\/body>/);
console.log('Main script size:', scriptMatch ? scriptMatch[1].length : 'not found');

// Find all functions in main script
if (scriptMatch) {
  const script = scriptMatch[1];
  const funcs = [...script.matchAll(/function\s+([a-zA-Z0-9_$]+)\s*\(/g)].map(m => m[1]);
  console.log('Total functions found:', funcs.length);
}
