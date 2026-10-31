const fs = require('fs');
const path = require('path');

// 1. Patch public/js/zakrystia.js
const zakPath = path.join(__dirname, '..', 'public', 'js', 'zakrystia.js');
let zakContent = fs.readFileSync(zakPath, 'utf8');
const isCrlfZak = zakContent.includes('\r\n');
zakContent = zakContent.replace(/\r\n/g, '\n');

// 1a. Exclude 2 listopada from czyToDzienSwiateczny5Pkt
const targetCzySwieto5Pkt = `    function czyToDzienSwiateczny5Pkt(dNum, optMiesiacIdx, optRok, daneTabeli) {
      var dNaglowek = (daneTabeli && daneTabeli.dniNaglowek) ? (daneTabeli.dniNaglowek[dNum - 1] || daneTabeli.dniNaglowek['' + (dNum - 1)]) : null;
      if (dNaglowek && (dNaglowek.czySwieto || dNaglowek.punktyZaObecnosc === 5)) return true;`;

const replaceCzySwieto5Pkt = `    function czyToDzienSwiateczny5Pkt(dNum, optMiesiacIdx, optRok, daneTabeli) {
      var mCheck = (optMiesiacIdx !== undefined && optMiesiacIdx !== null) ? optMiesiacIdx : ((daneTabeli && daneTabeli.miesiacIdx !== undefined) ? daneTabeli.miesiacIdx : (new Date()).getMonth());
      if (dNum === 2 && mCheck === 10) return false; // 2 listopada nie jest świętem
      var dNaglowek = (daneTabeli && daneTabeli.dniNaglowek) ? (daneTabeli.dniNaglowek[dNum - 1] || daneTabeli.dniNaglowek['' + (dNum - 1)]) : null;
      if (dNaglowek && (dNaglowek.czySwieto || dNaglowek.punktyZaObecnosc === 5)) return true;`;

if (zakContent.includes(targetCzySwieto5Pkt)) {
  zakContent = zakContent.replace(targetCzySwieto5Pkt, replaceCzySwieto5Pkt);
  console.log('[OK] Patched czyToDzienSwiateczny5Pkt in zakrystia.js');
} else {
  console.warn('[WARN] targetCzySwieto5Pkt not found');
}

// 1b. Fix wyznaczGodzineWeekendowaDlaGrupy to respect transition
const targetOuterWyznacz = `    function wyznaczGodzineWeekendowaDlaGrupy(grupaNazwa, nazwisko, rok, mIdx, docData) {
      var g = (grupaNazwa || '').toUpperCase();
      if (!g && nazwisko && typeof wyznaczGrupeParafialna === 'function') {
        g = wyznaczGrupeParafialna(nazwisko, '').toUpperCase();
      }
      var dData = docData || tabelaMiesiacaDane || {};
      if (dData && dData.godzinyGrup && Object.keys(dData.godzinyGrup).length > 0) {
        for (var k in dData.godzinyGrup) {
          if (g.indexOf(k.toUpperCase()) !== -1 || k.toUpperCase().indexOf(g) !== -1 || dopasujGrupe(k, g)) {
            return cleanTime(dData.godzinyGrup[k]);
          }
        }
      }`;

const replaceOuterWyznacz = `    function wyznaczGodzineWeekendowaDlaGrupy(grupaNazwa, nazwisko, rok, mIdx, docData) {
      var g = (grupaNazwa || '').toUpperCase();
      if (!g && nazwisko && typeof wyznaczGrupeParafialna === 'function') {
        g = wyznaczGrupeParafialna(nazwisko, '').toUpperCase();
      }
      var dData = docData || tabelaMiesiacaDane || {};
      var isTransition = (mIdx !== undefined && mIdx !== null && dData && dData.miesiacIdx !== undefined && mIdx !== dData.miesiacIdx);
      if (!isTransition && dData && dData.godzinyGrup && Object.keys(dData.godzinyGrup).length > 0) {
        for (var k in dData.godzinyGrup) {
          if (g.indexOf(k.toUpperCase()) !== -1 || k.toUpperCase().indexOf(g) !== -1 || dopasujGrupe(k, g)) {
            return cleanTime(dData.godzinyGrup[k]);
          }
        }
      }`;

