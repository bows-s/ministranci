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
    name: 'Ensure fsPromises always updates cache even after timeout',
    search: `        var timeoutPromise = new Promise(function(resolve) {
          setTimeout(function() { resolve({ isTimeout: true }); }, 3500);
        });

        var fsPromises = Promise.all([
          dbFirestore.collection('stan_grafiku').doc(targetDocKey).get(),
          lId ? dbFirestore.collection('obecnosc').doc(lId).get().catch(function() { return null; }) : Promise.resolve(null)
        ]);

        Promise.race([fsPromises, timeoutPromise]).then(function(resArray) {`,
    replace: `        var timeoutPromise = new Promise(function(resolve) {
          setTimeout(function() { resolve({ isTimeout: true }); }, 10000);
        });

        var fsPromises = Promise.all([
          dbFirestore.collection('stan_grafiku').doc(targetDocKey).get(),
          lId ? dbFirestore.collection('obecnosc').doc(lId).get().catch(function() { return null; }) : Promise.resolve(null)
        ]);

        // Zawsze aktualizuj pamięć i cache po nadejściu odpowiedzi z bazy (niezależnie od timeoutu):
        fsPromises.then(function(resArray) {
          if (!resArray) return;
          var docFs = resArray[0];
          if (docFs && docFs.exists && docFs.data() && docFs.data().wiersze) {
            var docDataFs = docFs.data();
            if (isNextMonthZak) {
              daneKolejnegoMiesiaca = docDataFs;
              try { localStorage.setItem('min_cached_tabela_' + targetDocKey, JSON.stringify(daneKolejnegoMiesiaca)); } catch(e) {}
            } else {
              tabelaMiesiacaDane = docDataFs;
              try { localStorage.setItem('min_cached_tabela', JSON.stringify(tabelaMiesiacaDane)); } catch(e) {}
            }
          }
        }).catch(function() {});

        Promise.race([fsPromises, timeoutPromise]).then(function(resArray) {`
  },
  {
    name: 'Transactional safe merge in zakrystiaZapiszObecnosc',
    search: `          var promises = [];
          if (tabelaDoZapisu) {
            promises.push(dbFirestore.collection('stan_grafiku').doc(targetDocKey).set(tabelaDoZapisu, { merge: true }));
            if (wariantKlucza && wariantKlucza !== targetDocKey) {
              promises.push(dbFirestore.collection('stan_grafiku').doc(wariantKlucza).set(tabelaDoZapisu, { merge: true }));
            }
          }
          promises.push(dbFirestore.collection('obecnosc').doc(logId).set(obecnoscPayload));
          await Promise.all(promises);`,
    replace: `          // 1. Zapis dokumentu pojedynczej liturgii
          await dbFirestore.collection('obecnosc').doc(logId).set(obecnoscPayload);

          // 2. Bezpieczna transakcja na stan_grafiku (pobiera najświeższy stan z serwera i łączy komórkę z istniejącymi liturgiami bez nadpisywania innych!)
          var keysToSave = [targetDocKey];
          if (wariantKlucza && wariantKlucza !== targetDocKey) keysToSave.push(wariantKlucza);

          for (var kIdx = 0; kIdx < keysToSave.length; kIdx++) {
            var curSaveKey = keysToSave[kIdx];
            await dbFirestore.runTransaction(async function(transaction) {
              var docRef = dbFirestore.collection('stan_grafiku').doc(curSaveKey);
              var sfDoc = await transaction.get(docRef);
              if (!sfDoc.exists) return;
              var sfData = sfDoc.data();
              var serverWiersze = sfData.wiersze || [];

              // Zastosuj usuniętych dla tej liturgii
              (zakrystiaStan.usunieci || []).forEach(function(u) {
                var wU = znajdzWierszMinistranta(serverWiersze, u.nazwisko);
                if (wU && wU.komorki && wU.komorki[colIdx]) {
                  var cU = wU.komorki[colIdx];
                  var hadExcuse = (cU.wartosc === 0 || cU.wartosc === '0' || cU.czyUsprawiedliwiony || u.domyslnyStatus === 'USPRAWIEDLIWIONY');
                  if (cU.liturgie && cU.liturgie[gKey] !== undefined) {
                    delete cU.liturgie[gKey];
                  }
                  if (hadExcuse) cU.czyUsprawiedliwiony = true;
                  var sU = obliczSumeLiturgiiKomorki(cU);
                  cU.wartosc = (hadExcuse && (sU === null || sU === undefined)) ? 0 : sU;
                }
              });

              // Zastosuj punkty bieżącej liturgii dla ministrantów (z zachowaniem innych liturgii w komórce!)
              (zakrystiaStan.ministranci || []).forEach(function(m) {
                var wM = znajdzWierszMinistranta(serverWiersze, m.nazwisko);
                if (!wM || !wM.komorki || !wM.komorki[colIdx]) return;
                var cell = wM.komorki[colIdx];
                cell.liturgie = cell.liturgie || {};
                var isNabozenstwoOrDod = czyDodatkowa || (zakrystiaStan && zakrystiaStan.rodzajLiturgii === 'nabozenstwo') || m.typ === 'DODATKOWY';

                if (m.tylkoRozaniec) {
                  var pR = wyliczPunktyMinistranta(m);
                  cell.liturgie[gKey] = pR;
                } else if (m.status === 'OBECNY') {
                  var pO = wyliczPunktyMinistranta(m);
                  cell.liturgie[gKey] = pO;
                  if (m.typ === 'ZASTEPCA' && m.zastepuje) {
                    var wZ = znajdzWierszMinistranta(serverWiersze, m.zastepuje);
                    if (wZ && wZ.komorki && wZ.komorki[colIdx]) {
                      var cZ = wZ.komorki[colIdx];
                      cZ.liturgie = cZ.liturgie || {};
                      cZ.liturgie[gKey] = 1;
                      cZ.wartosc = obliczSumeLiturgiiKomorki(cZ);
                    }
                  }
                } else if (m.status === 'ODDANY') {
                  cell.liturgie[gKey] = 1;
                } else if (m.status === 'USPRAWIEDLIWIONY') {
                  cell.liturgie[gKey] = 0;
                  cell.czyUsprawiedliwiony = true;
                } else if (m.status === 'NIEOBECNY') {
                  if (m.typ === 'ZASTEPCA' || isNabozenstwoOrDod) {
                    delete cell.liturgie[gKey];
                  } else {
                    cell.liturgie[gKey] = -5;
                  }
                }
                cell.wartosc = obliczSumeLiturgiiKomorki(cell);
              });

              // Przeliczenie sum
              serverWiersze.forEach(function(w) {
                if (w.komorki) {
                  w.suma = w.komorki.reduce(function(acc, c) {
                    var v = parseFloat(c.wartosc);
                    return acc + (isNaN(v) ? 0 : v);
                  }, 0);
                  w.suma = Math.round(w.suma * 10) / 10;
                }
              });

              // Przeliczenie rankingów
              var rNowy = serverWiersze
                .filter(function(w) {
                  if (!w || !w.nazwisko) return false;
                  var n = w.nazwisko.toLowerCase().trim();
                  return n !== 'kościelny' && n !== 'koscielny' && n.indexOf('pokojsk') === -1;
                })
                .map(function(w) {
                  var p = (w.suma !== undefined && w.suma !== null) ? w.suma : 0;
                  return { nazwisko: w.nazwisko, punkty: p, suma: p, grupa: w.grupa };
                })
                .sort(function(a, b) {
                  if (b.punkty !== a.punkty) return b.punkty - a.punkty;
                  return a.nazwisko.localeCompare(b.nazwisko, 'pl');
                });
              var pz = 1;
              rNowy.forEach(function(r, idx) {
                if (idx > 0 && r.punkty < rNowy[idx - 1].punkty) pz = idx + 1;
                r.pozycja = pz;
                r.miejsce = pz;
              });

              transaction.update(docRef, {
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
              }
            });
          }`
  },
  {
    name: 'Transactional safe merge in przetworzKolejkeOfflineZakrystia',
    search: `          var promises = [];
          if (item.tabelaDoZapisu && item.targetDocKey) {
            promises.push(dbFirestore.collection('stan_grafiku').doc(item.targetDocKey).set(item.tabelaDoZapisu, { merge: true }));
            if (item.wariantKlucza && item.wariantKlucza !== item.targetDocKey) {
              promises.push(dbFirestore.collection('stan_grafiku').doc(item.wariantKlucza).set(item.tabelaDoZapisu, { merge: true }));
            }
          }
          if (item.obecnoscPayload && item.logId) {
            promises.push(dbFirestore.collection('obecnosc').doc(item.logId).set(item.obecnoscPayload));
          }
          await Promise.all(promises);`,
    replace: `          if (item.obecnoscPayload && item.logId) {
            await dbFirestore.collection('obecnosc').doc(item.logId).set(item.obecnoscPayload);
          }
          if (item.targetDocKey && item.obecnoscPayload) {
            var offKeys = [item.targetDocKey];
            if (item.wariantKlucza && item.wariantKlucza !== item.targetDocKey) offKeys.push(item.wariantKlucza);
            for (var oki = 0; oki < offKeys.length; oki++) {
              var offDocKey = offKeys[oki];
              await dbFirestore.runTransaction(async function(transaction) {
                var dRef = dbFirestore.collection('stan_grafiku').doc(offDocKey);
                var sf = await transaction.get(dRef);
                if (!sf.exists) return;
                var sfData = sf.data();
                var sWiersze = sfData.wiersze || [];
                var col = item.obecnoscPayload.dzien - 1;
                var gK = (item.obecnoscPayload.godzina || 'msza').trim();
                (item.obecnoscPayload.ministranci || []).forEach(function(m) {
                  var w = znajdzWierszMinistranta(sWiersze, m.nazwisko);
                  if (w && w.komorki && w.komorki[col]) {
                    var cell = w.komorki[col];
                    cell.liturgie = cell.liturgie || {};
                    var pts = (typeof m.punkty === 'number') ? m.punkty : (m.obecnyPkt || 0);
                    if (m.status === 'OBECNY' || m.tylkoRozaniec) {
                      cell.liturgie[gK] = pts;
                    } else if (m.status === 'USPRAWIEDLIWIONY') {
                      cell.liturgie[gK] = 0;
                      cell.czyUsprawiedliwiony = true;
                    } else if (m.status === 'NIEOBECNY') {
                      if (item.obecnoscPayload.rodzajLiturgii !== 'nabozenstwo' && m.typ !== 'DODATKOWY') {
                        cell.liturgie[gK] = -5;
                      }
                    }
                    cell.wartosc = obliczSumeLiturgiiKomorki(cell);
                  }
                });
                transaction.update(dRef, {
                  wiersze: sWiersze,
                  zaktualizowano: firebase.firestore.FieldValue.serverTimestamp()
                });
              });
            }
          }`
  }
]);

