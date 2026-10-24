const fs = require('fs');

let idx = fs.readFileSync('public/index.html', 'utf8');
idx = idx.replace('/js/zakrystia.js?v=1.7.7', '/js/zakrystia.js?v=1.7.9');
idx = idx.replace('/js/gielda.js?v=1.7.6', '/js/gielda.js?v=1.7.9');
fs.writeFileSync('public/index.html', idx, 'utf8');
console.log('[PASS] Updated index.html to v1.7.9');