if (zakContent.includes(targetOuterWyznacz)) {
  zakContent = zakContent.replace(targetOuterWyznacz, replaceOuterWyznacz);
  console.log('[OK] Patched outer wyznaczGodzineWeekendowaDlaGrupy in zakrystia.js');
} else {
  console.warn('[WARN] targetOuterWyznacz not found');
}

// 1c. Fix inner duplicate wyznaczGodzineWeekendowaDlaGrupy inside budujZakrystie
const targetInnerWyznacz = `        function wyznaczGodzineWeekendowaDlaGrupy(grupaNazwa, nazwisko) {
          var g = (grupaNazwa || '').toUpperCase();
          if (!g && nazwisko) {
            g = wyznaczGrupeParafialna(nazwisko, '').toUpperCase();
          }
          if (daneTabeli && daneTabeli.godzinyGrup && Object.keys(daneTabeli.godzinyGrup).length > 0) {
            for (var k in daneTabeli.godzinyGrup) {
              if (g.indexOf(k.toUpperCase()) !== -1 || k.toUpperCase().indexOf(g) !== -1 || dopasujGrupe(k, g)) {
                return cleanTime(daneTabeli.godzinyGrup[k]);
              }
            }
          }
          var rRot = currentYear;
          var mRot = currentMonthIdx;
          var daysInThisMZak = new Date(rRot, mRot + 1, 0).getDate();
          if (dow === 6 && dNum === daysInThisMZak) {
            mRot = (mRot + 1) % 12;
            if (mRot === 0) rRot += 1;
          }
          var rot = wyznaczRotowaneGodzinyGrup(rRot, mRot);
          for (var rk in rot) {
            if (g.indexOf(rk.toUpperCase()) !== -1 || rk.toUpperCase().indexOf(g) !== -1 || dopasujGrupe(rk, g)) {
              return rot[rk];
            }
          }
          return '10:00';
        }`;

const replaceInnerWyznacz = `        function wyznaczGodzineWeekendowaDlaGrupy(grupaNazwa, nazwisko) {
          var rRot = currentYear;
          var mRot = currentMonthIdx;
          var daysInThisMZak = new Date(rRot, mRot + 1, 0).getDate();
          if (dow === 6 && dNum === daysInThisMZak) {
            mRot = (mRot + 1) % 12;
            if (mRot === 0) rRot += 1;
          }
          return (typeof window !== 'undefined' && window.wyznaczGodzineWeekendowaDlaGrupy)
            ? window.wyznaczGodzineWeekendowaDlaGrupy(grupaNazwa, nazwisko, rRot, mRot, daneTabeli)
            : wyznaczGodzineWeekendowaDlaGrupy(grupaNazwa, nazwisko, rRot, mRot, daneTabeli);
        }`;

if (zakContent.includes(targetInnerWyznacz)) {
  zakContent = zakContent.replace(targetInnerWyznacz, replaceInnerWyznacz);
  console.log('[OK] Patched inner wyznaczGodzineWeekendowaDlaGrupy in zakrystia.js');
} else {
  console.warn('[WARN] targetInnerWyznacz not found');
}

// 1d. Expose wyznaczGodzineWeekendowaDlaGrupy to window
const targetExpose = `    function wyznaczEfektywnaGodzineWeekendowaDlaMinistranta(w, dNum, dow, docData) {`;
const replaceExpose = `    window.wyznaczGodzineWeekendowaDlaGrupy = wyznaczGodzineWeekendowaDlaGrupy;\n    function wyznaczEfektywnaGodzineWeekendowaDlaMinistranta(w, dNum, dow, docData) {`;
if (zakContent.includes(targetExpose) && !zakContent.includes('window.wyznaczGodzineWeekendowaDlaGrupy = wyznaczGodzineWeekendowaDlaGrupy;')) {
  zakContent = zakContent.replace(targetExpose, replaceExpose);
  console.log('[OK] Exposed wyznaczGodzineWeekendowaDlaGrupy to window in zakrystia.js');
}

// 1e. Fix Saturday 17:00 check in zakrystia.js so only the group assigned to 17:00 gets maDyzur
const targetSatCheck = `                if (dow === 6 && cleanG === "17:00") {
                  maDyzur = (userGodz === "17:00") || !!(kCur && kCur.maDyzur);
                } else {`;

