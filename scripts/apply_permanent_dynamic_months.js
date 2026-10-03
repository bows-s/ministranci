const fs = require('fs');

console.log('--- Applying Permanent Dynamic Months to Index.html and Zamiany.js ---');

let indexContent = fs.readFileSync('Index.html', 'utf8');

// 1. Add parsujKluczMiesiaca, wyznaczPoprzedniKluczMiesiaca, wyznaczNastepnyKluczMiesiaca, and zapewnijStanGrafikuDlaMiesiaca
const targetAnchor1 = `    function wyznaczKluczMiesiaca(dataOdniesienia) {
      var d = dataOdniesienia || new Date();
      var miesiacePL = [
        "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
        "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
      ];
      return miesiacePL[d.getMonth()] + "_" + d.getFullYear();
    }`;

const replacementAnchor1 = `    function wyznaczKluczMiesiaca(dataOdniesienia) {
      var d = dataOdniesienia || new Date();
      var miesiacePL = [
        "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
        "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
      ];
      return miesiacePL[d.getMonth()] + "_" + d.getFullYear();
    }

    function parsujKluczMiesiaca(klucz) {
      var polishMonthsAll = [
        "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
        "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
      ];
      var now = new Date();
      if (!klucz || typeof klucz !== 'string') {
        return { rok: now.getFullYear(), miesiacIdx: now.getMonth(), nazwaMiesiaca: polishMonthsAll[now.getMonth()] };
      }
      var parts = klucz.split('_');
      var mName = parts[0] || '';
      var r = parseInt(parts[1], 10) || now.getFullYear();
      var mIdx = polishMonthsAll.findIndex(function(m) { return m.toLowerCase() === mName.toLowerCase(); });
      if (mIdx === -1) mIdx = now.getMonth();
      return {
        rok: r,
        miesiacIdx: mIdx,
        nazwaMiesiaca: polishMonthsAll[mIdx]
      };
    }

    function wyznaczPoprzedniKluczMiesiaca(klucz) {
      var p = parsujKluczMiesiaca(klucz);
      var prevDt = new Date(p.rok, p.miesiacIdx - 1, 1);
      return wyznaczKluczMiesiaca(prevDt);
    }

    function wyznaczNastepnyKluczMiesiaca(klucz) {
      var p = parsujKluczMiesiaca(klucz);
      var nextDt = new Date(p.rok, p.miesiacIdx + 1, 1);
      return wyznaczKluczMiesiaca(nextDt);
    }

    async function zapewnijStanGrafikuDlaMiesiaca(docelowyKlucz, optBazaDane) {
      if (!dbFirestore) return null;
      var targetP = parsujKluczMiesiaca(docelowyKlucz);
      var targetRok = targetP.rok;
      var targetMIdx = targetP.miesiacIdx;
      var docelowaNazwa = wyznaczKluczMiesiaca(new Date(targetRok, targetMIdx, 1));

      try {
        var checkSnap = await dbFirestore.collection('stan_grafiku').doc(docelowaNazwa).get().catch(function() { return null; });
        if (checkSnap && checkSnap.exists && checkSnap.data() && checkSnap.data().wiersze && checkSnap.data().wiersze.length) {
          return checkSnap.data();
        }

        var baza = optBazaDane;
        if (!baza || !baza.wiersze) {
          var prevKlucz = wyznaczPoprzedniKluczMiesiaca(docelowaNazwa);
          var prevSnap = await dbFirestore.collection('stan_grafiku').doc(prevKlucz).get().catch(function() { return null; });
          if (prevSnap && prevSnap.exists && prevSnap.data() && prevSnap.data().wiersze) {
            baza = prevSnap.data();
          } else {
            var fallSnap = await dbFirestore.collection('stan_grafiku').doc('Wrzesień_2026').get().catch(function() { return null; });
            if (fallSnap && fallSnap.exists && fallSnap.data() && fallSnap.data().wiersze) {
              baza = fallSnap.data();
            }
          }
        }

        if (!baza || !baza.wiersze || !baza.wiersze.length) {
          return null;
        }

        var skrotyDni = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"];
        var dniWNowym = new Date(targetRok, targetMIdx + 1, 0).getDate();
        var dniNaglowek = [];
        for (var d = 1; d <= dniWNowym; d++) {
          var dt = new Date(targetRok, targetMIdx, d);
          var dow = dt.getDay();
          dniNaglowek.push({
            dzien: d,
            skrotDnia: skrotyDni[dow],
            czySobota: dow === 6,
            czyNiedziela: dow === 0
          });
        }

        var rotowaneGodziny = wyznaczRotowaneGodzinyGrup(targetRok, targetMIdx);
        var noweWiersze = [];
        var lp = 1;

        for (var i = 0; i < baza.wiersze.length; i++) {
          var w = baza.wiersze[i];
          if (!w || !w.nazwisko) continue;
          if (w.nazwisko.toLowerCase().indexOf('mateusz pokojski') !== -1) continue;

          var stalyDzien = (w.stalyDzienTygodnia !== undefined && w.stalyDzienTygodnia > 0) ? w.stalyDzienTygodnia : -1;
          if (stalyDzien === -1 && w.komorki && w.komorki.length) {
            for (var dayIdx = 0; dayIdx < w.komorki.length; dayIdx++) {
              var dtPrev = new Date(baza.rok || (new Date()).getFullYear(), baza.miesiacIdx !== undefined ? baza.miesiacIdx : 8, dayIdx + 1);
              var dowPrev = dtPrev.getDay();
              if (dowPrev >= 1 && dowPrev <= 5 && w.komorki[dayIdx] && w.komorki[dayIdx].maDyzur) {
                stalyDzien = dowPrev;
                break;
              }
            }
          }

          var noweKomorki = [];
          for (var cD = 1; cD <= dniWNowym; cD++) {
            var dtN = new Date(targetRok, targetMIdx, cD);
            var dowN = dtN.getDay();
            var maDyzur = (dowN === 0 || (dowN >= 1 && dowN <= 5 && dowN === stalyDzien));
            noweKomorki.push({ maDyzur: maDyzur, wartosc: null });
          }

          noweWiersze.push({
            lp: lp++,
            nazwisko: w.nazwisko,
            grupa: w.grupa || "Ogólna",
            stopien: w.stopien || "Ministrant",
            stopienRanga: w.stopienRanga || 1,
            stalyDzienTygodnia: stalyDzien,
            ostatniaZmianaDnia: w.ostatniaZmianaDnia || null,
            komorki: noweKomorki,
            suma: 0
          });
        }

        var rankingRokPrzeniesiony = [];
        var prevRok = baza.rankingRok || baza.rankingMiesiac || [];
        for (var k = 0; k < noweWiersze.length; k++) {
          var nw = noweWiersze[k];
          var prevItem = prevRok.find(function(p) { return p.nazwisko && czyToTenSamMinistrant(p.nazwisko, nw.nazwisko); });
          rankingRokPrzeniesiony.push({
            nazwisko: nw.nazwisko,
            punkty: prevItem ? (prevItem.punkty || prevItem.suma || 0) : 0,
            grupa: nw.grupa
          });
        }
        rankingRokPrzeniesiony.sort(function(a, b) { return b.punkty - a.punkty; });
        var poz = 1;
        rankingRokPrzeniesiony.forEach(function(r, idx) {
          if (idx > 0 && r.punkty < rankingRokPrzeniesiony[idx - 1].punkty) poz = idx + 1;
          r.pozycja = poz;
        });

        var polishMonthsAll = [
          "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
          "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
        ];
        var nowyStanGrafiku = {
          nazwaMiesiaca: polishMonthsAll[targetMIdx],
          rok: targetRok,
          miesiacIdx: targetMIdx,
          dniNaglowek: dniNaglowek,
          grupy: [
            { nazwa: "I GRUPA (CZERWONA)", godzinaNiedziela: rotowaneGodziny["I GRUPA (CZERWONA)"] },
            { nazwa: "II GRUPA (POMARAŃCZOWA)", godzinaNiedziela: rotowaneGodziny["II GRUPA (POMARAŃCZOWA)"] },
            { nazwa: "III GRUPA (ZIELONA)", godzinaNiedziela: rotowaneGodziny["III GRUPA (ZIELONA)"] },
            { nazwa: "IV GRUPA (ŻÓŁTA)", godzinaNiedziela: rotowaneGodziny["IV GRUPA (ŻÓŁTA)"] }
          ],
          wiersze: noweWiersze,
          ranking: noweWiersze.map(function(w) { return { nazwisko: w.nazwisko, suma: 0, miejsce: 1, grupa: w.grupa }; }),
          rankingMiesiac: noweWiersze.map(function(w) { return { nazwisko: w.nazwisko, punkty: 0, pozycja: 1, grupa: w.grupa }; }),
          rankingRok: rankingRokPrzeniesiony,
          rankingMinusy: [],
          rankingiMiesiecy: baza.rankingiMiesiecy || [],
          gieldaTydzien: [],
          gieldaNiedziele: [],
          zamianyZastepstwa: [],
          wolneZastepstwa: [],
          liturgieDodatkowe: [],
          historiaWpisow: [],
          zaktualizowano: new Date().toISOString()
        };

        await dbFirestore.collection('stan_grafiku').doc(docelowaNazwa).set(nowyStanGrafiku);
        console.log('Automatycznie wygenerowano i zapisano miesiąc w Firestore:', docelowaNazwa);
        return nowyStanGrafiku;
      } catch(eGen) {
        console.warn('Błąd w zapewnijStanGrafikuDlaMiesiaca:', eGen);
        return null;
      }
    }`;

