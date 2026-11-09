const fs = require('fs');

// 1. Patch ranking.js (both public/js/ranking.js and js/ranking.js)
const rankingFiles = ['public/js/ranking.js', 'js/ranking.js'];

rankingFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let isCrlf = content.includes('\r\n');
  let norm = content.replace(/\r\n/g, '\n');

  const targetRanking = `        } else {
          if (desc) desc.innerText = 'Ranking punktów ujemnych w bieżącym miesiącu (' + currentMonthName + ' ' + (stan.rok || (new Date()).getFullYear()) + ').';
          list = (stan.rankingMinusyMiesiac && stan.rankingMinusyMiesiac.length) ? stan.rankingMinusyMiesiac : ((tabelaMiesiacaDane && tabelaMiesiacaDane.rankingMinusyMiesiac) || []);
        }`;

  const replaceRanking = `        } else {
          if (desc) desc.innerText = 'Ranking punktów ujemnych w bieżącym miesiącu (' + currentMonthName + ' ' + (stan.rok || (new Date()).getFullYear()) + ').';
          list = (stan.rankingMinusyMiesiac && stan.rankingMinusyMiesiac.length) ? stan.rankingMinusyMiesiac : ((tabelaMiesiacaDane && tabelaMiesiacaDane.rankingMinusyMiesiac) || []);
          if ((!list || list.length === 0) && (stan.wiersze || (tabelaMiesiacaDane && tabelaMiesiacaDane.wiersze))) {
            var srcW = stan.wiersze || tabelaMiesiacaDane.wiersze;
            var curRokD = stan.rok || 2026;
            var curMIdxD = (stan.miesiacIdx !== undefined) ? stan.miesiacIdx : (new Date()).getMonth();
            var dniNazwyMinusD = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
            var mGenD = (typeof polishMonthsGenitive !== 'undefined' && polishMonthsGenitive[curMIdxD]) || 'listopada';
            var dynMap = {};
            (srcW || []).forEach(function(w) {
              if (!w || !w.nazwisko) return;
              var n = w.nazwisko.toLowerCase().trim();
              if (n === 'kościelny' || n === 'koscielny' || n.indexOf('pokojsk') !== -1) return;
              var mins = [];
              (w.komorki || []).forEach(function(c, cIdx) {
                var dNum = cIdx + 1;
                var dt = new Date(curRokD, curMIdxD, dNum);
                var dow = dniNazwyMinusD[dt.getDay()];
                if (c && c.liturgie && typeof c.liturgie === 'object') {
                  for (var g in c.liturgie) {
                    var v = c.liturgie[g];
                    if (typeof v === 'number' && v < 0) {
                      mins.push({ dzien: dNum, godzina: g, dow: dow, punkty: v, miesiac: currentMonthName, miesiacGen: mGenD, miesiacIdx: curMIdxD, rok: curRokD });
                    }
                  }
                } else if (c && typeof c.wartosc === 'number' && c.wartosc < 0) {
                  mins.push({ dzien: dNum, godzina: '', dow: dow, punkty: c.wartosc, miesiac: currentMonthName, miesiacGen: mGenD, miesiacIdx: curMIdxD, rok: curRokD });
                }
              });
              if (mins.length > 0) {
                dynMap[n] = { nazwisko: w.nazwisko, grupa: w.grupa, mins: mins };
              }
            });
            var dynList = [];
            for (var dk in dynMap) {
              var dit = dynMap[dk];
              var dsum = 0;
              dit.mins.forEach(function(x) { dsum += x.punkty; });
              dynList.push({
                nazwisko: dit.nazwisko,
                normName: dk,
                minusy: dsum,
                szczegolyMinusow: dit.mins,
                grupa: dit.grupa,
                pozycja: 1
              });
            }
            dynList.sort(function(a, b) { return a.minusy - b.minusy; });
            var dp = 1;
            dynList.forEach(function(m, idx) {
              if (idx > 0 && m.minusy > dynList[idx - 1].minusy) dp = idx + 1;
              m.pozycja = dp;
              m.miejsce = dp;
            });
            if (dynList.length > 0) {
              list = dynList;
            }
          }
        }`;

  if (norm.includes(targetRanking)) {
    norm = norm.replace(targetRanking, replaceRanking);
    if (isCrlf) norm = norm.replace(/\n/g, '\r\n');
    fs.writeFileSync(file, norm, 'utf8');
    console.log(`Successfully patched ${file}`);
  } else {
    console.warn(`Target not found in ${file}`);
  }
});