const replaceSatCheck = `                if (dow === 6 && cleanG === "17:00") {
                  maDyzur = (userGodz === "17:00");
                } else {`;

if (zakContent.includes(targetSatCheck)) {
  zakContent = zakContent.replace(targetSatCheck, replaceSatCheck);
  console.log('[OK] Patched Saturday 17:00 maDyzur check in zakrystia.js');
} else {
  console.warn('[WARN] targetSatCheck not found');
}

// 1f. Exclude 2 listopada from isHoliday in aktualizujGodzinyZakrystiiDlaDnia
const targetAktualizujHoliday = `        var isHoliday = (d === 1 && m === 10) || (litInfo && (litInfo.ranga === 'Uroczystość' || (litInfo.nazwa && litInfo.nazwa.indexOf('Wszystkich Świętych') !== -1)));`;
const replaceAktualizujHoliday = `        var isHoliday = (d === 1 && m === 10) || (d !== 2 && litInfo && (litInfo.ranga === 'Uroczystość' || (litInfo.nazwa && litInfo.nazwa.indexOf('Wszystkich Świętych') !== -1)));`;

if (zakContent.includes(targetAktualizujHoliday)) {
  zakContent = zakContent.replace(targetAktualizujHoliday, replaceAktualizujHoliday);
  console.log('[OK] Excluded 2 listopada from isHoliday in aktualizujGodzinyZakrystiiDlaDnia');
}

if (isCrlfZak) zakContent = zakContent.replace(/\n/g, '\r\n');
fs.writeFileSync(zakPath, zakContent, 'utf8');

// 2. Patch public/js/tabela.js
const tabPath = path.join(__dirname, '..', 'public', 'js', 'tabela.js');
let tabContent = fs.readFileSync(tabPath, 'utf8');
const isCrlfTab = tabContent.includes('\r\n');
tabContent = tabContent.replace(/\r\n/g, '\n');

// Exclude 2 listopada from holiday styling in tabela.js header and cells
const targetTabHeaderHol = `var isHol = dayObj.czySwieto || (d === 0 && (dane.miesiacIdx === 10 || (dane.nazwaMiesiaca && dane.nazwaMiesiaca.toLowerCase().indexOf('listopad') !== -1)));`;
const replaceTabHeaderHol = `var isHol = (dayObj.czySwieto && dayObj.dzien !== 2) || (d === 0 && (dane.miesiacIdx === 10 || (dane.nazwaMiesiaca && dane.nazwaMiesiaca.toLowerCase().indexOf('listopad') !== -1)));`;

if (tabContent.includes(targetTabHeaderHol)) {
  tabContent = tabContent.replace(targetTabHeaderHol, replaceTabHeaderHol);
  console.log('[OK] Patched tabHeaderHol in tabela.js');
}

const targetTabCellHol = `var isHol = (naglowek[c] && naglowek[c].czySwieto) || (c === 0 && (dane.miesiacIdx === 10 || (dane.nazwaMiesiaca && dane.nazwaMiesiaca.toLowerCase().indexOf('listopad') !== -1)));`;
const replaceTabCellHol = `var isHol = (naglowek[c] && naglowek[c].czySwieto && naglowek[c].dzien !== 2) || (c === 0 && (dane.miesiacIdx === 10 || (dane.nazwaMiesiaca && dane.nazwaMiesiaca.toLowerCase().indexOf('listopad') !== -1)));`;

if (tabContent.includes(targetTabCellHol)) {
  tabContent = tabContent.replace(targetTabCellHol, replaceTabCellHol);
  console.log('[OK] Patched tabCellHol in tabela.js');
}

if (isCrlfTab) tabContent = tabContent.replace(/\n/g, '\r\n');
fs.writeFileSync(tabPath, tabContent, 'utf8');

// 3. Bump version in index.html and zakrystia/index.html to v=1.8.6
const bumpVersion = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/\?v=1\.[0-9]+\.[0-9]+/g, '?v=1.8.6');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[OK] Bumped scripts version to 1.8.6 in ' + filePath);
};

bumpVersion(path.join(__dirname, '..', 'public', 'index.html'));
bumpVersion(path.join(__dirname, '..', 'public', 'zakrystia', 'index.html'));

console.log('Patch for Saturday single group and Nov 2 non-holiday complete!');
