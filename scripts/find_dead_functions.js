const fs = require('fs');
const html = fs.readFileSync('Index.html', 'utf8');

// Get all function names
const matches = [...html.matchAll(/function\s+([a-zA-Z0-9_$]+)\s*\(/g)];
const funcs = [...new Set(matches.map(m => m[1]))];

const deadFuncs = [];

funcs.forEach(fn => {
  // Regex to match fn as a function call: fn(, fn.apply, fn.call, or in HTML onclick="fn("
  // Note: we need to exclude the definition itself: function fn(
  const defRegex = new RegExp('function\\s+' + fn + '\\s*\\(', 'g');
  const allRegex = new RegExp('\\b' + fn + '\\b', 'g');

  const totalMatches = (html.match(allRegex) || []).length;
  const defMatches = (html.match(defRegex) || []).length;

  if (totalMatches <= defMatches) {
    deadFuncs.push(fn);
  }
});

console.log('Total functions:', funcs.length);
console.log('Uncalled functions (' + deadFuncs.length + '):', deadFuncs);