// 2. Patch public/index.html to bump version to 1.8.1
patchFile('public/index.html', [
  {
    name: 'Bump script versions to 1.8.1',
    search: `  <script src="/js/firebase-config.js?v=1.7.6"></script>
  <script src="/js/utils.js?v=1.8.0"></script>
  <script src="/js/auth.js?v=1.7.6"></script>
  <script src="/js/pwa.js?v=1.7.6"></script>
  <script src="/js/liturgia.js?v=1.7.8"></script>
  <script src="/js/gamification.js?v=1.7.6"></script>
  <script src="/js/ranking.js?v=1.7.6"></script>
  <script src="/js/gielda.js?v=1.8.0"></script>
  <script src="/js/zakrystia.js?v=1.8.0"></script>
  <script src="/js/tabela.js?v=1.7.6"></script>
  <script src="/js/app.js?v=1.8.0"></script>`,
    replace: `  <script src="/js/firebase-config.js?v=1.7.6"></script>
  <script src="/js/utils.js?v=1.8.0"></script>
  <script src="/js/auth.js?v=1.7.6"></script>
  <script src="/js/pwa.js?v=1.7.6"></script>
  <script src="/js/liturgia.js?v=1.7.8"></script>
  <script src="/js/gamification.js?v=1.7.6"></script>
  <script src="/js/ranking.js?v=1.7.6"></script>
  <script src="/js/gielda.js?v=1.8.0"></script>
  <script src="/js/zakrystia.js?v=1.8.1"></script>
  <script src="/js/tabela.js?v=1.7.6"></script>
  <script src="/js/app.js?v=1.8.0"></script>`
  }
]);

console.log('Robust save patch complete.');
