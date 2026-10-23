// =============================================================
    // MODUŁ TABELA MIESIĄCA (PEŁNY GRAFIK W APLIKACJI)
    // =============================================================
    var tabelaMiesiacaDane = null;
    var tabelaPrzegladanyMiesiacDane = null;
    var aktywnyFiltrGrupy = 'Wszyscy';

    function zaktualizujSelectMiesiacaTabeli(wybrany) {
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
    }

    function otworzTabeleMiesiaca() {
      document.getElementById('auth-panel').style.display = 'none';
      document.getElementById('app-panel').style.display = 'block';
      pokazWidok('tabela');
      window.scrollTo({ top: 0, behavior: 'smooth' });

      if (!wybranyMiesiacTabeli) wybranyMiesiacTabeli = pobierzAktywnyKluczMiesiaca();
      zaktualizujSelectMiesiacaTabeli(wybranyMiesiacTabeli);

      wczytajTabeleMiesiaca();
    }

    function zamknijTabeleMiesiaca() {
      wybranyMiesiacTabeli = pobierzAktywnyKluczMiesiaca();
      if (globalUser && globalUser.nazwisko) {
        document.getElementById('app-panel').style.display = 'block';
        pokazWidok('pulpit');
        if (tabelaMiesiacaDane) {
          var stan = generujStanZFirestore(globalUser.nazwisko, tabelaMiesiacaDane);
          if (stan) renderujDane(stan);
        }
      } else {
        document.getElementById('app-panel').style.display = 'none';
        document.getElementById('auth-panel').style.display = 'block';
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function zmienMiesiacTabeli(nowyMiesiac) {
      wybranyMiesiacTabeli = nowyMiesiac || pobierzAktywnyKluczMiesiaca();
      tabelaPrzegladanyMiesiacDane = null;
      zaktualizujSelectMiesiacaTabeli(wybranyMiesiacTabeli);
      wczytajTabeleMiesiaca(true);
    }

    function wyznaczWariantKluczaMiesiaca(docId) {
      if (!docId) return docId;
      var polishM = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
      var polishAlt = ["Styczen", "Luty", "Marzec", "Kwiecien", "Maj", "Czerwiec", "Lipiec", "Sierpien", "Wrzesien", "Pazdziernik", "Listopad", "Grudzien"];
      var parts = docId.split('_');
      var mName = parts[0];
      var yPart = parts[1] || '2026';
      for (var i = 0; i < 12; i++) {
        if (polishM[i] === mName) return polishAlt[i] + '_' + yPart;
        if (polishAlt[i] === mName) return polishM[i] + '_' + yPart;
      }
      return docId;
    }

    function wczytajTabeleMiesiaca(wymus) {
      var kontener = document.getElementById('tabela-miesiaca-scroll');
      var docId = wybranyMiesiacTabeli || pobierzAktywnyKluczMiesiaca();
      zaktualizujSelectMiesiacaTabeli(docId);
      var cacheKey = 'min_cached_tabela_' + docId;
      var isCurrent = (docId === pobierzAktywnyKluczMiesiaca());

      // 1. Natychmiastowy render z pamięci lub localStorage (0 ms!)
      var hasRenderedFromCache = false;
      if (isCurrent && tabelaMiesiacaDane && tabelaMiesiacaDane.wiersze && tabelaMiesiacaDane.wiersze.length) {
        tabelaPrzegladanyMiesiacDane = tabelaMiesiacaDane;
        renderujFiltryTabeli();
        renderujTabeleMiesiaca();
        hasRenderedFromCache = true;
      } else {
        try {
          var cTbl = localStorage.getItem(cacheKey);
          if (!cTbl && isCurrent) cTbl = localStorage.getItem('min_cached_tabela');
          if (cTbl) {
            var parsed = JSON.parse(cTbl);
            if (parsed && parsed.wiersze && parsed.wiersze.length) {
              tabelaPrzegladanyMiesiacDane = parsed;
              if (isCurrent) tabelaMiesiacaDane = parsed;
              renderujFiltryTabeli();
              renderujTabeleMiesiaca();
              hasRenderedFromCache = true;
            }
          }
        } catch(e) {}
      }

      if (!hasRenderedFromCache) {
        kontener.innerHTML = '<div style="text-align:center; padding:30px; color:#38bdf8;"><span class="mini-spin" style="font-size:20px;">⟳</span> Ładowanie grafiku ' + docId.replace('_', ' ') + '...</div>';
      }

      function zastosujDaneDoc(fData) {
        autoRozliczWygasleOfertyFirestore(fData);
        tabelaPrzegladanyMiesiacDane = Object.assign({}, tabelaPrzegladanyMiesiacDane || {}, fData);
        if (isCurrent) {
          tabelaMiesiacaDane = Object.assign({}, tabelaMiesiacaDane || {}, fData);
          try { localStorage.setItem('min_cached_tabela', JSON.stringify(tabelaMiesiacaDane)); } catch(e) {}
        }
        try { localStorage.setItem(cacheKey, JSON.stringify(tabelaPrzegladanyMiesiacDane)); } catch(e) {}
        renderujFiltryTabeli();
        renderujTabeleMiesiaca();
      }

      // 2. ZAWSZE pobierz najnowsze dane z bazy Firestore w tle (Stale-While-Revalidate - gwarancja aktualności!)
      if (dbFirestore) {
        var altDocId = wyznaczWariantKluczaMiesiaca(docId);
        function sprawdzDoc(id, fallbackFn) {
          return dbFirestore.collection('stan_grafiku').doc(id).get().then(function(doc) {
            if (doc.exists && doc.data() && doc.data().wiersze && doc.data().wiersze.length) {
              zastosujDaneDoc(doc.data());
              return true;
            }
            if (fallbackFn) return fallbackFn();
            return false;
          });
        }

        sprawdzDoc(docId, function() {
          if (altDocId && altDocId !== docId) {
            return sprawdzDoc(altDocId);
          }
          return false;
        }).then(function(znaleziono) {
          if (!znaleziono && !hasRenderedFromCache) pokazBrakGrafiku(docId);
        }).catch(function(e) {
          console.warn('Firestore tabela błąd:', e);
          if (!hasRenderedFromCache) pokazBrakGrafiku(docId);
        });
      } else if (!hasRenderedFromCache) {
        pokazBrakGrafiku(docId);
      }
    }

    function pokazBrakGrafiku(docId) {
      var kontener = document.getElementById('tabela-miesiaca-scroll');
      if (kontener && !tabelaPrzegladanyMiesiacDane) {
        kontener.innerHTML = '<div style="text-align:center; padding:30px; color:#a1a1aa;">Brak zapisanego grafiku dla ' + (docId || '').replace('_', ' ') + '.</div>';
      }
    }

    function renderujFiltryTabeli() {
      var filtryBox = document.getElementById('tabela-filtry-grup');
      var dane = tabelaPrzegladanyMiesiacDane || tabelaMiesiacaDane;
      if (!filtryBox || !dane) return;

      var rawGrupy = dane.grupy || [];
      var normalizedGrupy = rawGrupy.map(function(item) {
        if (!item) return '';
        if (typeof item === 'object') return (item.nazwa || item.grupa || '');
        return String(item);
      }).filter(Boolean);
      if (normalizedGrupy.length === 0) {
        normalizedGrupy = ['I GRUPA (CZERWONA)', 'II GRUPA (POMARAŃCZOWA)', 'III GRUPA (ZIELONA)', 'IV GRUPA (ŻÓŁTA)'];
      }

      var grupy = ['Wszyscy'].concat(normalizedGrupy);
      var html = '';
      for (var i = 0; i < grupy.length; i++) {
        var g = grupy[i];
        var activeClass = (g === aktywnyFiltrGrupy) ? 'active' : '';
        html += '<button type="button" class="filter-pill ' + activeClass + '" onclick="ustawFiltrGrupyTabeli(this.textContent)">' + g + '</button>';
      }
      filtryBox.innerHTML = html;

      var printTytul = document.getElementById('print-tabela-tytul');
      var printMiesiac = document.getElementById('print-tabela-miesiac');
      if (printTytul) printTytul.innerText = 'GRAFIK SŁUŻBY MINISTRANTÓW — ' + (dane.nazwaMiesiaca || '').toUpperCase() + ' ' + (dane.rok || (new Date()).getFullYear());
      if (printMiesiac) printMiesiac.innerText = 'Parafia pw. św. Józefa • Wygenerowano: ' + (new Date().toLocaleDateString('pl-PL'));
    }

    function ustawFiltrGrupyTabeli(grupa) {
      aktywnyFiltrGrupy = grupa;
      var pills = document.querySelectorAll('#tabela-filtry-grup .filter-pill');
      pills.forEach(function(p) {
        p.classList.toggle('active', p.innerText === grupa);
      });
      renderujTabeleMiesiaca();
    }

    function filtrujTabeleMiesiaca() {
      renderujTabeleMiesiaca();
    }

    function wyznaczGrupeParafialna(nazwisko, grupa) {
      if (grupa && typeof grupa === 'string') {
        var gUp = grupa.toUpperCase().trim();
        if (gUp.indexOf('POMARAŃCZ') !== -1 || gUp.indexOf('POMARANCZ') !== -1 || /\bII\b|\bII GRUPA\b|^II\s/.test(gUp)) return 'II GRUPA (POMARAŃCZOWA)';
        if (gUp.indexOf('ZIELON') !== -1 || /\bIII\b|\bIII GRUPA\b|^III\s/.test(gUp)) return 'III GRUPA (ZIELONA)';
        if (gUp.indexOf('ŻÓŁT') !== -1 || gUp.indexOf('ZOLT') !== -1 || /\bIV\b|\bIV GRUPA\b|^IV\s/.test(gUp)) return 'IV GRUPA (ŻÓŁTA)';
        if (gUp.indexOf('CZERWON') !== -1 || /\bI\b|\bI GRUPA\b|^I\s/.test(gUp)) return 'I GRUPA (CZERWONA)';
      }
      var n = (nazwisko || '').toLowerCase().trim();
      if (!n) return 'I GRUPA (CZERWONA)';
      if (/maks|pier[sś]|radli|pszcz/.test(n)) return 'I GRUPA (CZERWONA)';
      if (/maciej|skrzypek|rafa[łl]|pokojsk/.test(n)) return 'II GRUPA (POMARAŃCZOWA)';
      if (/kupiec|g[łl]az|brytner|kik/.test(n)) return 'III GRUPA (ZIELONA)';
      if (/danielczok|mazurkiewicz|czech|rozik|matuszczyk/.test(n)) return 'IV GRUPA (ŻÓŁTA)';
      if (/wiktor/.test(n)) return 'I GRUPA (CZERWONA)';
      if (/miko[łl]/.test(n)) return 'II GRUPA (POMARAŃCZOWA)';
      return 'I GRUPA (CZERWONA)';
    }

    function renderujTabeleMiesiaca() {
      var kontener = document.getElementById('tabela-miesiaca-scroll');
      var dane = tabelaPrzegladanyMiesiacDane || tabelaMiesiacaDane;
      if (!dane || !kontener) return;

      var searchInput = document.getElementById('tabela-szukaj');
      var q = searchInput ? searchInput.value.trim().toLowerCase() : '';

      var wiersze = dane.wiersze || [];
      var naglowek = dane.dniNaglowek || [];

      var dodaneNazwiska = {};
      var przefiltrowane = wiersze.filter(function(w) {
        if (!w || !w.nazwisko) return false;
        var nUp = w.nazwisko.toUpperCase().trim();
        // Usuń wiersze śmieciowe i błędy formuł (#REF!, MINISTRANT, SUMA itp.)
        if (nUp.indexOf('#REF') !== -1 || nUp.indexOf('MINISTRANT') !== -1 || nUp.indexOf('ILOŚĆ') !== -1 || nUp.indexOf('ILOSC') !== -1 || nUp.indexOf('MSZY') !== -1 || nUp.indexOf('RANKING') !== -1 || nUp === 'SUMA' || nUp === 'KOŚCIELNY' || nUp === 'OGÓLNA') {
          return false;
        }
        var nClean = w.nazwisko.toLowerCase().trim();
        // Bezwzględna ochrona przed duplikatami ministrantów
        if (dodaneNazwiska[nClean]) {
          return false;
        }
        dodaneNazwiska[nClean] = true;

        var grRow = wyznaczGrupeParafialna(w.nazwisko, w.grupa);
        w.grupa = grRow;

        if (aktywnyFiltrGrupy !== 'Wszyscy' && grRow !== aktywnyFiltrGrupy) {
          return false;
        }
        if (q && w.nazwisko.toLowerCase().indexOf(q) === -1) {
          return false;
        }
        return true;
      });

      var kolejnośćGrupTabela = {
        "I GRUPA (CZERWONA)": 1,
        "II GRUPA (POMARAŃCZOWA)": 2,
        "III GRUPA (ZIELONA)": 3,
        "IV GRUPA (ŻÓŁTA)": 4
      };
      przefiltrowane.sort(function(a, b) {
        var ga = kolejnośćGrupTabela[wyznaczGrupeParafialna(a.nazwisko, a.grupa)] || 99;
        var gb = kolejnośćGrupTabela[wyznaczGrupeParafialna(b.nazwisko, b.grupa)] || 99;
        if (ga !== gb) return ga - gb;

        // W ramach grupy sortuj według rangi stopnia (Animator -> Lektor -> Starszy -> Młodszy -> Kandydat):
        var stA = wyznaczStopienMinistranta(a.nazwisko, dane.wiersze);
        var stB = wyznaczStopienMinistranta(b.nazwisko, dane.wiersze);
        if (stB.ranga !== stA.ranga) return stB.ranga - stA.ranga;
        return a.nazwisko.localeCompare(b.nazwisko, 'pl');
      });

      if (przefiltrowane.length === 0) {
        kontener.innerHTML = '<div style="text-align:center; padding:30px; color:#a1a1aa;">Brak wyników dla podanych filtrów.</div>';
        return;
      }

      var html = '<table class="tbl-grid">';
      
      html += '<thead><tr class="tbl-header-sticky">';
      html += '<th class="tbl-sticky-col tbl-header-sticky" style="min-width:160px;">Ministrant</th>';
      for (var d = 0; d < naglowek.length; d++) {
        var dayObj = naglowek[d];
        var isHol = dayObj.czySwieto || (d === 0 && (dane.miesiacIdx === 10 || (dane.nazwaMiesiaca && dane.nazwaMiesiaca.toLowerCase().indexOf('listopad') !== -1)));
        var dayClass = isHol ? 'tbl-day-holiday' : (dayObj.czyNiedziela ? 'tbl-day-sun' : (dayObj.czySobota ? 'tbl-day-sat' : ''));
        var holidayBadge = isHol ? '<div class="tbl-holiday-badge">ŚWIĘTO</div>' : '';
        var holidayTitle = isHol ? (' title="' + (dayObj.nazwaSwieta || 'Uroczystość Wszystkich Świętych') + ' • Uroczystość (+5 pkt)"') : '';
        html += '<th class="' + dayClass + '"' + holidayTitle + ' style="min-width:34px;">' +
                  '<div style="' + (isHol ? 'color:#fde047; font-weight:800;' : '') + '">' + dayObj.dzien + '</div>' +
                  '<div style="font-size:10px; font-weight:' + (isHol ? '700' : 'normal') + '; color:' + (isHol ? '#fef08a' : 'inherit') + ';">' + dayObj.skrotDnia + '</div>' +
                  holidayBadge +
                '</th>';
      }
      html += '<th style="min-width:45px; background:#27272a; font-weight:600; color:#71717a; letter-spacing:0.03em;">SUMA</th>';
      html += '</tr></thead>';

      html += '<tbody>';
      var ostatniaGrupa = null;

      for (var i = 0; i < przefiltrowane.length; i++) {
        var row = przefiltrowane[i];
        var rowGrupa = wyznaczGrupeParafialna(row.nazwisko, row.grupa);
        row.grupa = rowGrupa;

        if (aktywnyFiltrGrupy === 'Wszyscy' && rowGrupa !== ostatniaGrupa) {
          ostatniaGrupa = rowGrupa;
          var gUp = ostatniaGrupa.toUpperCase();
          var grClass = 'tbl-group-header-row';
          var grIcon = '';

          if (gUp.indexOf('CZERWON') !== -1) {
            grClass += ' tbl-group-czerwona';
            grIcon = '';
          } else if (gUp.indexOf('POMARAŃCZ') !== -1 || gUp.indexOf('POMARANCZ') !== -1) {
            grClass += ' tbl-group-pomaranczowa';
            grIcon = '';
          } else if (gUp.indexOf('ZIELON') !== -1) {
            grClass += ' tbl-group-zielona';
            grIcon = '';
          } else if (gUp.indexOf('ŻÓŁT') !== -1 || gUp.indexOf('ZOLT') !== -1) {
            grClass += ' tbl-group-zolta';
            grIcon = '';
          }

          html += '<tr class="' + grClass + '">' +
                    '<td colspan="' + (naglowek.length + 2) + '" style="padding:9px 12px; font-weight:800; font-size:12px; letter-spacing:0.5px; text-transform:uppercase;">' +
                      grIcon + ' ' + ostatniaGrupa +
                    '</td>' +
                  '</tr>';
        }

        var isMe = (globalUser.nazwisko && row.nazwisko.toLowerCase() === globalUser.nazwisko.toLowerCase());
        var rowStyle = isMe ? 'background:rgba(8,51,68,0.25);' : '';

        html += '<tr style="' + rowStyle + '">';
        var safeRowNazw = (row.nazwisko || '').replace(/'/g, "\\'");
        html += '<td class="tbl-sticky-col" style="' + rowStyle + (isMe ? ' border-left:3px solid #22d3ee !important;' : '') + ' cursor:pointer;" onclick="otworzProfilMinistranta(\'' + safeRowNazw + '\')" title="Kliknij, aby otworzyć profil">' +
                  '<div style="font-weight:700; color:#fafafa; display:flex; align-items:center; justify-content:space-between; gap:4px;">' +
                    '<span class="tbl-name-label">' + row.nazwisko + (isMe ? ' <span class="no-print" style="font-size:10px; font-weight:700; color:#22d3ee; background:rgba(6,182,212,0.15); border:1px solid rgba(6,182,212,0.3); padding:1px 5px; border-radius:4px; margin-left:4px;">Ty</span>' : '') + '</span>' +
                  '</div>' +
                  '<div class="tbl-row-grupa" style="font-size:10px; color:#a1a1aa;">' + row.grupa + '</div>' +
                '</td>';

        for (var c = 0; c < row.komorki.length; c++) {
          var k = row.komorki[c];
          var dNum = c + 1;
          var isHol = (naglowek[c] && naglowek[c].czySwieto) || (c === 0 && (dane.miesiacIdx === 10 || (dane.nazwaMiesiaca && dane.nazwaMiesiaca.toLowerCase().indexOf('listopad') !== -1)));
          var isSun = (naglowek[c] && naglowek[c].czyNiedziela);
          var isSat = (naglowek[c] && naglowek[c].czySobota);

          var czyMaDyzurKomorki = !!k.maDyzur;
          if ((isSat || isSun || isHol) && typeof wyznaczEfektywnaGodzineWeekendowaDlaMinistranta === 'function') {
            var sunDayNum = isSat ? (dNum + 1) : dNum;
            var efWknd = wyznaczEfektywnaGodzineWeekendowaDlaMinistranta(row, sunDayNum, 0, dane);
            if (efWknd && efWknd.godzina) {
              czyMaDyzurKomorki = isSat ? (efWknd.godzina === '17:00') : (efWknd.godzina !== '17:00');
            }
          }

          var cellClass = '';
          var cellStyle = '';
          if (isHol) {
            cellClass = 'tbl-cell-holiday' + (isMe ? ' is-me' : '');
            if (czyMaDyzurKomorki && (k.wartosc === null || k.wartosc === undefined || k.wartosc === '')) {
              cellStyle = 'background:rgba(234, 179, 8, 0.12) !important;';
            }
          } else {
            cellStyle = isSun ? 'background:rgba(69,10,10,0.18);' : (isSat ? 'background:rgba(255,255,255,0.02);' : '');
            if (isMe) {
              cellStyle += ' background-color:rgba(8,51,68,0.22);';
            }
            if (czyMaDyzurKomorki && (k.wartosc === null || k.wartosc === undefined || k.wartosc === '')) {
              cellStyle += ' background:rgba(39,39,42,0.45);';
            }
          }

          var tooltipLit = '';
          if (k.liturgie && typeof k.liturgie === 'object') {
            var lKeys = Object.keys(k.liturgie);
            if (lKeys.length > 0) {
              tooltipLit = lKeys.map(function(gk) {
                var pv = k.liturgie[gk];
                var npv = (typeof pv === 'number') ? pv : (pv && pv.punkty !== undefined ? pv.punkty : pv);
                return gk + ': ' + (npv > 0 ? '+' : '') + npv + ' pkt';
              }).join(' | ');
            }
          }

          var content = '';
          var numWartosc = parseFloat(k.wartosc);
          if (isHol) {
            if (k.wartosc === 5 || k.wartosc === '5') {
              content = '<span class="tabela-badge" style="background:linear-gradient(135deg, rgba(234,179,8,0.3) 0%, rgba(202,138,4,0.45) 100%); color:#fef08a; border:1px solid #facc15; font-weight:800; box-shadow:0 0 6px rgba(234,179,8,0.4);">5</span>';
            } else if (k.wartosc === 7 || k.wartosc === '7') {
              content = '<span class="tabela-badge" style="background:linear-gradient(135deg, rgba(234,179,8,0.4) 0%, rgba(245,158,11,0.5) 100%); color:#ffffff; border:1px solid #fde047; font-weight:800; box-shadow:0 0 8px rgba(234,179,8,0.6);">7</span>';
            } else if (k.wartosc === 9 || k.wartosc === '9') {
              content = '<span class="tabela-badge" style="background:linear-gradient(135deg, rgba(234,179,8,0.5) 0%, rgba(217,119,6,0.6) 100%); color:#ffffff; border:1px solid #fef08a; font-weight:800; box-shadow:0 0 10px rgba(234,179,8,0.75);">9</span>';
            } else if (!isNaN(numWartosc) && numWartosc < 0) {
              content = '<span class="tabela-badge b-nieobecny">' + k.wartosc + '</span>';
            } else if (k.wartosc === 0 || k.wartosc === '0') {
              content = '<span class="tabela-badge b-uspraw">0</span>';
            } else if (k.wartosc === 4 || k.wartosc === '4') {
              content = '<span class="tabela-badge b-zastepca">4</span>';
            } else if (k.wartosc === 1 || k.wartosc === '1') {
              content = '<span class="tabela-badge b-oddany">1</span>';
            } else if (k.wartosc !== null && k.wartosc !== undefined && k.wartosc !== '') {
              content = '<span class="tabela-badge" style="background:linear-gradient(135deg, rgba(234,179,8,0.3) 0%, rgba(34,197,94,0.3) 100%); color:#fef08a; border:1px solid #facc15; font-weight:800;">' + k.wartosc + '</span>';
            } else if (czyMaDyzurKomorki) {
              content = '<span style="font-size:16px; color:#fde047; text-shadow:0 0 6px rgba(234,179,8,0.8); line-height:1;" title="Dyżur w Święto">•</span>';
            }
          } else {
            if (k.wartosc === 5 || k.wartosc === '5') {
              content = '<span class="tabela-badge b-obecny">5</span>';
            } else if (!isNaN(numWartosc) && numWartosc < 0) {
              content = '<span class="tabela-badge b-nieobecny">' + k.wartosc + '</span>';
            } else if (k.wartosc === 0 || k.wartosc === '0') {
              content = '<span class="tabela-badge b-uspraw">0</span>';
            } else if (k.wartosc === 4 || k.wartosc === '4') {
              content = '<span class="tabela-badge b-zastepca">4</span>';
            } else if (k.wartosc === 1 || k.wartosc === '1') {
              content = '<span class="tabela-badge b-oddany">1</span>';
            } else if (k.wartosc !== null && k.wartosc !== undefined && k.wartosc !== '') {
              content = '<span class="tabela-badge" style="background:rgba(34,197,94,0.22); color:#4ade80; border:1px solid rgba(74,222,128,0.4); font-weight:800;">' + k.wartosc + '</span>';
            } else if (czyMaDyzurKomorki) {
              content = '<span style="font-size:16px; color:#a1a1aa; line-height:1;">•</span>';
            }
          }

          var titleAttr = tooltipLit ? (' title="' + tooltipLit + '"') : (k.wartosc !== null && k.wartosc !== undefined ? (' title="' + k.wartosc + ' pkt"') : '');
          var classAttr = cellClass ? (' class="' + cellClass + '"') : '';
          var styleAttr = cellStyle ? (' style="' + cellStyle + '"') : '';
          html += '<td' + classAttr + styleAttr + titleAttr + '>' + content + '</td>';
        }

        html += '<td style="font-weight:700; font-size:13px; color:#60a5fa; background:#27272a;">' + row.suma + '</td>';
        html += '</tr>';
      }

      html += '</tbody></table>';
      kontener.innerHTML = html;
    }

    function ustawStylStronyDruku(cssTekst) {
      var stEl = document.getElementById('dynamic-print-page-style');
      if (!stEl) {
        stEl = document.createElement('style');
        stEl.id = 'dynamic-print-page-style';
        document.head.appendChild(stEl);
      }
      stEl.textContent = cssTekst;
    }

    function drukujTabeleMiesiaca() {
      ustawStylStronyDruku('@page { size: landscape; margin: 4mm; }');
      document.body.classList.remove('print-mode-podsumowanie');
      document.body.classList.add('print-mode-tabela');
      window.print();
    }

    function renderujPodsumowanieMiesiacaDoDruku(optDocKey) {
      var targetKey = optDocKey || wybranyMiesiacTabeli || (typeof pobierzAktywnyKluczMiesiaca === 'function' ? pobierzAktywnyKluczMiesiaca() : 'Październik_2026');
      var isNext = (daneKolejnegoMiesiaca && typeof czyToTenSamKluczMiesiaca === 'function' && czyToTenSamKluczMiesiaca(targetKey, daneKolejnegoMiesiaca.docId));
      var dane = isNext ? daneKolejnegoMiesiaca : (tabelaMiesiacaDane || {});
      var wiersze = dane.wiersze || [];
      var parsed = (typeof parsujKluczMiesiaca === 'function') ? parsujKluczMiesiaca(targetKey) : { nazwaMiesiaca: 'Październik', rok: 2026 };
      var nazwaMiesiaca = dane.nazwaMiesiaca || parsed.nazwaMiesiaca || 'Miesiąc';
      var rok = dane.rok || parsed.rok || (new Date()).getFullYear();

      var arkuszEl = document.getElementById('arkusz-podsumowania-tresc');
      if (!arkuszEl) return;

      if (!wiersze.length) {
        arkuszEl.innerHTML = '<div style="text-align:center; padding:30px; color:#ef4444;">Brak danych grafiku dla tego miesiąca do wygenerowania podsumowania.</div>';
        return;
      }

      // Filtrujemy tylko ministrantów (bez kościelnego i proboszcza)
      var servers = wiersze.filter(function(w) {
        if (!w || !w.nazwisko) return false;
        var n = w.nazwisko.toLowerCase().trim();
        return n !== 'kościelny' && n !== 'koscielny' && n.indexOf('proboszcz') === -1;
      }).map(function(w) {
        var msze = 0;
        (w.komorki || []).forEach(function(c) {
          if (!c) return;
          if (c.liturgie && typeof c.liturgie === 'object') {
            Object.keys(c.liturgie).forEach(function(k) {
              var val = c.liturgie[k];
              var num = (typeof val === 'number') ? val : (val && typeof val.punkty === 'number' ? val.punkty : parseFloat(val));
              if (!isNaN(num) && num > 0) msze++;
            });
          } else if (typeof c.wartosc === 'number' && c.wartosc > 0) {
            msze++;
          }
        });

        var stInfo = (typeof wyznaczStopienMinistranta === 'function') ? wyznaczStopienMinistranta(w.nazwisko, wiersze) : { stopien: w.stopien || 'Ministrant' };
        var stopienNazwa = stInfo.stopien || w.stopien || 'Ministrant';
        var grParaf = (typeof wyznaczGrupeParafialna === 'function') ? wyznaczGrupeParafialna(w.nazwisko, w.grupa) : (w.grupa || 'Grupa');

        return {
          nazwisko: w.nazwisko,
          stopien: stopienNazwa,
          grupa: grParaf,
          punkty: (typeof w.suma === 'number') ? w.suma : 0,
          msze: msze
        };
      });

      // Sortowanie: punkty malejąco, msze malejąco, alfabetycznie
      servers.sort(function(a, b) {
        if (b.punkty !== a.punkty) return b.punkty - a.punkty;
        if (b.msze !== a.msze) return b.msze - a.msze;
        return a.nazwisko.localeCompare(b.nazwisko, 'pl');
      });

      // Przypisanie miejsc (1, 2, 3...)
      var curMiejsce = 1;
      servers.forEach(function(s, idx) {
        if (idx > 0 && s.punkty < servers[idx - 1].punkty) {
          curMiejsce = idx + 1;
        }
        s.miejsce = curMiejsce;
      });

      // Średnie statystyki
      var totalOsob = servers.length;
      var sumPkt = servers.reduce(function(acc, s) { return acc + s.punkty; }, 0);
      var sumMsze = servers.reduce(function(acc, s) { return acc + s.msze; }, 0);
      var srPkt = totalOsob > 0 ? (sumPkt / totalOsob).toFixed(2) : '0.00';
      var srMsze = totalOsob > 0 ? (sumMsze / totalOsob).toFixed(2) : '0.00';

      // Grupy (I, II, III, IV)
      var grupyMap = {};
      servers.forEach(function(s) {
        var gShort = 'I';
        var gUp = (s.grupa || '').toUpperCase();
        if (gUp.indexOf('CZERWON') !== -1 || gUp.indexOf(' I ') !== -1 || gUp.indexOf('GRUPA I') !== -1 || gUp === 'I') gShort = 'I';
        else if (gUp.indexOf('POMARAŃCZ') !== -1 || gUp.indexOf('POMARANCZ') !== -1 || gUp.indexOf(' II ') !== -1 || gUp.indexOf('GRUPA II') !== -1 || gUp === 'II') gShort = 'II';
        else if (gUp.indexOf('ZIELON') !== -1 || gUp.indexOf(' III ') !== -1 || gUp.indexOf('GRUPA III') !== -1 || gUp === 'III') gShort = 'III';
        else if (gUp.indexOf('ŻÓŁT') !== -1 || gUp.indexOf('ZOLT') !== -1 || gUp.indexOf(' IV ') !== -1 || gUp.indexOf('GRUPA IV') !== -1 || gUp === 'IV') gShort = 'IV';

        if (!grupyMap[gShort]) grupyMap[gShort] = { grupa: gShort, count: 0, pkt: 0, msze: 0 };
        grupyMap[gShort].count++;
        grupyMap[gShort].pkt += s.punkty;
        grupyMap[gShort].msze += s.msze;
      });

      var grupyArr = Object.keys(grupyMap).map(function(k) {
        var g = grupyMap[k];
        return {
          grupa: g.grupa,
          count: g.count,
          pktNaOsobe: g.count > 0 ? (g.pkt / g.count).toFixed(2) : '0.00',
          obcNaOsobe: g.count > 0 ? (g.msze / g.count).toFixed(2) : '0.00'
        };
      }).sort(function(a, b) {
        return parseFloat(b.pktNaOsobe) - parseFloat(a.pktNaOsobe);
      });

      grupyArr.forEach(function(g, idx) {
        g.miejsce = idx + 1;
      });

      // Budowanie wierszy tabeli indywidualnej
      var rowsHtml = '';
      servers.forEach(function(s, idx) {
        var medal = '';
        var bgRow = (idx % 2 === 1) ? 'background:#f8fafc;' : 'background:#ffffff;';
        if (s.miejsce === 1) {
          medal = ' 🥇';
          bgRow = 'background:#fefce8;';
        } else if (s.miejsce === 2) {
          medal = ' 🥈';
          bgRow = 'background:#f8fafc;';
        } else if (s.miejsce === 3) {
          medal = ' 🥉';
          bgRow = 'background:#fffbeb;';
        }

        var stopienStr = s.stopien ? (' <span style="color:#64748b; font-weight:500;">(' + s.stopien + ')</span>') : '';
        rowsHtml += '<tr style="' + bgRow + ' border-bottom:1px solid #e2e8f0;">' +
                      '<td style="padding:6px 8px; border:1px solid #cbd5e1; text-align:center; font-weight:700;">' + s.miejsce + medal + '</td>' +
                      '<td style="padding:6px 10px; border:1px solid #cbd5e1; font-weight:700; color:#0f172a;">' + s.nazwisko + stopienStr + '</td>' +
                      '<td style="padding:6px 8px; border:1px solid #cbd5e1; text-align:center; font-weight:800; font-size:12px; color:#1e293b;">' + s.punkty + '</td>' +
                      '<td style="padding:6px 8px; border:1px solid #cbd5e1; text-align:center; font-weight:600; color:#334155;">' + s.msze + '</td>' +
                    '</tr>';
      });

      // Budowanie wierszy tabeli grup
      var grupyRowsHtml = '';
      grupyArr.forEach(function(g, idx) {
        var gMedal = '';
        if (g.miejsce === 1) gMedal = ' 🏆';
        var bgG = (idx % 2 === 1) ? 'background:#f8fafc;' : 'background:#ffffff;';
        grupyRowsHtml += '<tr style="' + bgG + ' border-bottom:1px solid #e2e8f0;">' +
                           '<td style="padding:6px 8px; border:1px solid #cbd5e1; text-align:center; font-weight:700;">' + g.miejsce + gMedal + '</td>' +
                           '<td style="padding:6px 10px; border:1px solid #cbd5e1; text-align:center; font-weight:800; font-size:12px; color:#0f172a;">Grupa ' + g.grupa + '</td>' +
                           '<td style="padding:6px 8px; border:1px solid #cbd5e1; text-align:center; font-weight:700; color:#1e293b;">' + g.pktNaOsobe + '</td>' +
                           '<td style="padding:6px 8px; border:1px solid #cbd5e1; text-align:center; font-weight:700; color:#334155;">' + g.obcNaOsobe + '</td>' +
                         '</tr>';
      });

      var dataDzis = (new Date()).toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' });

      var htmlArkusz = '<div style="background:white; color:#0f172a; padding:24px 28px; border-radius:8px; font-family:\'Inter\', -apple-system, sans-serif; font-size:11.5px; line-height:1.4;">' +
        '<div style="text-align:center; border-bottom:2px solid #0f172a; padding-bottom:12px; margin-bottom:18px;">' +
          '<div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#475569;">Parafia Rzymskokatolicka pw. św. Józefa Oblubieńca NMP</div>' +
          '<h1 style="font-size:19px; font-weight:800; margin:5px 0 2px 0; color:#0f172a; letter-spacing:-0.5px; text-transform:uppercase;">Podsumowanie Służby Liturgicznej</h1>' +
          '<div style="font-size:14px; font-weight:700; color:#2563eb; text-transform:uppercase;">' + nazwaMiesiaca + ' ' + rok + '</div>' +
          '<div style="font-size:10px; color:#64748b; margin-top:4px;">Wygenerowano: ' + dataDzis + ' • System LSO Parafii</div>' +
        '</div>' +

        '<div style="margin-bottom:18px;">' +
          '<div style="font-size:11.5px; font-weight:800; text-transform:uppercase; margin-bottom:6px; color:#0f172a; letter-spacing:0.5px;">1. Klasyfikacja Indywidualna (Ranking Miesiąca)</div>' +
          '<table style="width:100%; border-collapse:collapse; text-align:left; font-size:11.5px; border:1px solid #cbd5e1;">' +
            '<thead>' +
              '<tr style="background:#f1f5f9; border-bottom:2px solid #0f172a; font-weight:800; color:#0f172a;">' +
                '<th style="padding:6px 8px; border:1px solid #cbd5e1; width:70px; text-align:center;">MIEJSCE</th>' +
                '<th style="padding:6px 10px; border:1px solid #cbd5e1;">IMIĘ I NAZWISKO</th>' +
                '<th style="padding:6px 8px; border:1px solid #cbd5e1; width:85px; text-align:center;">PUNKTY</th>' +
                '<th style="padding:6px 8px; border:1px solid #cbd5e1; width:95px; text-align:center;">ILOŚĆ MSZY</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>' +
              rowsHtml +
            '</tbody>' +
          '</table>' +
        '</div>' +

        '<div style="margin-bottom:18px; border:1px solid #cbd5e1; border-radius:6px; overflow:hidden;">' +
          '<table style="width:100%; border-collapse:collapse; font-size:11.5px;">' +
            '<tr style="background:#f8fafc; border-bottom:1px solid #cbd5e1;">' +
              '<td style="padding:7px 12px; font-weight:700; color:#334155;">Średnia punktów na ministranta</td>' +
              '<td style="padding:7px 12px; font-weight:800; text-align:right; font-size:12.5px; color:#0f172a; width:130px;">' + srPkt + '</td>' +
            '</tr>' +
            '<tr style="background:#ffffff; border-bottom:1px solid #cbd5e1;">' +
              '<td style="padding:7px 12px; font-weight:700; color:#334155;">Średnia obecności na ministranta</td>' +
              '<td style="padding:7px 12px; font-weight:800; text-align:right; font-size:12.5px; color:#0f172a;">' + srMsze + '</td>' +
            '</tr>' +
            '<tr style="background:#f8fafc;">' +
              '<td style="padding:7px 12px; font-weight:700; color:#334155;">Łączna liczba odprawionych służb w miesiącu</td>' +
              '<td style="padding:7px 12px; font-weight:800; text-align:right; font-size:12.5px; color:#0f172a;">' + sumMsze + '</td>' +
            '</tr>' +
          '</table>' +
        '</div>' +

        '<div style="margin-bottom:20px;">' +
          '<div style="font-size:11.5px; font-weight:800; text-transform:uppercase; margin-bottom:6px; color:#0f172a; letter-spacing:0.5px;">2. Klasyfikacja Grupowa</div>' +
          '<table style="width:100%; border-collapse:collapse; text-align:left; font-size:11.5px; border:1px solid #cbd5e1;">' +
            '<thead>' +
              '<tr style="background:#f1f5f9; border-bottom:2px solid #0f172a; font-weight:800; color:#0f172a;">' +
                '<th style="padding:6px 8px; border:1px solid #cbd5e1; width:100px; text-align:center;">Ranking Grup</th>' +
                '<th style="padding:6px 10px; border:1px solid #cbd5e1; text-align:center;">Grupa</th>' +
                '<th style="padding:6px 8px; border:1px solid #cbd5e1; width:110px; text-align:center;">Pkt na osobe</th>' +
                '<th style="padding:6px 8px; border:1px solid #cbd5e1; width:110px; text-align:center;">Obc na osobe</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>' +
              grupyRowsHtml +
            '</tbody>' +
          '</table>' +
        '</div>' +

        '<div style="display:flex; justify-content:space-between; margin-top:30px; padding-top:10px; font-size:10.5px; color:#64748b;">' +
          '<div style="text-align:center; width:200px; border-top:1px dashed #94a3b8; padding-top:6px;">Podpis Animatora LSO</div>' +
          '<div style="text-align:center; width:200px; border-top:1px dashed #94a3b8; padding-top:6px;">Podpis Opiekuna / Proboszcza</div>' +
        '</div>' +
      '</div>';

      arkuszEl.innerHTML = htmlArkusz;
    }

    function otworzDrukPodsumowaniaMiesiaca(optDocKey) {
      renderujPodsumowanieMiesiacaDoDruku(optDocKey);
      var modal = document.getElementById('modal-druk-podsumowania');
      if (modal) modal.style.display = 'flex';
      if (typeof aktualizujBlokadeScrolla === 'function') aktualizujBlokadeScrolla();
    }

    function zamknijDrukPodsumowaniaMiesiaca() {
      var modal = document.getElementById('modal-druk-podsumowania');
      if (modal) modal.style.display = 'none';
      document.body.classList.remove('print-mode-podsumowanie');
      if (typeof aktualizujBlokadeScrolla === 'function') aktualizujBlokadeScrolla();
    }

    function wykonajDrukPodsumowaniaMiesiaca() {
      ustawStylStronyDruku('@page { size: portrait; margin: 8mm; }');
      document.body.classList.remove('print-mode-tabela');
      document.body.classList.add('print-mode-podsumowanie');
      window.print();
    }

    window.addEventListener('afterprint', function() {
      document.body.classList.remove('print-mode-tabela');
      document.body.classList.remove('print-mode-podsumowanie');
    });

    window.otworzDrukPodsumowaniaMiesiaca = otworzDrukPodsumowaniaMiesiaca;
    window.zamknijDrukPodsumowaniaMiesiaca = zamknijDrukPodsumowaniaMiesiaca;
    window.wykonajDrukPodsumowaniaMiesiaca = wykonajDrukPodsumowaniaMiesiaca;
    window.renderujPodsumowanieMiesiacaDoDruku = renderujPodsumowanieMiesiacaDoDruku;
    window.drukujTabeleMiesiaca = drukujTabeleMiesiaca;

    function wybierzDzienTygodniaKafelek(keyOrDay) {
      var found = aktywneDyzuryTydzienLista.find(function(x) { 
        return x.key === keyOrDay || x.dzien === keyOrDay || x.dzien === parseInt(keyOrDay, 10); 
      });
      if (found) {
        wybranyDzienTydzienKey = found.key;
        wybranyDzienTydzien = found.dzien;
        wybranaSluzbaTydzienObj = found;
      } else {
        wybranyDzienTydzien = typeof keyOrDay === 'number' ? keyOrDay : parseInt(keyOrDay, 10);
        wybranyDzienTydzienKey = keyOrDay;
        wybranaSluzbaTydzienObj = null;
      }
      var kafelki = document.querySelectorAll('#kafelki-moje-dni .tile-choice');
      kafelki.forEach(function(k) {
        var kKey = k.getAttribute('data-key');
        var kDay = parseInt(k.getAttribute('data-day'), 10);
        if ((wybranyDzienTydzienKey && kKey === wybranyDzienTydzienKey) || (wybranyDzienTydzien && kDay === wybranyDzienTydzien)) {
          k.classList.add('selected');
        } else {
          k.classList.remove('selected');
        }
      });
      generujOpcjeTygodnia();
    }

    function generujOpcjeTygodnia() {
      var container = document.getElementById('tydzien-checkboxes');
      container.innerHTML = '';
      if (!wybranyDzienTydzien || !globalUser.stan) return;

      var d = wybranyDzienTydzien;
      var curStan = (globalUser && globalUser.stan) ? globalUser.stan : {};
      var sel = wybranaSluzbaTydzienObj;
      var rok = (sel && sel.rok) ? sel.rok : curStan.rok;
      var mIdx = (sel && sel.miesiacIdx !== undefined) ? sel.miesiacIdx : curStan.miesiacIdx;
      var nazwaM = (sel && sel.nazwaMiesiaca) ? sel.nazwaMiesiaca : curStan.nazwaMiesiaca;
      var targetDocKey = (sel && sel.docKey) ? sel.docKey : pobierzAktywnyKluczMiesiaca();
      var daysInMonth = new Date(rok, mIdx + 1, 0).getDate();
      var dzisDzien = (rok === curStan.rok && mIdx === curStan.miesiacIdx) ? curStan.dzisDzien : 1;

      var curDate = new Date(rok, mIdx, d);
      var dayOfWeek = curDate.getDay();
      var mon = d - (dayOfWeek - 1);
      var fri = d + (5 - dayOfWeek);

      for (var x = mon; x <= fri; x++) {
        if (x > 0 && x <= daysInMonth && x !== d && x >= dzisDzien) {
          var godzWTygX = pobierzGodzineDlaDniaTygodnia(rok, mIdx, x);
          // 1. Sprawdź czy msza nie jest przeterminowana (< 2h)
          if (czyTydzienMszaPrzeterminowana(x, godzWTygX, rok, mIdx)) continue;
          // 2. Sprawdź czy ktokolwiek ma służbę w tym dniu w parafii (np. w środę nikt nie ma służby)
          if (!czyKtosMaDyzurWTymDniu(x, rok, mIdx, targetDocKey)) continue;
          // 3. Sprawdź czy zalogowany użytkownik sam nie ma już służby w tym dniu
          if (czyUzytkownikMaDyzurWTymDniu(x, rok, mIdx, targetDocKey)) continue;

          var dzienNazwa = pobierzDzienTygodnia(rok, mIdx, x);
          var label = document.createElement('label');
          label.className = 'checkbox-item';
          label.innerHTML = '<input type="checkbox" value="' + x + '">' +
                            '<span class="label-text">' +
                              '<span class="label-date">' + x + ' ' + nazwaM + ' (' + godzWTygX + ')</span>' +
                              '<span class="label-day">' + dzienNazwa + '</span>' +
                            '</span>';
          container.appendChild(label);
        }
      }

      if (container.children.length === 0) {
        container.innerHTML = '<span style="color:#f87171; font-size:12px;">Brak dostępnych dni roboczych w przód w tym tygodniu.</span>';
      }
    }

    function wybierzWeekendKafelek(keyOrDay) {
      var found = dostepneWeekendyLista.find(function(x) {
        return x.key === keyOrDay || x.dzien === keyOrDay || x.dzien === parseInt(keyOrDay, 10);
      });
      if (found) {
        wybranyDzienNiedzielaKey = found.key;
        wybranyDzienNiedziela = found.dzien;
        wybranaSluzbaWeekendObj = found;
      } else {
        wybranyDzienNiedziela = typeof keyOrDay === 'number' ? keyOrDay : parseInt(keyOrDay, 10);
        wybranyDzienNiedzielaKey = keyOrDay;
        wybranaSluzbaWeekendObj = null;
      }
      var kafelki = document.querySelectorAll('#kafelki-weekendy .tile-choice');
      kafelki.forEach(function(k) {
        var kKey = k.getAttribute('data-key');
        var kDay = parseInt(k.getAttribute('data-day'), 10);
        if ((wybranyDzienNiedzielaKey && kKey === wybranyDzienNiedzielaKey) || (wybranyDzienNiedziela && kDay === wybranyDzienNiedziela)) {
          k.classList.add('selected');
        } else {
          k.classList.remove('selected');
        }
      });
      aktualizujGodzineWeekendu();
    }

    function aktualizujGodzineWeekendu() {
      var d = wybranyDzienNiedziela;
      var lbl = document.getElementById('lbl-niedziela-godzina');
      var btn = document.getElementById('btn-wystaw-niedziele');
      var aktualnaGodzina = '';
      var curStan = (globalUser && globalUser.stan) ? globalUser.stan : {};
      var selW = wybranaSluzbaWeekendObj;
      var rok = (selW && selW.rok) ? selW.rok : curStan.rok;
      var mIdx = (selW && selW.miesiacIdx !== undefined) ? selW.miesiacIdx : curStan.miesiacIdx;

      if (selW && selW.godzina) {
        aktualnaGodzina = selW.godzina;
        lbl.innerText = selW.godzina + (selW.dopisek || '');
      } else if (d && curStan.godzinyWeekendy && curStan.godzinyWeekendy[d]) {
        var infoW = curStan.godzinyWeekendy[d];
        aktualnaGodzina = infoW.godzina;
        lbl.innerText = infoW.godzina + (infoW.czyZamienione ? ' (' + (infoW.szczegoly || 'po zamianie') + ')' : '');
      } else if (curStan.mojaGodzinaNiedziela) {
        aktualnaGodzina = curStan.mojaGodzinaNiedziela;
        lbl.innerText = aktualnaGodzina || 'Brak';
      } else {
        lbl.innerText = 'Brak';
      }

      var dostepneAktywneCheckboxy = 0;
      var checkboxes = document.querySelectorAll('#weekend-hours-group input');
      checkboxes.forEach(function(cb) {
        var hVal = cleanTime(cb.value);
        var isOwnHour = (hVal === cleanTime(aktualnaGodzina));
        var isCutoff = d ? czyWeekendMszaPrzeterminowana(d, hVal, rok, mIdx) : false;

        if (isOwnHour) {
          cb.checked = false;
          cb.disabled = true;
          cb.parentElement.style.display = 'none';
        } else if (isCutoff) {
          cb.checked = false;
          cb.disabled = true;
          cb.parentElement.style.display = 'inline-flex';
          cb.parentElement.style.opacity = '0.35';
          cb.parentElement.style.cursor = 'not-allowed';
          cb.parentElement.title = 'Zbyt późno na tę mszę (mniej niż 2h do mszy)';
        } else {
          cb.disabled = false;
          cb.parentElement.style.display = 'inline-flex';
          cb.parentElement.style.opacity = '1';
          cb.parentElement.style.cursor = 'pointer';
          cb.parentElement.title = '';
          dostepneAktywneCheckboxy++;
        }
      });

      var isOwnDutyCutoff = d ? czyWeekendMszaPrzeterminowana(d, aktualnaGodzina, rok, mIdx) : false;
      if (btn) {
        if (!d || dostepneAktywneCheckboxy === 0 || isOwnDutyCutoff) {
          btn.disabled = true;
          if (isOwnDutyCutoff) {
            btn.title = 'Twoja msza w ten weekend jest za mniej niż 2 godziny lub już minęła.';
          } else if (dostepneAktywneCheckboxy === 0) {
            btn.title = 'Brak dostępnych godzin na zamianę (wszystkie alternatywy już minęły).';
          }
        } else {
          btn.disabled = false;
          btn.title = '';
        }
      }
    }

    var aktywnyFiltrGieldy = 'wszystkie';

    function filtrujGielde(typ) {
      aktywnyFiltrGieldy = typ || 'wszystkie';
      ['wszystkie', 'tydzien', 'weekend'].forEach(function(t) {
        var b = document.getElementById('btn-filter-' + t);
        if (b) {
          if (t === aktywnyFiltrGieldy) b.classList.add('active');
          else b.classList.remove('active');
        }
      });

      var oferty = document.querySelectorAll('#lista-gielda-wszystkie .oferta-box');
      var widoczne = 0;
      oferty.forEach(function(el) {
        var itemTyp = el.getAttribute('data-typ');
        if (aktywnyFiltrGieldy === 'wszystkie' || itemTyp === aktywnyFiltrGieldy) {
          el.style.display = 'block';
          widoczne++;
        } else {
          el.style.display = 'none';
        }
      });

      var emptyEl = document.getElementById('gielda-wszystkie-empty');
      if (emptyEl) {
        emptyEl.style.display = (widoczne === 0 && oferty.length > 0 ? 'block' : 'none');
      }
    }

    function zmienFormularzGieldy(typ) {
      var formT = document.getElementById('form-oddaj-tydzien');
      var formW = document.getElementById('form-oddaj-weekend');
      var btnT = document.getElementById('btn-tab-form-tydzien');
      var btnW = document.getElementById('btn-tab-form-weekend');

      if (typ === 'tydzien') {
        if (formT) formT.style.display = 'block';
        if (formW) formW.style.display = 'none';
        if (btnT) btnT.className = 'tab-btn active';
        if (btnW) btnW.className = 'tab-btn';
      } else {
        if (formT) formT.style.display = 'none';
        if (formW) formW.style.display = 'block';
        if (btnT) btnT.className = 'tab-btn';
        if (btnW) btnW.className = 'tab-btn active';
      }
    }