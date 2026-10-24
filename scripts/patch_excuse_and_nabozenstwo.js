const fs = require('fs');

function patchFile(filePath, transforms) {
  let content = fs.readFileSync(filePath, 'utf8');
  transforms.forEach(({ name, search, replace }) => {
    const normContent = content.replace(/\r\n/g, '\n');
    const normSearch = search.replace(/\r\n/g, '\n');
    const normReplace = replace.replace(/\r\n/g, '\n');

    if (normContent.includes(normSearch)) {
      const isCRLF = content.includes('\r\n');
      const patchedNorm = normContent.replace(normSearch, normReplace);
      content = isCRLF ? patchedNorm.replace(/\n/g, '\r\n') : patchedNorm;
      console.log(`[PASS] ${filePath}: ${name}`);
    } else {
      console.warn(`[WARN] ${filePath}: pattern for '${name}' not found!`);
    }
  });
  fs.writeFileSync(filePath, content, 'utf8');
}

// 1. Patch public/js/zakrystia.js
patchFile('public/js/zakrystia.js', [
  {
    name: 'Do not propose excused ministranci on nabożeństwo',
    search: `            // Jeśli ministrant oddał swój dyżur z powiązanej mszy, nie proponuj go jako domyślnego uczestnika nabożeństwa:
            if (maDyzurNaMszy) {
              var ofZ = znajdzOferteDlaMinistranta(w.nazwisko, dNum, linkedMassHour);
              if (ofZ && (ofZ.status === 'PRZEJETE' || ofZ.status === 'OCZEKUJE' || ofZ.status === 'ZREALIZOWANE')) {
                maDyzurNaMszy = false;
              }
            }`,
    replace: `            // Jeśli ministrant oddał swój dyżur z powiązanej mszy LUB się z niej usprawiedliwił (0 pkt), nie proponuj go jako domyślnego uczestnika nabożeństwa:
            if (maDyzurNaMszy) {
              var isUsprawiedliwionyZMszy = (kCur && (kCur.wartosc === 0 || kCur.wartosc === '0' || kCur.czyUsprawiedliwiony)) ||
                                           (dow === 6 && kSun && (kSun.wartosc === 0 || kSun.wartosc === '0' || kSun.czyUsprawiedliwiony)) ||
                                           (dow === 0 && colIdx > 0 && w.komorki && w.komorki[colIdx - 1] && (w.komorki[colIdx - 1].wartosc === 0 || w.komorki[colIdx - 1].wartosc === '0' || w.komorki[colIdx - 1].czyUsprawiedliwiony));
              var ofZ = znajdzOferteDlaMinistranta(w.nazwisko, dNum, linkedMassHour);
              if (ofZ && (ofZ.status === 'PRZEJETE' || ofZ.status === 'OCZEKUJE' || ofZ.status === 'ZREALIZOWANE')) {
                maDyzurNaMszy = false;
              }
              if (isUsprawiedliwionyZMszy) {
                maDyzurNaMszy = false;
              }
            }`
  },
  {
    name: 'Preserve excuse in obliczSumeLiturgiiKomorki',
    search: `          var klucze = Object.keys(cell.liturgie);
          if (klucze.length === 0) {
            if (cell.maDyzur && cell.czyUsprawiedliwiony) return 0;
            return null;
          }`,
    replace: `          var klucze = Object.keys(cell.liturgie);
          if (klucze.length === 0) {
            if (cell.czyUsprawiedliwiony || cell.wartosc === 0 || cell.wartosc === '0' || (cell.maDyzur && (cell.wartosc === 0 || cell.wartosc === '0'))) {
              cell.czyUsprawiedliwiony = true;
              return 0;
            }
            return null;
          }`
  },
  {
    name: 'Preserve excuse on usunieci in zakrystia',
    search: `        // Najpierw usuń slot tej konkretnej liturgii dla osób usuniętych z obecności:
        (zakrystiaStan.usunieci || []).forEach(function(u) {
          var wierszU = znajdzWierszMinistranta(tabelaDoModyfikacji.wiersze, u.nazwisko);
          if (wierszU && wierszU.komorki && wierszU.komorki[colIdx]) {
            var cellU = wierszU.komorki[colIdx];
            if (cellU.liturgie && cellU.liturgie[gKey] !== undefined) {
              delete cellU.liturgie[gKey];
            }
            cellU.wartosc = obliczSumeLiturgiiKomorki(cellU);
          }
        });`,
    replace: `        // Najpierw usuń slot tej konkretnej liturgii dla osób usuniętych z obecności:
        (zakrystiaStan.usunieci || []).forEach(function(u) {
          var wierszU = znajdzWierszMinistranta(tabelaDoModyfikacji.wiersze, u.nazwisko);
          if (wierszU && wierszU.komorki && wierszU.komorki[colIdx]) {
            var cellU = wierszU.komorki[colIdx];
            var hadExcuseBefore = (cellU.wartosc === 0 || cellU.wartosc === '0' || cellU.czyUsprawiedliwiony || u.domyslnyStatus === 'USPRAWIEDLIWIONY');
            if (cellU.liturgie && cellU.liturgie[gKey] !== undefined) {
              delete cellU.liturgie[gKey];
            }
            if (hadExcuseBefore) {
              cellU.czyUsprawiedliwiony = true;
            }
            var sumU = obliczSumeLiturgiiKomorki(cellU);
            cellU.wartosc = (hadExcuseBefore && (sumU === null || sumU === undefined)) ? 0 : sumU;
          }
        });`
  },
  {
    name: 'Check czyUsprawiedliwiony in otworzModalZakrystia',
    search: `              var checkVal = cellVal;
              // Jeśli to sobota 17:00, a komórka soboty jest pusta, sprawdź czy ministrant nie miał wpisanego 0 w niedzieli:
              if (isWeekendMass && dow === 6 && (checkVal === null || checkVal === undefined || checkVal === '')) {
                if (kSun && (kSun.wartosc === 0 || kSun.wartosc === '0')) {
                  checkVal = 0;
                }
              }`,
    replace: `              var checkVal = cellVal;
              if (kCur && kCur.czyUsprawiedliwiony) {
                checkVal = 0;
              }
              // Jeśli to sobota 17:00, a komórka soboty jest pusta, sprawdź czy ministrant nie miał wpisanego 0 w niedzieli:
              if (isWeekendMass && dow === 6 && (checkVal === null || checkVal === undefined || checkVal === '')) {
                if (kSun && (kSun.wartosc === 0 || kSun.wartosc === '0' || kSun.czyUsprawiedliwiony)) {
                  checkVal = 0;
                }
              }
              // Jeśli to niedziela, a komórka niedzieli jest pusta, sprawdź czy nie miał wpisanego 0 w sobocie:
              if (isWeekendMass && dow === 0 && (checkVal === null || checkVal === undefined || checkVal === '')) {
                var satColCheck = colIdx - 1;
                if (satColCheck >= 0 && w.komorki && w.komorki[satColCheck] && (w.komorki[satColCheck].wartosc === 0 || w.komorki[satColCheck].wartosc === '0' || w.komorki[satColCheck].czyUsprawiedliwiony)) {
                  checkVal = 0;
                }
              }`
  }
]);

// 2. Patch public/js/gielda.js
patchFile('public/js/gielda.js', [
  {
    name: 'Set czyUsprawiedliwiony when excusing on giełda',
    search: `            if (targetIdx >= 0 && row.komorki[targetIdx]) {
              row.komorki[targetIdx].wartosc = 0; // Usprawiedliwienie 0 pkt na właściwy dzień mszy!
            }`,
    replace: `            if (targetIdx >= 0 && row.komorki[targetIdx]) {
              row.komorki[targetIdx].wartosc = 0; // Usprawiedliwienie 0 pkt na właściwy dzień mszy!
              row.komorki[targetIdx].czyUsprawiedliwiony = true;
            }`
  }
]);
