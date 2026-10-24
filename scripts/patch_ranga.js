const fs = require('fs');

let c = fs.readFileSync('public/js/liturgia.js', 'utf8');
const search = "elRanga.innerText = czySobota ? (lit.ranga + ' (Niedziela)') : lit.ranga;";
const replace = "elRanga.innerText = czySobota ? (lit.ranga === 'Niedziela' ? 'Niedziela' : (lit.ranga + ' (Wigilia)')) : lit.ranga;";
if (c.includes(search)) {
  c = c.replace(search, replace);
  fs.writeFileSync('public/js/liturgia.js', c, 'utf8');
  console.log('[PASS] Updated elRanga in liturgia.js');
} else {
  console.warn('[WARN] Pattern not found in liturgia.js');
}