// 2. Patch zakrystia.js (both public/js/zakrystia.js and js/zakrystia.js)
const zakrystiaFiles = ['public/js/zakrystia.js', 'js/zakrystia.js'];

zakrystiaFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let isCrlf = content.includes('\r\n');
  let norm = content.replace(/\r\n/g, '\n');

  const targetZakrystia = `              transaction.update(docRef, {
                wiersze: serverWiersze,
                ranking: rNowy,
                rankingMiesiac: rNowy,
                zaktualizowano: firebase.firestore.FieldValue.serverTimestamp()
              });

              if (curSaveKey === targetDocKey) {
                tabelaMiesiacaDane.wiersze = serverWiersze;
                tabelaMiesiacaDane.ranking = rNowy;
                tabelaMiesiacaDane.rankingMiesiac = rNowy;
                try { localStorage.setItem('min_cached_tabela', JSON.stringify(tabelaMiesiacaDane)); } catch(e) {}
              }`;

  const replaceZakrystia = `              // Przeliczenie rankingów minusowych na serwerze
              var curRokS = sfData.rok || zakrystiaStan.rok || 2026;
              var curMIdxS = (zakrystiaStan.miesiacIdx !== undefined) ? zakrystiaStan.miesiacIdx : ((sfData.miesiacIdx !== undefined) ? sfData.miesiacIdx : (new Date()).getMonth());
              var curMNameS = zakrystiaStan.nazwaMiesiaca || sfData.nazwaMiesiaca || (polishMonths && polishMonths[curMIdxS]) || 'Miesiąc';
              var mGenMinusS = (polishMonthsGenitive && polishMonthsGenitive[curMIdxS]) || '';
              var dniNazwyMinusS = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];

              var minusyMiesiacMapS = {};
              serverWiersze.forEach(function(w) {
                if (!w || !w.nazwisko) return;
                var wNorm = w.nazwisko.toLowerCase().trim();
                if (wNorm === 'kościelny' || wNorm === 'koscielny' || wNorm.indexOf('pokojsk') !== -1) return;
                var mList = [];
                (w.komorki || []).forEach(function(k, kIdx) {
                  var dNum = kIdx + 1;
                  var dtM = new Date(curRokS, curMIdxS, dNum);
                  var dowName = dniNazwyMinusS[dtM.getDay()];
                  if (k && k.liturgie && typeof k.liturgie === 'object') {
                    for (var gKeyLit in k.liturgie) {
                      var valL = k.liturgie[gKeyLit];
                      if (typeof valL === 'number' && valL < 0) {
                        mList.push({
                          dzien: dNum,
                          godzina: gKeyLit,
                          miesiac: curMNameS,
                          miesiacGen: mGenMinusS,
                          miesiacIdx: curMIdxS,
                          rok: curRokS,
                          dzienTygodnia: dowName,
                          punkty: valL
                        });
                      }
                    }
                  } else if (k && typeof k.wartosc === 'number' && k.wartosc < 0) {
                    mList.push({
                      dzien: dNum,
                      godzina: '',
                      miesiac: curMNameS,
                      miesiacGen: mGenMinusS,
                      miesiacIdx: curMIdxS,
                      rok: curRokS,
                      dzienTygodnia: dowName,
                      punkty: k.wartosc
                    });
                  }
                });
                if (mList.length > 0) {
                  minusyMiesiacMapS[wNorm] = { nazwisko: w.nazwisko, grupa: w.grupa, mins: mList };
                }
              });

              var serverRMM = [];
              for (var nKeyS in minusyMiesiacMapS) {
                var itMM = minusyMiesiacMapS[nKeyS];
                var sumMMS = 0;
                itMM.mins.forEach(function(x) { sumMMS += x.punkty; });
                serverRMM.push({
                  nazwisko: itMM.nazwisko,
                  normName: nKeyS,
                  minusy: sumMMS,
                  szczegolyMinusow: itMM.mins,
                  grupa: itMM.grupa,
                  pozycja: 1
                });
              }
              serverRMM.sort(function(a, b) { return a.minusy - b.minusy; });
              var pMMS = 1;
              serverRMM.forEach(function(m, idx) {
                if (idx > 0 && m.minusy > serverRMM[idx - 1].minusy) pMMS = idx + 1;
                m.pozycja = pMMS;
                m.miejsce = pMMS;
              });

              var serverRMR = Array.isArray(sfData.rankingMinusyRok) ? sfData.rankingMinusyRok.slice() : [];
              serverWiersze.forEach(function(w) {
                if (!w || !w.nazwisko) return;
                var wNorm = w.nazwisko.toLowerCase().trim();
                if (wNorm === 'kościelny' || wNorm === 'koscielny' || wNorm.indexOf('pokojsk') !== -1) return;
                var rItem = serverRMR.find(function(it) {
                  return (it.normName || it.nazwisko || '').toLowerCase().trim() === wNorm;
                });
                if (!rItem) {
                  rItem = { nazwisko: w.nazwisko, normName: wNorm, minusy: 0, szczegolyMinusow: [], grupa: w.grupa, pozycja: 1 };
                  serverRMR.push(rItem);
                }
                var starszeMinusy = (rItem.szczegolyMinusow || []).filter(function(sm) {
                  return sm.miesiac !== curMNameS && sm.miesiacIdx !== curMIdxS;
                });
                var biezaceMinusy = (minusyMiesiacMapS[wNorm] && minusyMiesiacMapS[wNorm].mins) ? minusyMiesiacMapS[wNorm].mins : [];
                rItem.szczegolyMinusow = starszeMinusy.concat(biezaceMinusy);
                var totalM = 0;
                rItem.szczegolyMinusow.forEach(function(sm) { totalM += (sm.punkty || 0); });
                rItem.minusy = totalM;
              });
              serverRMR.sort(function(a, b) { return a.minusy - b.minusy; });
              var pMRS = 1;
              serverRMR.forEach(function(m, idx) {
                if (idx > 0 && m.minusy > serverRMR[idx - 1].minusy) pMRS = idx + 1;
                m.pozycja = pMRS;
                m.miejsce = pMRS;
              });

              transaction.update(docRef, {
                wiersze: serverWiersze,
                ranking: rNowy,
                rankingMiesiac: rNowy,
                rankingMinusyMiesiac: serverRMM,
                rankingMinusyRok: serverRMR,
                rankingMinusy: serverRMR,
                zaktualizowano: firebase.firestore.FieldValue.serverTimestamp()
              });

              if (curSaveKey === targetDocKey) {
                tabelaMiesiacaDane.wiersze = serverWiersze;
                tabelaMiesiacaDane.ranking = rNowy;
                tabelaMiesiacaDane.rankingMiesiac = rNowy;
                tabelaMiesiacaDane.rankingMinusyMiesiac = serverRMM;
                tabelaMiesiacaDane.rankingMinusyRok = serverRMR;
                tabelaMiesiacaDane.rankingMinusy = serverRMR;
                try { localStorage.setItem('min_cached_tabela', JSON.stringify(tabelaMiesiacaDane)); } catch(e) {}
              }`;

  if (norm.includes(targetZakrystia)) {
    norm = norm.replace(targetZakrystia, replaceZakrystia);
    if (isCrlf) norm = norm.replace(/\n/g, '\r\n');
    fs.writeFileSync(file, norm, 'utf8');
    console.log(`Successfully patched ${file}`);
  } else {
    console.warn(`Target not found in ${file}`);
  }
});