if (indexContent.includes(targetAnchor1)) {
  indexContent = indexContent.replace(targetAnchor1, replacementAnchor1);
  console.log('✓ Dodano funkcje parsujKluczMiesiaca i zapewnijStanGrafikuDlaMiesiaca.');
} else {
  console.warn('⚠️ Target anchor 1 nie został znaleziony w Index.html');
}

// 2. formatujDateDnia (lines 2977-2978)
indexContent = indexContent.replace(
  /var r = optRok \|\| \(stan && stan\.rok\) \|\| 2026;\s*var m = \(optMiesiacIdx !== undefined && optMiesiacIdx !== null\) \? optMiesiacIdx : \(\(stan && stan\.miesiacIdx !== undefined\) \? stan\.miesiacIdx : 8\);/,
  `var r = optRok || (stan && stan.rok) || (new Date()).getFullYear();\n      var m = (optMiesiacIdx !== undefined && optMiesiacIdx !== null) ? optMiesiacIdx : ((stan && stan.miesiacIdx !== undefined) ? stan.miesiacIdx : (new Date()).getMonth());`
);

// 3. startApp stan_grafiku load (lines 3676-3686)
const targetStanLoad = `        var mDocId = pobierzAktywnyKluczMiesiaca();
        dbFirestore.collection('stan_grafiku').doc(mDocId).get().then(function(doc) {
          ukryjSpinner();
          pokazMiniRefresh(false);
          if (doc.exists && doc.data()) {
            tabelaMiesiacaDane = doc.data();
            try { localStorage.setItem('min_cached_tabela', JSON.stringify(tabelaMiesiacaDane)); } catch(e) {}
            if (sName) {
              var stanZFirestore = generujStanZFirestore(sName, doc.data());
              if (stanZFirestore) renderujDane(stanZFirestore);
            }
          }
        }).catch(function(e) {`;

