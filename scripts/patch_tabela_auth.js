const fs = require('fs');
const path = require('path');

function patchFile(relPath, transforms) {
  const filePath = path.resolve(__dirname, '..', relPath);
  let content = fs.readFileSync(filePath, 'utf8');
  const isCrlf = content.includes('\r\n');
  if (isCrlf) content = content.replace(/\r\n/g, '\n');

  for (const t of transforms) {
    const s = t.search.replace(/\r\n/g, '\n');
    const r = t.replace.replace(/\r\n/g, '\n');
    if (!content.includes(s)) {
      console.error('Target not found in ' + relPath + ':\n' + s.substring(0, 80));
      process.exit(1);
    }
    content = content.replace(s, r);
  }
  if (isCrlf) content = content.replace(/\n/g, '\r\n');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully patched:', relPath);
}

// 1. tabela.js
patchFile('public/js/tabela.js', [{
  search: `          var czyMaDyzurKomorki = !!k.maDyzur;
          if ((isSat || isSun || isHol) && typeof wyznaczEfektywnaGodzineWeekendowaDlaMinistranta === 'function') {`,
  replace: `          var czyMaDyzurKomorki = !!k.maDyzur;
          if (dNum === 2 && (dane.miesiacIdx === 10 || (dane.nazwaMiesiaca && dane.nazwaMiesiaca.toLowerCase().indexOf('listopad') !== -1))) {
            czyMaDyzurKomorki = false;
          }
          if ((isSat || isSun || isHol) && typeof wyznaczEfektywnaGodzineWeekendowaDlaMinistranta === 'function') {`
}]);

// 2. auth.js
patchFile('public/js/auth.js', [{
  search: `          if (cachedTbl) {
            tabelaMiesiacaDane = cachedTbl;`,
  replace: `          if (cachedTbl) {
            var curActKey = pobierzAktywnyKluczMiesiaca();
            var pAct = (typeof parsujKluczMiesiaca === 'function') ? parsujKluczMiesiaca(curActKey) : null;
            if (pAct && cachedTbl.miesiacIdx !== undefined && cachedTbl.miesiacIdx !== pAct.miesiacIdx) {
              cachedTbl = null;
            }
          }
          if (cachedTbl) {
            tabelaMiesiacaDane = cachedTbl;`
}]);

// Sync public/js to js/
fs.copyFileSync(path.resolve(__dirname, '../public/js/zakrystia.js'), path.resolve(__dirname, '../js/zakrystia.js'));
fs.copyFileSync(path.resolve(__dirname, '../public/js/tabela.js'), path.resolve(__dirname, '../js/tabela.js'));
fs.copyFileSync(path.resolve(__dirname, '../public/js/auth.js'), path.resolve(__dirname, '../js/auth.js'));
console.log('All patches and sync completed!');
