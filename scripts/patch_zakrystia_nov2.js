const fs = require('fs');
const path = require('path');

function patchFile(relPath, transforms) {
  const filePath = path.resolve(__dirname, '..', relPath);
  let content = fs.readFileSync(filePath, 'utf8');
  const isCrlf = content.includes('\r\n');
  if (isCrlf) {
    content = content.replace(/\r\n/g, '\n');
  }

  for (const t of transforms) {
    const searchNorm = t.search.replace(/\r\n/g, '\n');
    const replaceNorm = t.replace.replace(/\r\n/g, '\n');
    if (!content.includes(searchNorm)) {
      console.error('Target not found in ' + relPath + ':\n' + searchNorm.substring(0, 80));
      process.exit(1);
    }
    content = content.replace(searchNorm, replaceNorm);
  }

  if (isCrlf) {
    content = content.replace(/\n/g, '\r\n');
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully patched:', relPath);
}

// 1. Patch zakrystia.js (public and root js)
const zakrystiaTransforms = [
  // A. In aktualizujGodzinyZakrystiiDlaDnia: handle 1 listopada & 2 listopada and sanitize hD
  {
    search: `      if (tabelaZrodlowa && tabelaZrodlowa.harmonogramDni) {
        hD = tabelaZrodlowa.harmonogramDni[d] || tabelaZrodlowa.harmonogramDni['' + d] || null;
      }

      if (hD && ((hD.msze && hD.msze.length > 0) || (hD.nabozenstwa && hD.nabozenstwa.length > 0))) {
        var allDayEvents = [];`,
    replace: `      if (tabelaZrodlowa && tabelaZrodlowa.harmonogramDni) {
        hD = tabelaZrodlowa.harmonogramDni[d] || tabelaZrodlowa.harmonogramDni['' + d] || null;
      }

      // Bezpiecznik: 1 listopada to zawsze Uroczystość Wszystkich Świętych, 2 listopada to Dzień Zaduszny
      if (d === 1 && m === 10) {
        optHtml += '<option value="08:30" data-rodzaj="msza_swieto" data-punkty="5" data-nazwa="Uroczystość Wszystkich Świętych">08:30 (Uroczystość Wszystkich Świętych - 5 pkt)</option>';
        optHtml += '<option value="10:00" data-rodzaj="msza_swieto" data-punkty="5" data-nazwa="Uroczystość Wszystkich Świętych">10:00 (Uroczystość Wszystkich Świętych - 5 pkt)</option>';
        optHtml += '<option value="11:30" data-rodzaj="msza_swieto" data-punkty="5" data-nazwa="Uroczystość Wszystkich Świętych">11:30 (Uroczystość Wszystkich Świętych - 5 pkt)</option>';
        optHtml += '<option value="15:00" data-rodzaj="nabozenstwo" data-punkty="4" data-nazwa="Nabożeństwo na cmentarzu">15:00 (Nabożeństwo na cmentarzu - 4 pkt)</option>';
        optHtml += '<option value="16:00" data-rodzaj="msza_swieto" data-punkty="4" data-nazwa="Msza św.">16:00 (Msza św. - 4 pkt)</option>';
      } else if (d === 2 && m === 10) {
        optHtml += '<option value="09:00" data-rodzaj="msza" data-punkty="3" data-nazwa="Msza św.">09:00 (Msza św. - 3 pkt)</option>';
        optHtml += '<option value="16:00" data-rodzaj="msza" data-punkty="3" data-nazwa="Msza św.">16:00 (Msza św. - 3 pkt)</option>';
        optHtml += '<option value="18:00" data-rodzaj="msza" data-punkty="3" data-nazwa="Msza św.">18:00 (Msza św. - 3 pkt)</option>';
      } else if (hD && ((hD.msze && hD.msze.length > 0) || (hD.nabozenstwa && hD.nabozenstwa.length > 0))) {
        var allDayEvents = [];`
  },
  // B. Sanitize events from hD: never let msza szkolna or różańcowe leak onto Sunday
  {
    search: `        if (hD.msze && hD.msze.length > 0) {
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
        }`,
    replace: `        if (hD.msze && hD.msze.length > 0) {
          hD.msze.forEach(function(mItem) {
            var gC = cleanTime(mItem.godzina);
            var mTyp = mItem.typ || (dow === 0 ? 'msza_niedziela' : 'msza_tydzien');
            var mNazwa = mItem.nazwa || 'Msza św.';
            // Sanityzacja: w niedzielę lub sobotę nie ma mszy szkolnej z czwartku
            if ((dow === 0 || dow === 6) && (mTyp === 'msza_szkolna' || mNazwa.toLowerCase().indexOf('szkolna') !== -1)) return;
            allDayEvents.push({
              godzina: gC,
              rodzaj: mTyp,
              punkty: mItem.punkty,
              nazwa: mNazwa
            });
          });
        }`
  },
  {
    search: `        if (hD.nabozenstwa && hD.nabozenstwa.length > 0) {
          hD.nabozenstwa.forEach(function(nItem) {
            var gC = cleanTime(nItem.godzina);
            allDayEvents.push({
              godzina: gC,
              rodzaj: 'nabozenstwo',
              punkty: nItem.punkty,
              nazwa: nItem.nazwa
            });
          });
        }`,
    replace: `        if (hD.nabozenstwa && hD.nabozenstwa.length > 0) {
          hD.nabozenstwa.forEach(function(nItem) {
            var gC = cleanTime(nItem.godzina);
            var nNazwa = nItem.nazwa || 'Nabożeństwo';
            // Sanityzacja: nabożeństwo po mszy szkolnej tylko w czwartki
            if (dow !== 4 && nNazwa.toLowerCase().indexOf('szkolnej') !== -1) return;
            // Różaniec powszedni tylko w październiku (m === 9)
            if (m !== 9 && nNazwa.toLowerCase().indexOf('różańcowe') !== -1 && dow !== 0) return;
            allDayEvents.push({
              godzina: gC,
              rodzaj: 'nabozenstwo',
              punkty: nItem.punkty,
              nazwa: nNazwa
            });
          });
        }`
  },
  // C. In wczytajDaneDlaZakrystii: weekday maDyzur for atypical days like 2 listopada
  {
    search: `            } else {
              // W tygodniu (pn-pt):
              var stalyD = (w.stalyDzienTygodnia !== undefined && w.stalyDzienTygodnia !== null) ? w.stalyDzienTygodnia : -1;
              maDyzur = (stalyD === dow) || !!(kCur && kCur.maDyzur);
            }

            if (maDyzur) {
              var cellVal = kCur ? kCur.wartosc : null;
              var status = 'OBECNY';
              var domyslnyStatus = 'OBECNY';
              var typ = 'DOMYSLNY';
              var pkt = isHoliday5Pkt ? 5 : (isWeekendMass ? 3 : 5);`,
    replace: `            } else {
              // W tygodniu (pn-pt):
              // W dni nietypowe (np. 2 listopada Dzień Zaduszny z mszami 09:00, 16:00, 18:00) nikt nie ma narzuconego dyżuru grafikowego
              var isAtypicalWeekday = (dNum === 2 && currentMonthIdx === 10) || (hDzien && hDzien.msze && hDzien.msze.length > 1);
              var stalyD = (w.stalyDzienTygodnia !== undefined && w.stalyDzienTygodnia !== null) ? w.stalyDzienTygodnia : -1;
              maDyzur = !isAtypicalWeekday && ((stalyD === dow) || !!(kCur && kCur.maDyzur));
            }

            if (maDyzur) {
              var cellVal = kCur ? kCur.wartosc : null;
              var status = 'OBECNY';
              var domyslnyStatus = 'OBECNY';
              var typ = 'DOMYSLNY';
              var pkt = domyslnePkt;`
  },
  // D. In dodajMinistrantow (voluntary weekday on atypical 3 pkt days):
  {
    search: `          } else {
            pktDlaDodatkowego = 2;
            opisDodatkowy = 'Dodatkowa służba (+2 pkt)';
          }`,
    replace: `          } else {
            pktDlaDodatkowego = zakrystiaStan.punktyLiturgii || 2;
            opisDodatkowy = 'Dodatkowa służba (+' + pktDlaDodatkowego + ' pkt)';
          }`
  }
];

patchFile('public/js/zakrystia.js', zakrystiaTransforms);
patchFile('js/zakrystia.js', zakrystiaTransforms);

// 2. Patch tabela.js (public and root js)
const tabelaTransforms = [
  {
    search: `          var czyMaDyzurKomorki = !!k.maDyzur;
          if ((isSat || isSun || isHol) && typeof wyznaczEfektywnaGodzineWeekendowaDlaMinistranta === 'function') {`,
    replace: `          var czyMaDyzurKomorki = !!k.maDyzur;
          if (dNum === 2 && (dane.miesiacIdx === 10 || (dane.nazwaMiesiaca && dane.nazwaMiesiaca.toLowerCase().indexOf('listopad') !== -1))) {
            czyMaDyzurKomorki = false;
          }
          if ((isSat || isSun || isHol) && typeof wyznaczEfektywnaGodzineWeekendowaDlaMinistranta === 'function') {`
  }
];

patchFile('public/js/tabela.js', tabelaTransforms);
patchFile('js/tabela.js', tabelaTransforms);

// 3. Patch stale cache checks in auth.js and app.js
const authTransforms = [
  {
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
  }
];

patchFile('public/js/auth.js', authTransforms);
patchFile('js/auth.js', authTransforms);

console.log('All patches applied successfully!');
