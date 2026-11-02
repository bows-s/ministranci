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

const zakrystiaTransforms = [
  // 1. In otworzModalDodajMinistranta: highlight and pin Kuba Brytner at the top on day 2
  {
    search: `      // Sortuj hierarchicznie: Animatorzy -> Lektorzy -> Starsi -> Młodsi -> Kandydaci
      dostepni.sort(function(a, b) {
        var stA = wyznaczStopienMinistranta(a, wRows);
        var stB = wyznaczStopienMinistranta(b, wRows);
        if (stB.ranga !== stA.ranga) return stB.ranga - stA.ranga;
        return a.localeCompare(b, 'pl');
      });`,
    replace: `      // Sortuj hierarchicznie: Dyżurny z poniedziałku (Kuba Brytner) na samej górze -> Animatorzy -> Lektorzy -> Starsi -> Młodsi -> Kandydaci
      dostepni.sort(function(a, b) {
        var isKubaA = (zakrystiaStan && zakrystiaStan.dzien === 2 && zakrystiaStan.miesiacIdx === 10 && czyToSamoNazwisko(a, 'Jakub Brytner'));
        var isKubaB = (zakrystiaStan && zakrystiaStan.dzien === 2 && zakrystiaStan.miesiacIdx === 10 && czyToSamoNazwisko(b, 'Jakub Brytner'));
        if (isKubaA) return -1;
        if (isKubaB) return 1;
        var stA = wyznaczStopienMinistranta(a, wRows);
        var stB = wyznaczStopienMinistranta(b, wRows);
        if (stB.ranga !== stA.ranga) return stB.ranga - stA.ranga;
        return a.localeCompare(b, 'pl');
      });`
  },
  // 2. In otworzModalDodajMinistranta: add badge for Kuba Brytner on day 2
  {
    search: `                      '<div style="font-size:11px; color:#a1a1aa; display:flex; gap:6px; align-items:center; margin-top:2px;">' +
                        '<span style="color:#60a5fa; font-weight:600;">' + stInfo.stopien + '</span>' +
                        '<span style="color:#52525b;">•</span>' +
                        '<span>' + gr + '</span>' +
                      '</div>'`,
    replace: `                      '<div style="font-size:11px; color:#a1a1aa; display:flex; gap:6px; align-items:center; margin-top:2px;">' +
                        '<span style="color:#60a5fa; font-weight:600;">' + stInfo.stopien + '</span>' +
                        '<span style="color:#52525b;">•</span>' +
                        '<span>' + gr + '</span>' +
                        ((zakrystiaStan && zakrystiaStan.dzien === 2 && zakrystiaStan.miesiacIdx === 10 && czyToSamoNazwisko(name, 'Jakub Brytner')) ? '<span style="color:#22c55e; font-weight:700;">• Dyżurny poniedziałkowy (+5 pkt)</span>' : '') +
                      '</div>'`
  },
  // 3. In zatwierdzDodanieMinistrantow: Kuba Brytner gets 5 pkt on day 2
  {
    search: `          } else {
            pktDlaDodatkowego = zakrystiaStan.punktyLiturgii || 2;
            opisDodatkowy = 'Dodatkowa służba (+' + pktDlaDodatkowego + ' pkt)';
          }`,
    replace: `          } else {
            var isKubaBrytnerSpecial = (zakrystiaStan.dzien === 2 && zakrystiaStan.miesiacIdx === 10 && czyToSamoNazwisko(name, 'Jakub Brytner'));
            pktDlaDodatkowego = isKubaBrytnerSpecial ? 5 : (zakrystiaStan.punktyLiturgii || 3);
            opisDodatkowy = isKubaBrytnerSpecial ? 'Dyżurny poniedziałkowy (+5 pkt)' : ('Dodatkowa służba (+' + pktDlaDodatkowego + ' pkt)');
          }`
  },
  // 4. In zakrystiaZapiszObecnosc -> wyliczPunktyMinistranta: ensure Kuba Brytner gets 5 pkt when present on day 2
  {
    search: `            } else if (m.typ === 'DODATKOWY') {
              if (zakrystiaStan.recznieUstawionePunkty) {
                dodajPkt = zakrystiaStan.punktyLiturgii || 3;
              } else if (typeof m.obecnyPkt === 'number') {
                dodajPkt = m.obecnyPkt;`,
    replace: `            } else if (m.typ === 'DODATKOWY') {
              var isKubaBrytnerSpecial = (zakrystiaStan.dzien === 2 && zakrystiaStan.miesiacIdx === 10 && czyToSamoNazwisko(m.nazwisko, 'Jakub Brytner'));
              if (isKubaBrytnerSpecial) {
                dodajPkt = 5;
              } else if (zakrystiaStan.recznieUstawionePunkty) {
                dodajPkt = zakrystiaStan.punktyLiturgii || 3;
              } else if (typeof m.obecnyPkt === 'number') {
                dodajPkt = m.obecnyPkt;`
  }
];

patchFile('public/js/zakrystia.js', zakrystiaTransforms);
fs.copyFileSync(path.resolve(__dirname, '../public/js/zakrystia.js'), path.resolve(__dirname, '../js/zakrystia.js'));
console.log('Successfully patched and synced zakrystia.js!');