const replacementStanLoad = `        var mDocId = pobierzAktywnyKluczMiesiaca();
        dbFirestore.collection('stan_grafiku').doc(mDocId).get().then(async function(doc) {
          ukryjSpinner();
          pokazMiniRefresh(false);
          var docData = (doc.exists && doc.data()) ? doc.data() : null;
          if (!docData) {
            console.log('Miesiąc ' + mDocId + ' nie istnieje w Firestore - uruchamiam auto-generowanie...');
            docData = await zapewnijStanGrafikuDlaMiesiaca(mDocId);
          }
          if (docData) {
            tabelaMiesiacaDane = docData;
            try { localStorage.setItem('min_cached_tabela', JSON.stringify(tabelaMiesiacaDane)); } catch(e) {}
            if (sName) {
              var stanZFirestore = generujStanZFirestore(sName, docData);
              if (stanZFirestore) renderujDane(stanZFirestore);
            }
          }
        }).catch(function(e) {`;

if (indexContent.includes(targetStanLoad)) {
  indexContent = indexContent.replace(targetStanLoad, replacementStanLoad);
  console.log('✓ Zaktualizowano startApp o auto-generowanie brakującego miesiąca.');
} else {
  console.warn('⚠️ targetStanLoad nie został znaleziony');
}

// 4. odswiezDane (lines 3939-3959)
const targetOdswiez = `      if (dbFirestore) {
        dbFirestore.collection('stan_grafiku').doc(mDocId).get().then(function(doc) {
          pokazMiniRefresh(false);
          if (doc.exists && doc.data()) {
            tabelaMiesiacaDane = doc.data();`;

const replacementOdswiez = `      if (dbFirestore) {
        dbFirestore.collection('stan_grafiku').doc(mDocId).get().then(async function(doc) {
          pokazMiniRefresh(false);
          var docData = (doc.exists && doc.data()) ? doc.data() : null;
          if (!docData) {
            docData = await zapewnijStanGrafikuDlaMiesiaca(mDocId);
          }
          if (docData) {
            tabelaMiesiacaDane = docData;`;

if (indexContent.includes(targetOdswiez)) {
  indexContent = indexContent.replace(targetOdswiez, replacementOdswiez);
  console.log('✓ Zaktualizowano odswiezDane o auto-generowanie.');
} else {
  console.warn('⚠️ targetOdswiez nie został znaleziony');
}

// 5. Ranking: var currentMIdx = (stan.miesiacIdx !== undefined) ? stan.miesiacIdx : 8;
indexContent = indexContent.replace(
  /var currentMIdx = \(stan\.miesiacIdx !== undefined\) \? stan\.miesiacIdx : 8;/,
  `var currentMIdx = (stan.miesiacIdx !== undefined) ? stan.miesiacIdx : (new Date()).getMonth();`
);
indexContent = indexContent.replace(/stan\.rok \|\| 2026/g, `stan.rok || (new Date()).getFullYear()`);

// 6. Liturgie sort: ta and tb
indexContent = indexContent.replace(
  /var ta = new Date\(a\.rok \|\| 2026, \(a\.miesiacIdx !== undefined\) \? a\.miesiacIdx : 8, a\.dzien\)\.getTime\(\);\s*var tb = new Date\(b\.rok \|\| 2026, \(b\.miesiacIdx !== undefined\) \? b\.miesiacIdx : 8, b\.dzien\)\.getTime\(\);/g,
  `var curYDef = (new Date()).getFullYear();\n          var curMDef = (new Date()).getMonth();\n          var ta = new Date(a.rok || curYDef, (a.miesiacIdx !== undefined) ? a.miesiacIdx : curMDef, a.dzien).getTime();\n          var tb = new Date(b.rok || curYDef, (b.miesiacIdx !== undefined) ? b.miesiacIdx : curMDef, b.dzien).getTime();`
);

// 7. mGenMinus: polishMonthsGenMinus[currentMonthIdx] || (docData.nazwaMiesiaca || "września")
indexContent = indexContent.replace(
  /var mGenMinus = polishMonthsGenMinus\[currentMonthIdx\] \|\| \(docData\.nazwaMiesiaca \|\| "września"\);/,
  `var mGenMinus = polishMonthsGenMinus[currentMonthIdx] || docData.nazwaMiesiaca || polishMonthsGenMinus[(new Date()).getMonth()];`
);

