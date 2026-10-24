const fs = require('fs');

let idx = fs.readFileSync('public/index.html', 'utf8');
idx = idx.replace('/js/liturgia.js?v=1.7.6', '/js/liturgia.js?v=1.7.8');
idx = idx.replace('</body></body>', '</body>');
fs.writeFileSync('public/index.html', idx, 'utf8');
console.log('[PASS] Updated index.html version and tags');
