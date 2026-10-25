const fs = require('fs');
const path = require('path');

const zakPath = path.join(__dirname, '..', 'public', 'js', 'zakrystia.js');
let content = fs.readFileSync(zakPath, 'utf8');

const hasCrlf = content.includes('\r\n');
if (hasCrlf) content = content.replace(/\r\n/g, '\n');

// 1. Patch wyznaczEfektywnaGodzineWeekendowaDlaMinistranta
const target1 = `    function wyznaczEfektywnaGodzineWeekendowaDlaMinistranta(w, dNum, dow, docData) {
      if (!w) return { godzina: '10:00', zamiana: false, partner: null, oryginalnaGodzina: '10:00' };
      var nazwisko = (typeof w === 'string') ? w : (w.nazwisko || '');
      var grupa = (typeof w === 'object' && w) ? (w.grupa || '') : '';
      var dData = docData || tabelaMiesiacaDane || {};
      var bazaGodz = wyznaczGodzineWeekendowaDlaGrupy(grupa, nazwisko, dData.rok, dData.miesiacIdx, dData);`;

const replacement1 = `    function wyznaczEfektywnaGodzineWeekendowaDlaMinistranta(w, dNum, dow, docData) {
      if (!w) return { godzina: '10:00', zamiana: false, partner: null, oryginalnaGodzina: '10:00' };
      var nazwisko = (typeof w === 'string') ? w : (w.nazwisko || '');
      var grupa = (typeof w === 'object' && w) ? (w.grupa || '') : '';
      var dData = docData || tabelaMiesiacaDane || {};
      var rEff = dData.rok || (new Date()).getFullYear();
      var mEff = (dData.miesiacIdx !== undefined) ? dData.miesiacIdx : (new Date()).getMonth();
      var daysInThisM = new Date(rEff, mEff + 1, 0).getDate();
      if (dow === 6 && dNum === daysInThisM) {
        // Sobota na przełomie miesięcy: niedziela wypada 1. dnia kolejnego miesiąca!
        // To niedziela kolejnego miesiąca dyktuje rotację grup na ten weekend!
        mEff = (mEff + 1) % 12;
        if (mEff === 0) rEff += 1;
      }
      var bazaGodz = wyznaczGodzineWeekendowaDlaGrupy(grupa, nazwisko, rEff, mEff, dData);`;

if (content.includes(target1)) {
  content = content.replace(target1, replacement1);
  console.log('[OK] Patched wyznaczEfektywnaGodzineWeekendowaDlaMinistranta');
} else {
  console.warn('[WARN] target1 not found');
}

// 2. Patch wczytajDaneDlaZakrystii inner rot calculation
const target2 = `          var rot = wyznaczRotowaneGodzinyGrup(currentYear, currentMonthIdx);
          for (var rk in rot) {`;

const replacement2 = `          var rRot = currentYear;
          var mRot = currentMonthIdx;
          var daysInThisMZak = new Date(rRot, mRot + 1, 0).getDate();
          if (dow === 6 && dNum === daysInThisMZak) {
            mRot = (mRot + 1) % 12;
            if (mRot === 0) rRot += 1;
          }
          var rot = wyznaczRotowaneGodzinyGrup(rRot, mRot);
          for (var rk in rot) {`;

if (content.includes(target2)) {
  content = content.replace(target2, replacement2);
  console.log('[OK] Patched wczytajDaneDlaZakrystii inner rot');
} else {
  console.warn('[WARN] target2 not found');
}

// 3. Patch generujStanZFirestore weekend loop for last Saturday
const target3 = `      // Jeśli ministrant ma dyżur w soboty o 17:00 i miesiąc kończy się w sobotę (np. 31 października)
      if (mojaGodzinaNiedziela === "17:00" && daysInMonth >= 31) {
        var dtLast = new Date(currentYear, currentMonthIdx, daysInMonth);
        if (dtLast.getDay() === 6) {
          var kLastSat = (userRow && userRow.komorki) ? userRow.komorki[daysInMonth - 1] : null;
          if (kLastSat && kLastSat.maDyzur) {
            godzinyWeekendy[daysInMonth + 1] = {
              godzina: mojaGodzinaNiedziela,
              czyZamienione: false,
              czyUsprawiedliwiony: (kLastSat.wartosc === 0 || kLastSat.wartosc === "0")
            };
          }
        }
      }`;

const replacement3 = `      // Jeśli miesiąc kończy się w sobotę (np. 31 października) i ministrant ma dyżur na tej mszy wigilijnej (zgodnie z rotacją kolejnego miesiąca)
      if (daysInMonth >= 28) {
        var dtLast = new Date(currentYear, currentMonthIdx, daysInMonth);
        if (dtLast.getDay() === 6) {
          var kLastSat = (userRow && userRow.komorki) ? userRow.komorki[daysInMonth - 1] : null;
          if (kLastSat && kLastSat.maDyzur) {
            godzinyWeekendy[daysInMonth + 1] = {
              godzina: "17:00",
              czyZamienione: false,
              czyUsprawiedliwiony: (kLastSat.wartosc === 0 || kLastSat.wartosc === "0")
            };
          }
        }
      }`;

if (content.includes(target3)) {
  content = content.replace(target3, replacement3);
  console.log('[OK] Patched generujStanZFirestore last Saturday');
} else {
  console.warn('[WARN] target3 not found');
}

if (hasCrlf) content = content.replace(/\n/g, '\r\n');
fs.writeFileSync(zakPath, content, 'utf8');
console.log('zakrystia.js updated successfully.');
