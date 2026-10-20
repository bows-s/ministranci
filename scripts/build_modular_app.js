const fs = require('fs');
const path = require('path');

const sourceFile = fs.existsSync('Index.html.bak_refactor') ? 'Index.html.bak_refactor' : 'Index.html';
const html = fs.readFileSync(sourceFile, 'utf8');
const lines = html.split('\n');

function getSlice(from, to) {
  return lines.slice(from - 1, to).join('\n').trim();
}

// Ensure folders exist
['public/css', 'public/js', 'css', 'js'].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// 1. CSS
const styleStart = lines.findIndex(l => l.includes('<style>'));
const styleEnd = lines.findIndex(l => l.includes('</style>'));
const cssContent = lines.slice(styleStart + 1, styleEnd).join('\n').trim();

fs.writeFileSync('public/css/style.css', cssContent, 'utf8');
fs.writeFileSync('css/style.css', cssContent, 'utf8');
console.log('Saved css/style.css (' + cssContent.split('\n').length + ' lines)');

// 2. JS Modules
const modules = {
  'firebase-config.js': getSlice(2698, 2751),
  'utils.js': getSlice(3079, 3375),
  'auth.js': getSlice(2752, 3045) + '\n\n' + getSlice(4087, 4357),
  'pwa.js': getSlice(3046, 3078) + '\n\n' + getSlice(3376, 3809),
  'liturgia.js': getSlice(5733, 6385),
  'gamification.js': getSlice(4358, 5111),
  'ranking.js': getSlice(5112, 5555),
  'gielda.js': getSlice(5556, 5732) + '\n\n' + getSlice(11717, 13025),
  'zakrystia.js': getSlice(7491, 11022),
  'tabela.js': getSlice(11023, 11716),
  'app.js': getSlice(3810, 4086) + '\n\n' + getSlice(6386, 7490) + '\n\n' + getSlice(13026, 13410)
};

for (const [name, code] of Object.entries(modules)) {
  fs.writeFileSync('public/js/' + name, code, 'utf8');
  fs.writeFileSync('js/' + name, code, 'utf8');
  console.log('Saved js/' + name + ' (' + code.split('\n').length + ' lines)');
}

const headPart = lines.slice(0, styleStart).join('\n').trim();
const bodyPart = lines.slice(lines.findIndex(l => l.includes('<body')), lines.findIndex((l, i) => i > 2690 && l.includes('<script>'))).join('\n').trim();
const footPart = lines.slice(lines.findLastIndex(l => l.includes('</script>')) + 1).join('\n').trim();

const scriptTags = [
  '  <!-- Moduły aplikacji PWA Ministranci -->',
  '  <script src="/js/firebase-config.js?v=1.6.0"></script>',
  '  <script src="/js/utils.js?v=1.6.0"></script>',
  '  <script src="/js/auth.js?v=1.6.0"></script>',
  '  <script src="/js/pwa.js?v=1.6.0"></script>',
  '  <script src="/js/liturgia.js?v=1.6.0"></script>',
  '  <script src="/js/gamification.js?v=1.6.0"></script>',
  '  <script src="/js/ranking.js?v=1.6.0"></script>',
  '  <script src="/js/gielda.js?v=1.6.0"></script>',
  '  <script src="/js/zakrystia.js?v=1.6.0"></script>',
  '  <script src="/js/tabela.js?v=1.6.0"></script>',
  '  <script src="/js/app.js?v=1.6.0"></script>'
].join('\n');

const newHtml = [
  headPart,
  '  <link rel="stylesheet" href="/css/style.css?v=1.6.0">',
  '</head>',
  bodyPart,
  scriptTags,
  footPart
].join('\n');

fs.writeFileSync('Index.html', newHtml, 'utf8');
fs.writeFileSync('public/index.html', newHtml, 'utf8');
fs.writeFileSync('public/zakrystia/index.html', newHtml, 'utf8');

console.log('Generated new Index.html (' + newHtml.split('\n').length + ' lines, down from ' + lines.length + ' lines!)');