// 8. czyLiturgiaJuzMinela: var r = optRok || 2026;
indexContent = indexContent.replace(
  /function czyLiturgiaJuzMinela\(dzien, godzina, dzisDzien, optRok, optMiesiacIdx\) \{\s*var d = parseInt\(dzien, 10\);\s*if \(isNaN\(d\)\) return false;\s*var now = new Date\(\);\s*var r = optRok \|\| 2026;/,
  `function czyLiturgiaJuzMinela(dzien, godzina, dzisDzien, optRok, optMiesiacIdx) {\n      var d = parseInt(dzien, 10);\n      if (isNaN(d)) return false;\n      var now = new Date();\n      var r = optRok || now.getFullYear();`
);

// 9. wyznaczRotowaneGodzinyGrup
indexContent = indexContent.replace(
  /var r = \(rok !== undefined && rok !== null\) \? parseInt\(rok, 10\) : 2026;\s*var m = \(miesiacIdx !== undefined && miesiacIdx !== null\) \? parseInt\(miesiacIdx, 10\) : 8;/,
  `var r = (rok !== undefined && rok !== null) ? parseInt(rok, 10) : (new Date()).getFullYear();\n      var m = (miesiacIdx !== undefined && miesiacIdx !== null) ? parseInt(miesiacIdx, 10) : (new Date()).getMonth();`
);

// 10. budujZakrystie date & month resolution
indexContent = indexContent.replace(
  /var currentYear = daneTabeli\.rok \|\| \(targetDocKey\.indexOf\('2026'\) !== -1 \? 2026 : now\.getFullYear\(\)\);\s*var currentMonthIdx = \(daneTabeli\.miesiacIdx !== undefined\) \? daneTabeli\.miesiacIdx : \(targetDocKey\.indexOf\('Październik'\) !== -1 \? 9 : now\.getMonth\(\)\);/,
  `var parsedTKey = parsujKluczMiesiaca(targetDocKey);\n        var currentYear = daneTabeli.rok || parsedTKey.rok || now.getFullYear();\n        var currentMonthIdx = (daneTabeli.miesiacIdx !== undefined) ? daneTabeli.miesiacIdx : parsedTKey.miesiacIdx;`
);

// 11. ulDocKey in budujZakrystie
indexContent = indexContent.replace(
  /var ulDocKey = isUlNext \? wyznaczKluczMiesiaca\(new Date\(ul\.rok \|\| 2026, ul\.miesiacIdx, 1\)\) : '';/,
  `var ulDocKey = isUlNext ? wyznaczKluczMiesiaca(new Date(ul.rok || currentYear, ul.miesiacIdx, 1)) : '';`
);

// 12. logIdPrefix and Zakrystia fetching (lines 7795-7796)
indexContent = indexContent.replace(
  /var logIdPrefix = isNextMonthZak \? 'M9_' : '';\s*var lId = targetG \? \(logIdPrefix \+ \(\(parseInt\(wybranyDzien, 10\) < 10 \? '0' : ''\) \+ parseInt\(wybranyDzien, 10\)\) \+ '_' \+ targetG\.replace\(':', ''\)\) : null;/,
  `var parsedTgt = parsujKluczMiesiaca(targetDocKey);\n        var logIdPrefix = (parsedTgt.miesiacIdx !== 8 || parsedTgt.rok !== 2026) ? ('M' + parsedTgt.miesiacIdx + '_') : '';\n        var lId = targetG ? (logIdPrefix + ((parseInt(wybranyDzien, 10) < 10 ? '0' : '') + parseInt(wybranyDzien, 10)) + '_' + targetG.replace(':', '')) : null;`
);

// 13. zakrystiaStan assignment (lines 7828-7832)
indexContent = indexContent.replace(
  /rok: dOb\.rok \|\| \(targetDocKey\.indexOf\('2026'\) !== -1 \? 2026 : 2026\),\s*miesiacIdx: \(dOb\.miesiacIdx !== undefined\) \? dOb\.miesiacIdx : \(isNextMonthZak \? 9 : 8\),\s*dzien: dOb\.dzien \|\| parseInt\(wybranyDzien, 10\),\s*godzina: dOb\.godzina \|\| cleanTime\(wybranaGodzina\),\s*dataTekst: dOb\.dataTekst \|\| \(wybranyDzien \+ \(isNextMonthZak \? ' października' : ' września'\)\),/,
  `var parsedTgtZ = parsujKluczMiesiaca(targetDocKey);\n              zakrystiaStan = {\n                sukces: true,\n                docKey: targetDocKey,\n                rok: dOb.rok || parsedTgtZ.rok,\n                miesiacIdx: (dOb.miesiacIdx !== undefined) ? dOb.miesiacIdx : parsedTgtZ.miesiacIdx,\n                dzien: dOb.dzien || parseInt(wybranyDzien, 10),\n                godzina: dOb.godzina || cleanTime(wybranaGodzina),\n                dataTekst: dOb.dataTekst || (wybranyDzien + ' ' + (polishMonthsGenitive[parsedTgtZ.miesiacIdx] || '')),`
);

// 14. zakrystiaAutoZapiszFunkcje and sprawdzFunkcjeNaDzisiaj
indexContent = indexContent.replace(
  /function zakrystiaAutoZapiszFunkcje\(\) \{\s*if \(!dbFirestore \|\| !zakrystiaStan \|\| !zakrystiaStan\.godzina\) return;\s*var dNum = zakrystiaStan\.dzien;\s*var gStr = zakrystiaStan\.godzina;\s*var lId = \(\(dNum < 10 \? '0' : ''\) \+ dNum\) \+ '_' \+ gStr\.replace\(':', ''\);/,
  `function zakrystiaAutoZapiszFunkcje() {\n      if (!dbFirestore || !zakrystiaStan || !zakrystiaStan.godzina) return;\n      var dNum = zakrystiaStan.dzien;\n      var gStr = zakrystiaStan.godzina;\n      var mPfx = (zakrystiaStan.miesiacIdx !== undefined && (zakrystiaStan.miesiacIdx !== 8 || (zakrystiaStan.rok && zakrystiaStan.rok !== 2026))) ? ('M' + zakrystiaStan.miesiacIdx + '_') : '';\n      var lId = mPfx + ((dNum < 10 ? '0' : '') + dNum) + '_' + gStr.replace(':', '');`
);

indexContent = indexContent.replace(
  /var now = new Date\(\);\s*var dNum = now\.getDate\(\);\s*var dPrefix = \(dNum < 10 \? '0' : ''\) \+ dNum \+ '_';/,
  `var now = new Date();\n        var dNum = now.getDate();\n        var mPfx = (now.getMonth() !== 8 || now.getFullYear() !== 2026) ? ('M' + now.getMonth() + '_') : '';\n        var dPrefix = mPfx + (dNum < 10 ? '0' : '') + dNum + '_';`
);

// 15. aktualizujGodzinyZakrystiiDlaDnia (lines 9287-9288)
indexContent = indexContent.replace(
  /var m = \(optM !== undefined && optM !== null\) \? optM : 8;\s*var r = optR \|\| 2026;/,
  `var m = (optM !== undefined && optM !== null) ? optM : ((zakrystiaStan && zakrystiaStan.miesiacIdx !== undefined) ? zakrystiaStan.miesiacIdx : (new Date()).getMonth());\n      var r = optR || (zakrystiaStan && zakrystiaStan.rok) || (new Date()).getFullYear();`
);

// 16. matchingLits: var lm = (l.miesiacIdx !== undefined) ? l.miesiacIdx : 8;
indexContent = indexContent.replace(
  /var lm = \(l\.miesiacIdx !== undefined\) \? l\.miesiacIdx : 8;/,
  `var lm = (l.miesiacIdx !== undefined) ? l.miesiacIdx : m;`
);

// 17. otworzModalZmienMsze (lines 9340-9366)
const targetZmienMsze = `      var curStan = zakrystiaStan || {};
      var curR = curStan.rok || 2026;
      var curM = (curStan.miesiacIdx !== undefined) ? curStan.miesiacIdx : 8;
      var daysInMonth = (tabelaMiesiacaDane && tabelaMiesiacaDane.dniNaglowek) ? tabelaMiesiacaDane.dniNaglowek.length : 30;
      selD.innerHTML = '';

      // 1. Dni bieżącego miesiąca
      for (var d = 1; d <= daysInMonth; d++) {
        var opt = document.createElement('option');
        opt.value = d + '|' + curM + '|' + curR;
        var dayName = pobierzDzienTygodnia(curR, curM, d);
        opt.innerText = d + ' ' + (polishMonthsGenitive[curM] || 'września') + ' (' + dayName + ')';
        if (d === curStan.dzien && curM === (curStan.miesiacIdx !== undefined ? curStan.miesiacIdx : 8)) opt.selected = true;
        selD.appendChild(opt);
      }

      // 2. Dni kolejnego miesiąca (pierwsze 14 dni)
      var nextM = (curM + 1) % 12;
      var nextR = (nextM === 0) ? curR + 1 : curR;
      for (var nd = 1; nd <= 14; nd++) {
        var optN = document.createElement('option');
        optN.value = nd + '|' + nextM + '|' + nextR;
        var dayNameN = pobierzDzienTygodnia(nextR, nextM, nd);
        optN.innerText = nd + ' ' + (polishMonthsGenitive[nextM] || 'października') + ' (' + dayNameN + ')';
        if (nd === curStan.dzien && curStan.miesiacIdx === nextM) optN.selected = true;
        selD.appendChild(optN);
      }`;

const replacementZmienMsze = `      var curStan = zakrystiaStan || {};
      var curR = curStan.rok || (new Date()).getFullYear();
      var curM = (curStan.miesiacIdx !== undefined) ? curStan.miesiacIdx : (new Date()).getMonth();
      var daysInMonth = (tabelaMiesiacaDane && tabelaMiesiacaDane.dniNaglowek) ? tabelaMiesiacaDane.dniNaglowek.length : new Date(curR, curM + 1, 0).getDate();
      selD.innerHTML = '';

      // 1. Dni bieżącego miesiąca
      for (var d = 1; d <= daysInMonth; d++) {
        var opt = document.createElement('option');
        opt.value = d + '|' + curM + '|' + curR;
        var dayName = pobierzDzienTygodnia(curR, curM, d);
        opt.innerText = d + ' ' + (polishMonthsGenitive[curM] || '') + ' (' + dayName + ')';
        if (d === curStan.dzien && curM === (curStan.miesiacIdx !== undefined ? curStan.miesiacIdx : (new Date()).getMonth())) opt.selected = true;
        selD.appendChild(opt);
      }

      // 2. Dni kolejnego miesiąca (pierwsze 14 dni)
      var nextM = (curM + 1) % 12;
      var nextR = (nextM === 0) ? curR + 1 : curR;
      for (var nd = 1; nd <= 14; nd++) {
        var optN = document.createElement('option');
        optN.value = nd + '|' + nextM + '|' + nextR;
        var dayNameN = pobierzDzienTygodnia(nextR, nextM, nd);
        optN.innerText = nd + ' ' + (polishMonthsGenitive[nextM] || '') + ' (' + dayNameN + ')';
        if (nd === curStan.dzien && curStan.miesiacIdx === nextM) optN.selected = true;
        selD.appendChild(optN);
      }`;

if (indexContent.includes(targetZmienMsze)) {
  indexContent = indexContent.replace(targetZmienMsze, replacementZmienMsze);
  console.log('✓ Zaktualizowano otworzModalZmienMsze na w pełni dynamiczny.');
} else {
  console.warn('⚠️ targetZmienMsze nie został znaleziony');
}

// 18. zatwierdzZmianeMszyZakrystia (lines 9392-9393)
indexContent = indexContent.replace(
  /var m = parts\.length > 1 \? parseInt\(parts\[1\], 10\) : 8;\s*var r = parts\.length > 2 \? parseInt\(parts\[2\], 10\) : 2026;/,
  `var m = parts.length > 1 ? parseInt(parts[1], 10) : ((zakrystiaStan && zakrystiaStan.miesiacIdx !== undefined) ? zakrystiaStan.miesiacIdx : (new Date()).getMonth());\n      var r = parts.length > 2 ? parseInt(parts[2], 10) : ((zakrystiaStan && zakrystiaStan.rok) || (new Date()).getFullYear());`
);

// 19. zakrystia save logIdPrefix and mNazwa (lines 9783 and 9812)
indexContent = indexContent.replace(
  /var mNazwa = \(polishMonthsGenitive && polishMonthsGenitive\[zakrystiaStan\.miesiacIdx !== undefined \? zakrystiaStan\.miesiacIdx : 9\]\) \|\| 'października';/,
  `var curMVal = (zakrystiaStan && zakrystiaStan.miesiacIdx !== undefined) ? zakrystiaStan.miesiacIdx : (new Date()).getMonth();\n          var mNazwa = (polishMonthsGenitive && polishMonthsGenitive[curMVal]) || polishMonthsGenitive[(new Date()).getMonth()];`
);

indexContent = indexContent.replace(
  /var logIdPrefix = \(zakrystiaStan && zakrystiaStan\.miesiacIdx !== undefined && zakrystiaStan\.miesiacIdx !== 8\) \? \('M' \+ zakrystiaStan\.miesiacIdx \+ '_'\) : '';/,
  `var curMValZ = (zakrystiaStan && zakrystiaStan.miesiacIdx !== undefined) ? zakrystiaStan.miesiacIdx : (new Date()).getMonth();\n      var curRY = (zakrystiaStan && zakrystiaStan.rok) || (new Date()).getFullYear();\n      var logIdPrefix = (curMValZ !== 8 || curRY !== 2026) ? ('M' + curMValZ + '_') : '';`
);

// 20. zaktualizujSelectMiesiacaTabeli (lines 9927-9944)
const targetSelectMiesiacaTabeli = `    function zaktualizujSelectMiesiacaTabeli(wybrany) {
      var selectEl = document.getElementById('select-miesiac-tabeli');
      if (!selectEl) return;
      var curKlucz = pobierzAktywnyKluczMiesiaca();
      var targetVal = wybrany || wybranyMiesiacTabeli || curKlucz;
      for (var i = 0; i < selectEl.options.length; i++) {
        var opt = selectEl.options[i];
        var isCurrent = (opt.value === curKlucz);
        var baseName = opt.value.replace('_', ' ');
        if (opt.value === 'Kwiecien_2026') baseName = 'Kwiecień 2026';
        if (opt.value === 'Styczen_2026') baseName = 'Styczeń 2026';
        opt.text = baseName + (isCurrent ? ' (bieżący)' : '');
        if (opt.value === targetVal) {
          opt.selected = true;
        }
      }
      selectEl.value = targetVal;
    }`;

const replacementSelectMiesiacaTabeli = `    function zaktualizujSelectMiesiacaTabeli(wybrany) {
      var selectEl = document.getElementById('select-miesiac-tabeli');
      if (!selectEl) return;
      var curKlucz = pobierzAktywnyKluczMiesiaca();
      var targetVal = wybrany || wybranyMiesiacTabeli || curKlucz;

      // Dynamiczne budowanie opcji: kolejny miesiąc + bieżący + 11 poprzednich miesięcy
      var teraz = new Date();
      var polishMonthsAll = [
        "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
        "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
      ];
      selectEl.innerHTML = '';
      
      // 1. Kolejny miesiąc
      var nextDt = new Date(teraz.getFullYear(), teraz.getMonth() + 1, 1);
      var nextKlucz = polishMonthsAll[nextDt.getMonth()] + '_' + nextDt.getFullYear();
      var optNext = document.createElement('option');
      optNext.value = nextKlucz;
      optNext.text = polishMonthsAll[nextDt.getMonth()] + ' ' + nextDt.getFullYear() + ' (kolejny)';
      selectEl.appendChild(optNext);

      // 2. Bieżący oraz przeszłe miesiące
      for (var i = 0; i < 12; i++) {
        var d = new Date(teraz.getFullYear(), teraz.getMonth() - i, 1);
        var mKey = polishMonthsAll[d.getMonth()] + '_' + d.getFullYear();
        var isCurrent = (mKey === curKlucz);
        var opt = document.createElement('option');
        opt.value = mKey;
        opt.text = polishMonthsAll[d.getMonth()] + ' ' + d.getFullYear() + (isCurrent ? ' (bieżący)' : '');
        selectEl.appendChild(opt);
      }

      selectEl.value = targetVal;
    }`;

if (indexContent.includes(targetSelectMiesiacaTabeli)) {
  indexContent = indexContent.replace(targetSelectMiesiacaTabeli, replacementSelectMiesiacaTabeli);
  console.log('✓ Zaktualizowano zaktualizujSelectMiesiacaTabeli na w pełni dynamiczny.');
} else {
  console.warn('⚠️ targetSelectMiesiacaTabeli nie został znaleziony');
}

// 21. printTytul
indexContent = indexContent.replace(
  /if \(printTytul\) printTytul\.innerText = 'GRAFIK SŁUŻBY MINISTRANTÓW — ' \+ \(dane\.nazwaMiesiaca \|\| ''\)\.toUpperCase\(\) \+ ' ' \+ \(dane\.rok \|\| 2026\);/,
  `if (printTytul) printTytul.innerText = 'GRAFIK SŁUŻBY MINISTRANTÓW — ' + (dane.nazwaMiesiaca || '').toUpperCase() + ' ' + (dane.rok || (new Date()).getFullYear());`
);

// 22. stalyDzienTygodnia fallbacks
indexContent = indexContent.replace(
  /var rok = tabelaMiesiacaDane\.rok \|\| 2026;/g,
  `var rok = tabelaMiesiacaDane.rok || (new Date()).getFullYear();`
);
indexContent = indexContent.replace(
  /var nextR = daneKolejnegoMiesiaca\.rok \|\| 2026;/,
  `var nextR = daneKolejnegoMiesiaca.rok || (new Date()).getFullYear();`
);
indexContent = indexContent.replace(
  /var nextDocKey = wyznaczKluczMiesiaca\(new Date\(daneKolejnegoMiesiaca\.rok \|\| 2026, \(daneKolejnegoMiesiaca\.miesiacIdx !== undefined \? daneKolejnegoMiesiaca\.miesiacIdx : 9\), 1\)\);/,
  `var nextDocKey = wyznaczKluczMiesiaca(new Date(daneKolejnegoMiesiaca.rok || (new Date()).getFullYear(), (daneKolejnegoMiesiaca.miesiacIdx !== undefined ? daneKolejnegoMiesiaca.miesiacIdx : ((mIdx + 1) % 12)), 1));`
);

// 23. modal-wez-dyzur (lines 11505-11506)
indexContent = indexContent.replace(
  /var r = optRok \|\| curStan\.rok \|\| 2026;\s*var m = \(optMiesiacIdx !== undefined\) \? optMiesiacIdx : \(curStan\.miesiacIdx !== undefined \? curStan\.miesiacIdx : 8\);/,
  `var r = optRok || curStan.rok || (new Date()).getFullYear();\n        var m = (optMiesiacIdx !== undefined) ? optMiesiacIdx : (curStan.miesiacIdx !== undefined ? curStan.miesiacIdx : (new Date()).getMonth());`
);

// 24. otworzModalNagrodyZakrystia (lines 11760-11780)
const targetNagrodyModal = `      // Wypełnij select miesięcy jeśli pusty
      var sel = document.getElementById('select-miesiac-nagrody');
      if (sel && sel.options.length === 0) {
        var dostepne = [
          { id: "Październik_2026", label: "Październik 2026" },
          { id: "Wrzesień_2026", label: "Wrzesień 2026" },
          { id: "Sierpień_2026", label: "Sierpień 2026" },
          { id: "Lipiec_2026", label: "Lipiec 2026" },
          { id: "Czerwiec_2026", label: "Czerwiec 2026" },
          { id: "Maj_2026", label: "Maj 2026" },
          { id: "Kwiecień_2026", label: "Kwiecień 2026" },
          { id: "Marzec_2026", label: "Marzec 2026" },
          { id: "Luty_2026", label: "Luty 2026" },
          { id: "Styczeń_2026", label: "Styczeń 2026" }
        ];
        sel.innerHTML = '';
        dostepne.forEach(function(m) {
          var opt = document.createElement('option');
          opt.value = m.id;
          opt.innerText = m.label;
          sel.appendChild(opt);
        });
      }`;

const replacementNagrodyModal = `      // Wypełnij select miesięcy jeśli pusty
      var sel = document.getElementById('select-miesiac-nagrody');
      if (sel && sel.options.length === 0) {
        var teraz = new Date();
        var polishMonthsAll = [
          "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
          "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
        ];
        sel.innerHTML = '';
        for (var i = 0; i < 12; i++) {
          var d = new Date(teraz.getFullYear(), teraz.getMonth() - i, 1);
          var mKey = polishMonthsAll[d.getMonth()] + '_' + d.getFullYear();
          var mLabel = polishMonthsAll[d.getMonth()] + ' ' + d.getFullYear() + (i === 0 ? ' (bieżący)' : '');
          var opt = document.createElement('option');
          opt.value = mKey;
          opt.innerText = mLabel;
          sel.appendChild(opt);
        }
      }`;

if (indexContent.includes(targetNagrodyModal)) {
  indexContent = indexContent.replace(targetNagrodyModal, replacementNagrodyModal);
  console.log('✓ Zaktualizowano otworzModalNagrodyZakrystia o dynamiczne opcje.');
} else {
  console.warn('⚠️ targetNagrodyModal nie został znaleziony');
}

// 25. rok in nagrody
indexContent = indexContent.replace(
  /rok: parseInt\(miesiacId\.split\('_'\)\[1\], 10\) \|\| 2026,/,
  `rok: parseInt(miesiacId.split('_')[1], 10) || (new Date()).getFullYear(),`
);

// 26. wczytajKolejnyMiesiacJesliKoniecMiesiaca - ensure auto generation when date >= 20
const targetWczytajKolejny = `        try {
          unsubKolejnyMiesiac = dbFirestore.collection('stan_grafiku').doc(nDocId).onSnapshot(function(docN) {
            if (docN.exists && docN.data()) {
              daneKolejnegoMiesiaca = docN.data();
              try { localStorage.setItem('min_cached_tabela_' + nDocId, JSON.stringify(daneKolejnegoMiesiaca)); } catch(e) {}
              if (globalUser && globalUser.nazwisko && tabelaMiesiacaDane) {
                var stan = generujStanZFirestore(globalUser.nazwisko, tabelaMiesiacaDane);
                if (stan) renderujDane(stan);
              }
            }
          }, function(err) {
            console.warn('Brak grafiku kolejnego miesiąca:', err);
          });
        } catch(eSnap) {`;

const replacementWczytajKolejny = `        try {
          unsubKolejnyMiesiac = dbFirestore.collection('stan_grafiku').doc(nDocId).onSnapshot(async function(docN) {
            if (docN.exists && docN.data()) {
              daneKolejnegoMiesiaca = docN.data();
              try { localStorage.setItem('min_cached_tabela_' + nDocId, JSON.stringify(daneKolejnegoMiesiaca)); } catch(e) {}
              if (globalUser && globalUser.nazwisko && tabelaMiesiacaDane) {
                var stan = generujStanZFirestore(globalUser.nazwisko, tabelaMiesiacaDane);
                if (stan) renderujDane(stan);
              }
            } else {
              // Pod koniec miesiąca automatycznie przygotuj grafik kolejnego miesiąca w tle!
              console.log('Koniec miesiąca - automatyczne przygotowanie kolejnego grafiku:', nDocId);
              var nowyGrafik = await zapewnijStanGrafikuDlaMiesiaca(nDocId, tabelaMiesiacaDane);
              if (nowyGrafik) {
                daneKolejnegoMiesiaca = nowyGrafik;
                try { localStorage.setItem('min_cached_tabela_' + nDocId, JSON.stringify(daneKolejnegoMiesiaca)); } catch(e) {}
              }
            }
          }, function(err) {
            console.warn('Brak grafiku kolejnego miesiąca:', err);
          });
        } catch(eSnap) {`;

if (indexContent.includes(targetWczytajKolejny)) {
  indexContent = indexContent.replace(targetWczytajKolejny, replacementWczytajKolejny);
  console.log('✓ Zaktualizowano wczytajKolejnyMiesiacJesliKoniecMiesiaca o auto-przygotowanie kolejnego miesiąca.');
} else {
  console.warn('⚠️ targetWczytajKolejny nie został znaleziony');
}

fs.writeFileSync('Index.html', indexContent, 'utf8');
fs.writeFileSync('public/index.html', indexContent, 'utf8');
if (fs.existsSync('public/zakrystia/index.html')) {
  fs.writeFileSync('public/zakrystia/index.html', indexContent, 'utf8');
}
console.log('✓ Zapisano zaktualizowany Index.html do głównego katalogu oraz do public/ i public/zakrystia/');

// ==========================================
// EDYCJA Zamiany.js
// ==========================================
let zamianyContent = fs.readFileSync('Zamiany.js', 'utf8');

// 1. pobierzBiezacyArkuszMiesiaca (lines 1993-2001)
const targetZamianyArkusz = `  if (!sheet) {
    var all = ss.getSheets();
    for (var i = 0; i < all.length; i++) {
      var sName = all[i].getName();
      if (sName.toLowerCase().indexOf("pa") === 0 && sName.indexOf(String(now.getFullYear())) !== -1) {
        return all[i];
      }
    }
  }`;

const replacementZamianyArkusz = `  if (!sheet) {
    var all = ss.getSheets();
    var curMNameLow = polishMonths[now.getMonth()].toLowerCase();
    for (var i = 0; i < all.length; i++) {
      var sName = all[i].getName().toLowerCase();
      if (sName.indexOf(curMNameLow) === 0 && sName.indexOf(String(now.getFullYear())) !== -1) {
        return all[i];
      }
    }
  }`;

if (zamianyContent.includes(targetZamianyArkusz)) {
  zamianyContent = zamianyContent.replace(targetZamianyArkusz, replacementZamianyArkusz);
  console.log('✓ Zaktualizowano pobierzBiezacyArkuszMiesiaca w Zamiany.js.');
}

// 2. wyznaczRotowaneGodzinyGrup in Zamiany.js (lines 2059-2060)
zamianyContent = zamianyContent.replace(
  /var r = \(rok !== undefined && rok !== null\) \? parseInt\(rok, 10\) : 2026;\s*var m = \(miesiacIdx !== undefined && miesiacIdx !== null\) \? parseInt\(miesiacIdx, 10\) : 8;/,
  `var r = (rok !== undefined && rok !== null) ? parseInt(rok, 10) : (new Date()).getFullYear();\n  var m = (miesiacIdx !== undefined && miesiacIdx !== null) ? parseInt(miesiacIdx, 10) : (new Date()).getMonth();`
);

// 3. Log writing and date fallbacks in zapiszObecnoscZZakrystii
zamianyContent = zamianyContent.replace(
  /logSheet\.appendRow\(\[timeStamp, dNum \+ " września", godzina, litNazwa, uItem\.nazwisko, "USUNIĘTO", "DODATKOWY", -\(domPunkty \|\| 3\), "-", autorStr\]\);/,
  `var polishMonthsGen = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];\n            var mNameLog = polishMonthsGen[(miesiacIdx !== undefined) ? miesiacIdx : (new Date()).getMonth()] || polishMonthsGen[(new Date()).getMonth()];\n            logSheet.appendRow([timeStamp, dNum + " " + mNameLog + " " + (rok || (new Date()).getFullYear()), godzina, litNazwa, uItem.nazwisko, "USUNIĘTO", "DODATKOWY", -(domPunkty || 3), "-", autorStr]);`
);

zamianyContent = zamianyContent.replace(
  /dNum \+ " września " \+ \(rok \|\| 2026\)/g,
  `dNum + " " + mNameLog + " " + (rok || (new Date()).getFullYear())`
);

zamianyContent = zamianyContent.replace(
  /var dtSub = new Date\(rok \|\| 2026, \(miesiacIdx !== undefined\) \? miesiacIdx : 8, dNum\);/,
  `var dtSub = new Date(rok || (new Date()).getFullYear(), (miesiacIdx !== undefined) ? miesiacIdx : (new Date()).getMonth(), dNum);`
);

zamianyContent = zamianyContent.replace(
  /var mNameLog = polishMonthsGen\[\(miesiacIdx !== undefined\) \? miesiacIdx : 9\] \|\| "października";/,
  `var mNameLog = polishMonthsGen[(miesiacIdx !== undefined) ? miesiacIdx : (new Date()).getMonth()] || polishMonthsGen[(new Date()).getMonth()];`
);

// 4. pobierzWszystkieLiturgieDodatkowe in Zamiany.js (lines 5679 and 5938-5944)
zamianyContent = zamianyContent.replace(
  /var dataTekst = liturgia\.dataTekst \|\| \(dzien \+ " września"\);/,
  `var polishMonthsGen = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];\n    var dataTekst = liturgia.dataTekst || (dzien + " " + (polishMonthsGen[miesiac] || polishMonthsGen[(new Date()).getMonth()]));`
);

zamianyContent = zamianyContent.replace(
  /rok: Number\(row\[1\]\) \|\| 2026,\s*miesiacIdx: \(row\[2\] !== "" && row\[2\] !== null\) \? Number\(row\[2\]\) : 8,\s*dzien: dNum,\s*godzina: gVal,\s*rodzaj: String\(row\[5\] \|\| "Pogrzeb"\),\s*punkty: Number\(row\[6\]\) \|\| 3,\s*dataTekst: String\(row\[7\] \|\| \(row\[3\] \+ " września"\)\),/,
  `var polishMonthsGenL = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];\n      var mIdxRow = (row[2] !== "" && row[2] !== null) ? Number(row[2]) : (new Date()).getMonth();\n      lits.push({\n        id: String(row[0]),\n        rok: Number(row[1]) || (new Date()).getFullYear(),\n        miesiacIdx: mIdxRow,\n        dzien: dNum,\n        godzina: gVal,\n        rodzaj: String(row[5] || "Pogrzeb"),\n        punkty: Number(row[6]) || 3,\n        dataTekst: String(row[7] || (row[3] + " " + polishMonthsGenL[mIdxRow])),\n        opis: String(row[8] || ""),`
);

fs.writeFileSync('Zamiany.js', zamianyContent, 'utf8');
console.log('✓ Zapisano zaktualizowany Zamiany.js.');

console.log('--- Zakończono pomyślnie! ---');
