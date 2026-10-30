const fs = require('fs');
const path = require('path');

const zakPath = path.join(__dirname, '..', 'public', 'js', 'zakrystia.js');
let content = fs.readFileSync(zakPath, 'utf8');
const isCrlf = content.includes('\r\n');
content = content.replace(/\r\n/g, '\n');

const targetBlock = `      if (hD && ((hD.msze && hD.msze.length > 0) || (hD.nabozenstwa && hD.nabozenstwa.length > 0))) {
        if (hD.msze && hD.msze.length > 0) {
          hD.msze.forEach(function(mItem) {
            var gC = cleanTime(mItem.godzina);
            var mTyp = mItem.typ || (dow === 0 ? 'msza_niedziela' : 'msza_tydzien');
            optHtml += '<option value="' + gC + '" data-rodzaj="' + mTyp + '" data-punkty="' + mItem.punkty + '" data-nazwa="' + mItem.nazwa + '">' + gC + ' (' + mItem.nazwa + ' - ' + mItem.punkty + ' pkt)</option>';
          });
        }
        if (hD.nabozenstwa && hD.nabozenstwa.length > 0) {
          hD.nabozenstwa.forEach(function(nItem) {
            var gC = cleanTime(nItem.godzina);
            if (optHtml.indexOf('value="' + gC + '"') === -1) {
              optHtml += '<option value="' + gC + '" data-rodzaj="nabozenstwo" data-punkty="' + nItem.punkty + '" data-nazwa="' + nItem.nazwa + '">' + gC + ' (' + nItem.nazwa + ' - ' + nItem.punkty + ' pkt)</option>';
            }
          });
        }
      }`;

const replacementBlock = `      if (hD && ((hD.msze && hD.msze.length > 0) || (hD.nabozenstwa && hD.nabozenstwa.length > 0))) {
        var allDayEvents = [];
        if (hD.msze && hD.msze.length > 0) {
          hD.msze.forEach(function(mItem) {
            var gC = cleanTime(mItem.godzina);
            var mTyp = mItem.typ || (dow === 0 ? 'msza_niedziela' : 'msza_tydzien');
            allDayEvents.push({
              godzina: gC,
              rodzaj: mTyp,
              punkty: mItem.punkty,
              nazwa: mItem.nazwa
            });
          });
        }
        if (hD.nabozenstwa && hD.nabozenstwa.length > 0) {
          hD.nabozenstwa.forEach(function(nItem) {
            var gC = cleanTime(nItem.godzina);
            allDayEvents.push({
              godzina: gC,
              rodzaj: 'nabozenstwo',
              punkty: nItem.punkty,
              nazwa: nItem.nazwa
            });
          });
        }
        allDayEvents.sort(function(a, b) {
          return (a.godzina || '').localeCompare(b.godzina || '');
        });
        allDayEvents.forEach(function(ev) {
          if (optHtml.indexOf('value="' + ev.godzina + '"') === -1) {
            optHtml += '<option value="' + ev.godzina + '" data-rodzaj="' + ev.rodzaj + '" data-punkty="' + ev.punkty + '" data-nazwa="' + ev.nazwa + '">' + ev.godzina + ' (' + ev.nazwa + ' - ' + ev.punkty + ' pkt)</option>';
          }
        });
      }`;

if (content.includes(targetBlock)) {
  content = content.replace(targetBlock, replacementBlock);
  if (isCrlf) content = content.replace(/\n/g, '\r\n');
  fs.writeFileSync(zakPath, content, 'utf8');
  console.log('[OK] Chronological sort applied in zakrystia.js');
} else {
  console.warn('[WARN] targetBlock not found in zakrystia.js');
}
