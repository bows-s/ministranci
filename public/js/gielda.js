// =============================================================
    // HELPERY CZASOWE I REGUŁY GIEŁDY:
    // 1. WYSTAWIENIE MSZY (oddanie / zgłoszenie / oferta): MIN. 2 GODZINY PRZED ROZPOCZĘCIEM!
    // 2. WZIĘCIE / PRZEJĘCIE MSZY (wolny dyżur lub zamiana): BRAK CUTOFFU 2H - DO SAMEGO KOŃCA (aż do rozpoczęcia mszy)!
    // =============================================================
    function wyznaczCzasMszy(dzien, godzinaStr, rok, miesiacIdx) {
      if (!dzien) return null;
      var now = new Date();
      var curY = (rok !== undefined && rok !== null) ? rok : now.getFullYear();
      var curM = (miesiacIdx !== undefined && miesiacIdx !== null) ? miesiacIdx : now.getMonth();
      var gClean = (typeof cleanTime === 'function' ? cleanTime(godzinaStr) : godzinaStr) || '18:00';

      // Obsługa wigilii niedzielnej w sobotę 17:00: jeśli dzień to niedziela, a godzina to 17:00, realny dzień to sobota (dzien - 1)
      var dow = new Date(curY, curM, dzien).getDay();
      var realD = (dow === 0 && gClean === '17:00') ? (dzien - 1) : dzien;

      var h = 12, m = 0;
      var parts = gClean.split(':');
      if (parts.length >= 2) {
        var ph = parseInt(parts[0], 10), pm = parseInt(parts[1], 10);
        if (!isNaN(ph) && !isNaN(pm)) { h = ph; m = pm; }
      }
      return new Date(curY, curM, realD, h, m, 0, 0).getTime();
    }

    function czyMszaJuzSieRozpoczela(dzien, godzinaStr, rok, miesiacIdx) {
      var mszaTime = wyznaczCzasMszy(dzien, godzinaStr, rok, miesiacIdx);
      if (!mszaTime) return false;
      return Date.now() >= mszaTime;
    }

    // Min. 2 godziny przed rozpoczęciem mszy WYŁĄCZNIE przy wystawianiu nowej oferty lub oddawaniu dyżuru
    function czyZbytPoznoNaWystawienie(dzien, godzinaStr, rok, miesiacIdx) {
      var mszaTime = wyznaczCzasMszy(dzien, godzinaStr, rok, miesiacIdx);
      if (!mszaTime) return false;
      var cutoffWystawienia = mszaTime - (2 * 60 * 60 * 1000);
      return Date.now() >= cutoffWystawienia;
    }

    function czyMszaPrzeterminowanaUniwersalna(dzien, godzinaStr, rok, miesiacIdx, tryb) {
      if (tryb === 'start' || tryb === 'zgloszenie' || tryb === 'wez' || tryb === 'przejmij' || tryb === 'wziecie') {
        return czyMszaJuzSieRozpoczela(dzien, godzinaStr, rok, miesiacIdx);
      }
      // Domyślnie dla wystawiania / tworzenia oferty: cutoff min. 2h
      return czyZbytPoznoNaWystawienie(dzien, godzinaStr, rok, miesiacIdx);
    }

    // Skrótowe aliasy dla 100% kompatybilności wstecznej:
    // Wystawienie mszy (min. 2h przed rozpoczęciem):
    function czyWeekendMszaPrzeterminowana(d, g, r, m) { return czyZbytPoznoNaWystawienie(d, g, r, m); }
    function czyTydzienMszaPrzeterminowana(d, g, r, m) { return czyZbytPoznoNaWystawienie(d, g, r, m); }
    function czyZbytPoznoNaZamiane(d, g, r, m) { return czyZbytPoznoNaWystawienie(d, g, r, m); }
    // Wzięcie mszy / start mszy (brak 2h cutoffu):
    function czyWeekendZgloszeniePrzeterminowane(d, g, r, m) { return czyMszaJuzSieRozpoczela(d, g, r, m); }
    function czyTydzienZgloszeniePrzeterminowane(d, g, r, m) { return czyMszaJuzSieRozpoczela(d, g, r, m); }

    function autoRozliczWygasleOfertyFirestore(data) {
      if (!data || !dbFirestore) return;
      var curY = data.rok || (new Date()).getFullYear();
      var curM = (data.miesiacIdx !== undefined) ? data.miesiacIdx : (new Date()).getMonth();
      var dirtyGn = false;
      var dirtyGt = false;
      var dirtyWolne = false;
      var dirtyZamiany = false;
      var dirtyWiersze = false;
      var wiersze = data.wiersze || [];
      var gn = data.gieldaNiedziele || [];
      var gt = data.gieldaTydzien || [];

      // 1. Sprawdź oferty weekendowe (gieldaNiedziele)
      // Oferty na giełdzie są aktywne do samego końca – wygasają dopiero w momencie rozpoczęcia mszy!
      gn.forEach(function(o) {
        if (!o || o.status !== 'AKTYWNA') return;
        var gO = cleanTime(o.godzinaOddawana || o.godzina || '10:00');
        var wlasnaMszaWystartowala = czyMszaJuzSieRozpoczela(o.dzien, gO, curY, curM);

        if (wlasnaMszaWystartowala) {
          o.status = 'WYGASLA_USPRAWIEDLIWIONA';
          dirtyGn = true;
          // Automatycznie usprawiedliwiamy ministranta (0 pkt zamiast -5 pkt)
          var row = wiersze.find(function(w) { return czyToSamoNazwisko(w.nazwisko, o.wystawiajacy); });
          if (row && row.komorki) {
            var realDay = (gO === '17:00') ? (o.dzien - 1) : o.dzien;
            if (row.komorki[realDay - 1] && (row.komorki[realDay - 1].wartosc === null || row.komorki[realDay - 1].wartosc === undefined || row.komorki[realDay - 1].wartosc === '')) {
              row.komorki[realDay - 1].wartosc = 0;
              dirtyWiersze = true;
            }
            if (realDay !== o.dzien && row.komorki[o.dzien - 1] && (row.komorki[o.dzien - 1].wartosc === null || row.komorki[o.dzien - 1].wartosc === undefined || row.komorki[o.dzien - 1].wartosc === '')) {
              row.komorki[o.dzien - 1].wartosc = 0;
              dirtyWiersze = true;
            }
          }
        }
      });

      // 2. Sprawdź oferty tygodniowe (gieldaTydzien)
      gt.forEach(function(o) {
        if (!o || o.status !== 'AKTYWNA') return;
        var dO = o.dzienOddawany !== undefined ? o.dzienOddawany : o.dzien;
        var gO = cleanTime(o.godzina) || '18:00';
        var mszaWystartowala = czyMszaJuzSieRozpoczela(dO, gO, curY, curM);

        if (mszaWystartowala) {
          dirtyGt = true;
          var row = wiersze.find(function(w) { return czyToSamoNazwisko(w.nazwisko, o.wystawiajacy); });
          if (row && row.komorki && row.komorki[dO - 1]) {
            if (row.komorki[dO - 1].wartosc === null || row.komorki[dO - 1].wartosc === undefined || row.komorki[dO - 1].wartosc === '') {
              row.komorki[dO - 1].wartosc = 0;
              dirtyWiersze = true;
            }
          }
          o.status = 'WYGASLA_USPRAWIEDLIWIONA';
        } else if (o.autoOddaj && czyZbytPoznoNaWystawienie(dO, gO, curY, curM)) {
          // Jeśli nikt się nie wymienił na 2h przed mszą, automatycznie przekształć na wolny dyżur (+4 pkt) do wzięcia aż do momentu mszy
          dirtyGt = true;
          var rowA = wiersze.find(function(w) { return czyToSamoNazwisko(w.nazwisko, o.wystawiajacy); });
          if (rowA && rowA.komorki && rowA.komorki[dO - 1]) {
            if (rowA.komorki[dO - 1].wartosc === null || rowA.komorki[dO - 1].wartosc === undefined || rowA.komorki[dO - 1].wartosc === '') {
              rowA.komorki[dO - 1].wartosc = 0;
              dirtyWiersze = true;
            }
          }
          o.status = 'PRZEKSZTALCONA_NA_WOLNY';
          var wolne = data.wolneZastepstwa || [];
          var zam = data.zamianyZastepstwa || [];
          var nowaWolna = {
            id: 'z_auto_' + dO + '_' + Date.now(),
            dzien: dO,
            oddajacy: o.wystawiajacy,
            godzina: gO,
            typ: 'Tydzień',
            status: 'OCZEKUJE',
            punkty: 4,
            utworzono: Date.now()
          };
          wolne.push(nowaWolna);
          zam.push(nowaWolna);
          data.wolneZastepstwa = wolne;
          data.zamianyZastepstwa = zam;
          dirtyWolne = true;
          dirtyZamiany = true;
        }
      });

      // 3. Wyczyść wygasłe wolne zastępstwa z giełdy (jeśli termin mszy już minął)
      if (data.wolneZastepstwa && data.wolneZastepstwa.length > 0) {
        var preLenW = data.wolneZastepstwa.length;
        var filteredWolne = data.wolneZastepstwa.filter(function(z) {
          if (!z || !z.dzien) return false;
          if (z.status !== 'OCZEKUJE' && z.status) return true; // Zachowaj przejęte/historyczne
          var zD = parseInt(z.dzien, 10);
          var zG = cleanTime(z.godzina) || '18:00';
          if (czyLiturgiaJuzMinela(zD, zG, null, curY, curM)) return false;
          return true;
        });
        if (filteredWolne.length !== preLenW) {
          data.wolneZastepstwa = filteredWolne;
          dirtyWolne = true;
        }
      }

      var payload = {};
      if (dirtyGn) payload.gieldaNiedziele = gn;
      if (dirtyGt) payload.gieldaTydzien = gt;
      if (dirtyWolne) payload.wolneZastepstwa = data.wolneZastepstwa || [];
      if (dirtyZamiany) payload.zamianyZastepstwa = data.zamianyZastepstwa || [];
      if (dirtyWiersze) payload.wiersze = wiersze;

      if (Object.keys(payload).length > 0) {
        payload.zaktualizowano = firebase.firestore.FieldValue.serverTimestamp();
        var docKey = data.nazwaMiesiaca ? (data.nazwaMiesiaca + '_' + curY) : pobierzAktywnyKluczMiesiaca();
        var keysToUpdate = [docKey];
        var altKey = (typeof wyznaczWariantKluczaMiesiaca === 'function') ? wyznaczWariantKluczaMiesiaca(docKey) : null;
        if (altKey && altKey !== docKey) keysToUpdate.push(altKey);

        keysToUpdate.forEach(function(k) {
          dbFirestore.collection('stan_grafiku').doc(k).update(payload).catch(function(e) {
            console.warn('Auto-rozliczenie wygasłych ofert sync błąd dla ' + k + ':', e);
          });
        });
      }
    }

// =============================================================
    // ZUNIFIKOWANY SILNIK WYMIAN I ZAMIAN (TYDZIEŃ + WEEKEND)
    // =============================================================

    function ustalKluczGrafikuOferty(id, kategoria, optDocKey) {
      if (optDocKey) return optDocKey;
      if (daneKolejnegoMiesiaca) {
        var cats = kategoria ? [kategoria] : ['gieldaTydzien', 'gieldaNiedziele', 'wolneZastepstwa', 'zamianyZastepstwa'];
        for (var c = 0; c < cats.length; c++) {
          if ((daneKolejnegoMiesiaca[cats[c]] || []).some(function(o) { return o && o.id === id; })) {
            var now = new Date();
            var curY = daneKolejnegoMiesiaca.rok || now.getFullYear();
            var curM = (daneKolejnegoMiesiaca.miesiacIdx !== undefined) ? daneKolejnegoMiesiaca.miesiacIdx : (now.getMonth() + 1);
            return wyznaczKluczMiesiaca(new Date(curY, curM, 1));
          }
        }
      }
      return pobierzAktywnyKluczMiesiaca();
    }

    /**
     * Główny uniwersalny mechanizm wystawiania oferty na giełdę (tydzień lub weekend).
     * @param {'tydzien'|'weekend'} typ - Kategoria mszy do wymiany
     */
    function wystawOferteWymiany(typ) {
      var isWeekend = (typ === 'weekend' || typ === 'niedziela' || typ === 'Msza niedzielna');
      var btn = document.getElementById(isWeekend ? 'btn-wystaw-niedziele' : 'btn-wystaw-tydzien');
      var origBtnText = btn ? btn.innerText : (isWeekend ? 'Wystaw ofertę weekendową' : 'Wystaw na giełdę');

      var curStan = (globalUser && globalUser.stan) ? globalUser.stan : {};
      var d = isWeekend ? wybranyDzienNiedziela : wybranyDzienTydzien;
      if (!d) {
        alert(isWeekend ? 'Wybierz najpierw weekend do oddania' : 'Wybierz najpierw służbę, którą chcesz oddać');
        return;
      }

      var selObj = isWeekend ? wybranaSluzbaWeekendObj : wybranaSluzbaTydzienObj;
      var rok = (selObj && selObj.rok) ? selObj.rok : curStan.rok;
      var mIdx = (selObj && selObj.miesiacIdx !== undefined) ? selObj.miesiacIdx : curStan.miesiacIdx;
      var nazwaM = (selObj && selObj.nazwaMiesiaca) ? selObj.nazwaMiesiaca : curStan.nazwaMiesiaca;
      var targetDocKey = (selObj && selObj.docKey) ? selObj.docKey : pobierzAktywnyKluczMiesiaca();

      var godzOdd;
      if (isWeekend) {
        godzOdd = (selObj && selObj.godzina)
          ? selObj.godzina
          : ((curStan.godzinyWeekendy && curStan.godzinyWeekendy[d])
            ? curStan.godzinyWeekendy[d].godzina
            : (curStan.mojaGodzinaNiedziela || '10:00'));
      } else {
        godzOdd = (selObj && selObj.godzina) ? selObj.godzina : pobierzGodzineDlaDniaTygodnia(rok, mIdx, d);
      }

      // Sprawdzenie cutoffu (min. 2h przed rozpoczęciem)
      if (czyMszaPrzeterminowanaUniwersalna(d, godzOdd, rok, mIdx, 'zamiana')) {
        alert('Zbyt późno na wystawienie tej służby (mniej niż 2h do mszy).');
        return;
      }

      var tab = [];
      if (isWeekend) {
        var checkedWknd = document.querySelectorAll('#weekend-hours-group input:checked');
        checkedWknd.forEach(function(c) {
          var hClean = cleanTime(c.value);
          if (!czyMszaPrzeterminowanaUniwersalna(d, hClean, rok, mIdx, 'zamiana')) {
            tab.push(hClean);
          }
        });
        if (tab.length === 0) {
          alert('Zaznacz godziny, które możesz przyjąć w zamian (czas na zamianę nie może być przekroczony)');
          return;
        }
      } else {
        var checkedTydz = document.querySelectorAll('#tydzien-checkboxes input:checked');
        checkedTydz.forEach(function(c) {
          var parsedD = parseInt(c.value, 10);
          var gAkc = pobierzGodzineDlaDniaTygodnia(rok, mIdx, parsedD);
          if (!czyMszaPrzeterminowanaUniwersalna(parsedD, gAkc, rok, mIdx, 'zamiana') &&
              czyKtosMaDyzurWTymDniu(parsedD, rok, mIdx, targetDocKey) &&
              !czyUzytkownikMaDyzurWTymDniu(parsedD, rok, mIdx, targetDocKey)) {
            tab.push(parsedD);
          }
        });
        if (tab.length === 0) {
          alert('Zaznacz co najmniej jeden dzień w zamian, na który czas jeszcze nie minął i ma zaplanowaną służbę');
          return;
        }
      }

      // Ścisła reguła: autoOddaj (przekształcenie w wolny dyżur +4 pkt) tyczy się TYLKO mszy w tygodniu!
      // Msze niedzielne / weekendowe NIE MOGĄ być wystawiane jako wolne dyżury do wzięcia (+4 pkt).
      var autoOddaj = false;
      if (!isWeekend) {
        var chkAuto = document.getElementById('chk-auto-oddaj-tydzien');
        autoOddaj = chkAuto ? chkAuto.checked : true;
      }

      if (btn) {
        btn.disabled = true;
        btn.innerText = 'Wysyłanie...';
      }

      var myName = (globalUser && globalUser.nazwisko) ? globalUser.nazwisko.trim() : (localStorage.getItem('min_name') || '');
      if (!dbFirestore) {
        if (btn) {
          btn.disabled = false;
          btn.innerText = origBtnText;
        }
        alert('Brak połączenia z bazą danych.');
        return;
      }

      var docRef = dbFirestore.collection('stan_grafiku').doc(targetDocKey);
      var newId = (isWeekend ? 'gn_' : 'gt_') + d + '_' + Date.now();
      var fieldKey = isWeekend ? 'gieldaNiedziele' : 'gieldaTydzien';

      dbFirestore.runTransaction(async function(transaction) {
        var sfDoc = await transaction.get(docRef);
        if (!sfDoc.exists) throw new Error('Brak grafiku w bazie.');
        var data = sfDoc.data();
        var lista = data[fieldKey] || [];

        // Walidacja: czy użytkownik ma już aktywną ofertę
        var juzJest = lista.some(function(o) {
          var dO = isWeekend ? o.dzien : (o.dzienOddawany !== undefined ? o.dzienOddawany : o.dzien);
          return dO === d && czyToSamoNazwisko(o.wystawiajacy, myName) && o.status === 'AKTYWNA';
        });
        if (juzJest) {
          throw new Error(isWeekend ? 'Masz już aktywną ofertę wymiany na ten weekend.' : 'Masz już aktywną ofertę wymiany na ten dzień.');
        }

        var nowaOferta;
        if (isWeekend) {
          nowaOferta = {
            id: newId,
            dzien: d,
            wystawiajacy: myName,
            godzinaOddawana: cleanTime(godzOdd),
            akceptowaneGodziny: tab,
            godzinyAkceptowane: tab,
            autoOddaj: false, // Ścisła reguła: msze weekendowe to wyłącznie wymiana 1:1 lub usprawiedliwienie!
            status: 'AKTYWNA',
            rok: rok,
            miesiacIdx: mIdx,
            utworzono: Date.now()
          };
        } else {
          nowaOferta = {
            id: newId,
            dzien: d,
            dzienOddawany: d,
            godzina: godzOdd,
            nazwaMszy: formatujDateDnia(d, curStan, rok, mIdx, nazwaM),
            wystawiajacy: myName,
            dniAkceptowane: tab,
            akceptowaneDni: tab,
            autoOddaj: autoOddaj,
            status: 'AKTYWNA',
            rok: rok,
            miesiacIdx: mIdx,
            utworzono: Date.now()
          };
        }

        lista.push(nowaOferta);
        var updatePayload = {
          zaktualizowano: firebase.firestore.FieldValue.serverTimestamp()
        };
        updatePayload[fieldKey] = lista;
        transaction.update(docRef, updatePayload);
      }).then(function() {
        if (btn) {
          btn.disabled = false;
          btn.innerText = origBtnText;
        }
        odswiezDane();
        pokazToast(isWeekend ? 'Oferta weekendowa wystawiona' : 'Służba wystawiona na giełdę');
      }).catch(function(err) {
        if (btn) {
          btn.disabled = false;
          btn.innerText = origBtnText;
        }
        alert(err.message || 'Błąd wystawiania oferty.');
      });
    }

    /**
     * Główny uniwersalny mechanizm anulowania oferty wymiany (tydzień lub weekend).
     */
    async function anulujOferteWymiany(typ, id, optDocKey) {
      if (!confirm('Czy na pewno chcesz anulować tę ofertę?')) return;
      if (!dbFirestore) return;

      var isWeekend = (typ === 'weekend' || typ === 'niedziela' || (id && id.indexOf('gn_') === 0));
      var fieldKey = isWeekend ? 'gieldaNiedziele' : 'gieldaTydzien';
      var docKey = ustalKluczGrafikuOferty(id, fieldKey, optDocKey);
      var docRef = dbFirestore.collection('stan_grafiku').doc(docKey);

      try {
        await dbFirestore.runTransaction(async function(transaction) {
          var sfDoc = await transaction.get(docRef);
          if (!sfDoc.exists) return;
          var data = sfDoc.data();
          var lista = data[fieldKey] || [];
          var ofe = lista.find(function(o) { return o.id === id; });
          var myName = ofe ? ofe.wystawiajacy : (globalUser && globalUser.nazwisko ? globalUser.nazwisko.trim() : '');
          var dO = ofe ? (ofe.dzienOddawany !== undefined ? parseInt(ofe.dzienOddawany, 10) : parseInt(ofe.dzien, 10)) : null;

          var nowaLista = lista.filter(function(o) {
            if (o.id === id) return false;
            if (!isWeekend && dO && myName) {
              var itemD = (o.dzienOddawany !== undefined ? parseInt(o.dzienOddawany, 10) : parseInt(o.dzien, 10));
              if (itemD === dO && czyToSamoNazwisko(o.wystawiajacy, myName)) return false;
            }
            return true;
          });

          var updates = {
            zaktualizowano: firebase.firestore.FieldValue.serverTimestamp()
          };
          updates[fieldKey] = nowaLista;

          // Jeśli to tydzień roboczy, wycofaj ewentualne powiązane wolne zastępstwa (np. z autoOddaj) i usprawiedliwienia
          if (!isWeekend) {
            var wolne = (data.wolneZastepstwa || []).filter(function(z) {
              if (dO && myName && parseInt(z.dzien, 10) === dO && czyToSamoNazwisko(z.oddajacy, myName)) return false;
              return true;
            });
            var zam = (data.zamianyZastepstwa || []).filter(function(z) {
              if (dO && myName && parseInt(z.dzien, 10) === dO && czyToSamoNazwisko(z.oddajacy, myName)) return false;
              return true;
            });
            var wiersze = data.wiersze || [];
            if (dO && myName) {
              var row = wiersze.find(function(w) { return czyToSamoNazwisko(w.nazwisko, myName); });
              if (row && row.komorki && row.komorki[dO - 1]) {
                if (row.komorki[dO - 1].wartosc === 0 || row.komorki[dO - 1].wartosc === '0') {
                  row.komorki[dO - 1].wartosc = null;
                }
              }
            }
            updates.wolneZastepstwa = wolne;
            updates.zamianyZastepstwa = zam;
            updates.wiersze = wiersze;
          }

          transaction.update(docRef, updates);
        });
        odswiezDane();
        pokazToast(isWeekend ? 'Oferta weekendowa anulowana' : 'Oferta została anulowana');
      } catch(err) {
        alert(err.message || 'Błąd anulowania oferty.');
      }
    }

    /**
     * Główny uniwersalny mechanizm zatwierdzania zamiany 1:1 (tydzień lub weekend).
     */
    async function akceptujOferteWymiany(typ, id, paramOpcji, optDocKey) {
      var isWeekend = (typ === 'weekend' || typ === 'niedziela' || (id && id.indexOf('gn_') === 0));
      var confirmMsg = isWeekend ? 'Czy zatwierdzasz zamianę godzin na weekend?' : 'Czy zatwierdzasz zamianę służb?';
      if (!confirm(confirmMsg)) return;
      if (!dbFirestore) return;

      var myName = (globalUser && globalUser.nazwisko) ? globalUser.nazwisko.trim() : (localStorage.getItem('min_name') || '');
      var fieldKey = isWeekend ? 'gieldaNiedziele' : 'gieldaTydzien';
      var docKey = ustalKluczGrafikuOferty(id, fieldKey, optDocKey);
      var docRef = dbFirestore.collection('stan_grafiku').doc(docKey);

      try {
        await dbFirestore.runTransaction(async function(transaction) {
          var sfDoc = await transaction.get(docRef);
          if (!sfDoc.exists) throw new Error('Brak grafiku.');
          var data = sfDoc.data();
          var lista = data[fieldKey] || [];
          var ofe = lista.find(function(o) { return o.id === id; });
          if (!ofe || ofe.status !== 'AKTYWNA') {
            throw new Error('Ta oferta została już zaakceptowana lub wycofana.');
          }
          if (czyToSamoNazwisko(ofe.wystawiajacy, myName)) {
            throw new Error('Nie możesz wymienić się z samym sobą.');
          }

          var updates = {
            zaktualizowano: firebase.firestore.FieldValue.serverTimestamp()
          };

          if (isWeekend) {
            // === SCALONY MODUŁ DLA WEEKENDU (1:1) ===
            var curStan = (globalUser && globalUser.stan) ? globalUser.stan : {};
            var isNextDoc = (daneKolejnegoMiesiaca && docKey === wyznaczKluczMiesiaca(new Date(daneKolejnegoMiesiaca.rok, daneKolejnegoMiesiaca.miesiacIdx, 1)));
            var mojaGodzWtedy = '';
            if (isNextDoc) {
              var foundWkndNext = (curStan.dyzuryKolejnegoMiesiaca || []).find(function(it) {
                return it.typ === 'Msza niedzielna' && (it.dzienTabeli === ofe.dzien || it.dzien === ofe.dzien);
              });
              mojaGodzWtedy = foundWkndNext ? foundWkndNext.godzina : '';
            } else {
              mojaGodzWtedy = (curStan.godzinyWeekendy && curStan.godzinyWeekendy[ofe.dzien])
                ? curStan.godzinyWeekendy[ofe.dzien].godzina
                : (curStan.mojaGodzinaNiedziela || '');
            }

            if (!mojaGodzWtedy) {
              throw new Error('Nie można ustalić Twojej godziny na ten weekend.');
            }

            var akceptowaneGodz = ofe.akceptowaneGodziny || ofe.godzinyAkceptowane || [];
            var pasuje = akceptowaneGodz.indexOf(cleanTime(mojaGodzWtedy)) !== -1 || akceptowaneGodz.indexOf(mojaGodzWtedy) !== -1;
            if (!pasuje) {
              throw new Error('Twoja godzina na ten weekend (' + mojaGodzWtedy + ') nie pasuje wystawiającemu.');
            }

            var gOdd = cleanTime(ofe.godzinaOddawana || ofe.godzina || '10:00');
            var gPrzej = cleanTime(mojaGodzWtedy);

            // Przejęcie / zamiana dyżuru: brak 2h cutoffu, można wziąć do samego końca (aż do rozpoczęcia mszy)
            if (czyMszaJuzSieRozpoczela(ofe.dzien, gOdd, data.rok, data.miesiacIdx) ||
                czyMszaJuzSieRozpoczela(ofe.dzien, gPrzej, data.rok, data.miesiacIdx)) {
              throw new Error('Msza już się rozpoczęła - nie można już dokonać zamiany.');
            }

            var nowaListaGn = lista.filter(function(o) { return o.id !== id; });
            var zn = data.zamianyNiedziele || [];
            zn.push({
              id: 'zn_' + ofe.dzien + '_' + Date.now(),
              dzien: ofe.dzien,
              wystawiajacy: ofe.wystawiajacy,
              godzinaWystawiajacego: gOdd,
              przejmujacy: myName,
              godzinaPrzejmujacego: gPrzej,
              status: 'ZAAKCEPTOWANA',
              utworzono: Date.now()
            });

            // Jeśli wymiana zachodzi pomiędzy sobotą 17:00 a niedzielą, zamień również kropki maDyzur między sobotą a niedzielą
            var wierszeWknd = data.wiersze || [];
            var rowWWknd = wierszeWknd.find(function(w) { return czyToSamoNazwisko(w.nazwisko, ofe.wystawiajacy); });
            var rowMWknd = wierszeWknd.find(function(w) { return czyToSamoNazwisko(w.nazwisko, myName); });
            var satIdx = ofe.dzien - 2;
            var sunIdx = ofe.dzien - 1;
            if (gOdd === '17:00' && gPrzej !== '17:00') {
              if (rowWWknd && rowWWknd.komorki) {
                if (satIdx >= 0 && rowWWknd.komorki[satIdx]) rowWWknd.komorki[satIdx].maDyzur = false;
                if (sunIdx >= 0 && rowWWknd.komorki[sunIdx]) rowWWknd.komorki[sunIdx].maDyzur = true;
              }
              if (rowMWknd && rowMWknd.komorki) {
                if (satIdx >= 0 && rowMWknd.komorki[satIdx]) rowMWknd.komorki[satIdx].maDyzur = true;
                if (sunIdx >= 0 && rowMWknd.komorki[sunIdx]) rowMWknd.komorki[sunIdx].maDyzur = false;
              }
              updates.wiersze = wierszeWknd;
            } else if (gOdd !== '17:00' && gPrzej === '17:00') {
              if (rowWWknd && rowWWknd.komorki) {
                if (satIdx >= 0 && rowWWknd.komorki[satIdx]) rowWWknd.komorki[satIdx].maDyzur = true;
                if (sunIdx >= 0 && rowWWknd.komorki[sunIdx]) rowWWknd.komorki[sunIdx].maDyzur = false;
              }
              if (rowMWknd && rowMWknd.komorki) {
                if (satIdx >= 0 && rowMWknd.komorki[satIdx]) rowMWknd.komorki[satIdx].maDyzur = false;
                if (sunIdx >= 0 && rowMWknd.komorki[sunIdx]) rowMWknd.komorki[sunIdx].maDyzur = true;
              }
              updates.wiersze = wierszeWknd;
            }

            updates.gieldaNiedziele = nowaListaGn;
            updates.zamianyNiedziele = zn;
          } else {
            // === SCALONY MODUŁ DLA TYGODNIA (1:1) ===
            var wystawiajacy = ofe.wystawiajacy;
            var dzienOddawany = ofe.dzienOddawany !== undefined ? ofe.dzienOddawany : ofe.dzien;
            var dzienPrzejmowany = paramOpcji;
            var gOddT = ofe.godzina || pobierzGodzineDlaDniaTygodnia(data.rok, data.miesiacIdx, dzienOddawany);
            var gPrzejT = pobierzGodzineDlaDniaTygodnia(data.rok, data.miesiacIdx, dzienPrzejmowany);

            // Walidacja: czy w obu tych dniach ktokolwiek ma służbę w parafii
            if (!czyKtosMaDyzurWTymDniu(dzienOddawany, data.rok, data.miesiacIdx, docKey) ||
                !czyKtosMaDyzurWTymDniu(dzienPrzejmowany, data.rok, data.miesiacIdx, docKey)) {
              throw new Error('Jeden z wybranych dni nie ma zaplanowanej służby w parafii.');
            }

            // Przejęcie / zamiana dyżuru: brak 2h cutoffu, można wziąć do samego końca (aż do rozpoczęcia mszy)
            if (czyMszaJuzSieRozpoczela(dzienOddawany, gOddT, data.rok, data.miesiacIdx) ||
                czyMszaJuzSieRozpoczela(dzienPrzejmowany, gPrzejT, data.rok, data.miesiacIdx)) {
              throw new Error('Msza już się rozpoczęła - nie można już dokonać zamiany.');
            }

            var wiersze = data.wiersze || [];
            var rowW = wiersze.find(function(w) { return czyToSamoNazwisko(w.nazwisko, wystawiajacy); });
            var rowM = wiersze.find(function(w) { return czyToSamoNazwisko(w.nazwisko, myName); });

            if (!rowM || !rowM.komorki || !rowM.komorki[dzienPrzejmowany - 1] || !rowM.komorki[dzienPrzejmowany - 1].maDyzur) {
              throw new Error('Nie posiadasz wyznaczonej służby w dniu ' + dzienPrzejmowany + ', aby móc się zamienić.');
            }

            if (rowW && rowW.komorki) {
              if (rowW.komorki[dzienOddawany - 1]) rowW.komorki[dzienOddawany - 1].maDyzur = false;
              if (rowW.komorki[dzienPrzejmowany - 1]) rowW.komorki[dzienPrzejmowany - 1].maDyzur = true;
            }
            if (rowM && rowM.komorki) {
              if (rowM.komorki[dzienOddawany - 1]) rowM.komorki[dzienOddawany - 1].maDyzur = true;
              if (rowM.komorki[dzienPrzejmowany - 1]) rowM.komorki[dzienPrzejmowany - 1].maDyzur = false;
            }

            var nowaListaGt = lista.filter(function(o) { return o.id !== id; });
            var zamianyTydz = data.zamianyZastepstwa || [];
            zamianyTydz.push({
              id: 'zt_' + dzienOddawany + '_' + dzienPrzejmowany + '_' + Date.now(),
              dzien: dzienOddawany,
              dzienOddawany: dzienOddawany,
              dzienPrzejmowany: dzienPrzejmowany,
              oddajacy: wystawiajacy,
              przejmujacy: myName,
              godzina: gOddT,
              godzinaOddajacego: gOddT,
              godzinaPrzejmujacego: gPrzejT,
              typ: 'Tydzień',
              status: 'ZAAKCEPTOWANA',
              rodzaj: 'WYMIANA_1DO1',
              utworzono: Date.now()
            });

            updates.gieldaTydzien = nowaListaGt;
            updates.wiersze = wiersze;
            updates.zamianyZastepstwa = zamianyTydz;
          }

          transaction.update(docRef, updates);
        });

        odswiezDane();
        pokazToast(isWeekend ? 'Zamiana weekendowa zaakceptowana pomyślnie' : 'Zamiana służb zrealizowana pomyślnie');
      } catch(err) {
        alert(err.message || 'Błąd podczas akceptacji zamiany.');
        odswiezDane();
      }
    }

    // === KOMPATYBILNE ALIAS I WRAPPERY (100% BEZPIECZEŃSTWA INTERFEJSU) ===
    function wystawTydzien() { return wystawOferteWymiany('tydzien'); }
    function wystawNiedziele() { return wystawOferteWymiany('weekend'); }

    function anulujTydzien(id, optDocKey) { return anulujOferteWymiany('tydzien', id, optDocKey); }
    function anulujNiedziele(id, optDocKey) { return anulujOferteWymiany('weekend', id, optDocKey); }

    function akceptujTydzien(id, d, optDocKey) { return akceptujOferteWymiany('tydzien', id, d, optDocKey); }
    function akceptujNiedziele(id, optDocKey) { return akceptujOferteWymiany('weekend', id, null, optDocKey); }

    // Rejestracja globalna
    window.wystawOferteWymiany = wystawOferteWymiany;
    window.anulujOferteWymiany = anulujOferteWymiany;
    window.akceptujOferteWymiany = akceptujOferteWymiany;
    window.wystawTydzien = wystawTydzien;
    window.wystawNiedziele = wystawNiedziele;
    window.anulujTydzien = anulujTydzien;
    window.anulujNiedziele = anulujNiedziele;
    window.akceptujTydzien = akceptujTydzien;
    window.akceptujNiedziele = akceptujNiedziele;

    // =============================================================
    // MODUŁ ZMIANY STAŁEGO DNIA SŁUŻBY W TYGODNIU (COOLDOWN 30 DNI)
    // =============================================================
    function otworzModalZmienStalyDzien() {
      if (!globalUser || !globalUser.nazwisko) {
        pokazToast('Musisz być zalogowany, aby zmienić stały dzień.');
        return;
      }
      var myName = globalUser.nazwisko;
      var myRow = null;
      if (tabelaMiesiacaDane && tabelaMiesiacaDane.wiersze) {
        myRow = tabelaMiesiacaDane.wiersze.find(function(w) { return czyToSamoNazwisko(w.nazwisko, myName); });
      }

      var curDow = -1;
      if (myRow && myRow.stalyDzienTygodnia !== undefined && myRow.stalyDzienTygodnia > 0) {
        curDow = myRow.stalyDzienTygodnia;
      } else {
        var storedDow = localStorage.getItem('min_staly_dzien_' + encodeURIComponent(myName));
        if (storedDow) curDow = parseInt(storedDow, 10);
      }

      if (curDow < 1 && myRow && myRow.komorki) {
        var rok = tabelaMiesiacaDane.rok || (new Date()).getFullYear();
        var mIdx = (tabelaMiesiacaDane.miesiacIdx !== undefined) ? tabelaMiesiacaDane.miesiacIdx : (new Date()).getMonth();
        for (var dayIdx = 0; dayIdx < myRow.komorki.length; dayIdx++) {
          var dt = new Date(rok, mIdx, dayIdx + 1);
          var dow = dt.getDay();
          if (dow >= 1 && dow <= 5 && myRow.komorki[dayIdx] && myRow.komorki[dayIdx].maDyzur) {
            curDow = dow;
            break;
          }
        }
      }

      var nazwyDni = ['', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];
      var godzinyDni = wyznaczGodzinyDniTygodnia(tabelaMiesiacaDane);
      var obecnyEl = document.getElementById('modal-zmien-dzien-obecny');
      if (obecnyEl) {
        var godzTekst = (curDow >= 1 && curDow <= 5) ? (' (' + godzinyDni[curDow] + ')') : '';
        var nazwaObecnego = (curDow >= 1 && curDow <= 5) ? (nazwyDni[curDow] + godzTekst) : 'Nieustalony';
        obecnyEl.innerHTML = '<div style="font-size:11px; color:#a1a1aa; text-transform:uppercase; font-weight:600; margin-bottom:2px;">Aktualny stały dzień służby:</div>' +
                             '<div style="font-size:15px; font-weight:700; color:#38bdf8; display:flex; align-items:center; gap:6px;">' +
                               '<span>📅 ' + nazwaObecnego + '</span>' +
                             '</div>';
      }

      // Sprawdzenie 30-dniowego cooldownu
      var lastChangeIso = (myRow && myRow.ostatniaZmianaDnia) || localStorage.getItem('min_ostatnia_zmiana_dnia_' + encodeURIComponent(myName));
      var isLocked = false;
      var dniDoOdblokowania = 0;
      var dataOdblokowaniaStr = '';

      if (lastChangeIso) {
        var lastDate = new Date(lastChangeIso);
        var diffMs = Date.now() - lastDate.getTime();
        var limitMs = 30 * 24 * 60 * 60 * 1000; // 30 dni
        if (diffMs < limitMs) {
          isLocked = true;
          var msLeft = limitMs - diffMs;
          dniDoOdblokowania = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
          var unlockDate = new Date(lastDate.getTime() + limitMs);
          dataOdblokowaniaStr = unlockDate.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
        }
      }

      var komunikatEl = document.getElementById('modal-zmien-dzien-komunikat');
      var btnZatwierdz = document.getElementById('btn-zatwierdz-zmiane-dnia');
      var selDzien = document.getElementById('sel-nowy-staly-dzien');

      // Wypełnij opcje w select
      if (selDzien) {
        var optHtml = '';
        for (var d = 1; d <= 5; d++) {
          if (!czyDzienTygodniaMaDyzury(d, tabelaMiesiacaDane)) {
            continue; // Pomiń dni bez wyznaczonej służby w parafii (np. środa)
          }
          var isCur = (d === curDow);
          var suffix = isCur ? ' — Twój obecny dzień' : '';
          optHtml += '<option value="' + d + '"' + (isCur ? ' selected' : '') + '>' + nazwyDni[d] + ' (' + godzinyDni[d] + ')' + suffix + '</option>';
        }
        selDzien.innerHTML = optHtml;
      }

      if (isLocked) {
        if (komunikatEl) {
          komunikatEl.innerHTML = '<div style="background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.3); border-radius:8px; padding:12px; color:#fca5a5;">' +
                                    '<div style="font-weight:700; font-size:13px; margin-bottom:4px; display:flex; align-items:center; gap:6px;">' +
                                      '<span>🔒 Zmiana zablokowana (limit: raz na 30 dni)</span>' +
                                    '</div>' +
                                    '<div style="font-size:12px; line-height:1.4;">' +
                                      'Stały dzień można zmieniać <b>raz na 30 dni</b>. Twoja poprzednia zmiana miała miejsce mniej niż 30 dni temu.<br>' +
                                      'Kolejna zmiana będzie dostępna za: <b style="color:#fafafa;">' + dniDoOdblokowania + ' dni</b> (' + dataOdblokowaniaStr + ').' +
                                    '</div>' +
                                  '</div>';
        }
        if (selDzien) selDzien.disabled = true;
        if (btnZatwierdz) {
          btnZatwierdz.disabled = true;
          btnZatwierdz.style.opacity = '0.4';
          btnZatwierdz.style.cursor = 'not-allowed';
          btnZatwierdz.innerText = 'Zablokowane (' + dniDoOdblokowania + ' dni)';
        }
      } else {
        if (komunikatEl) {
          komunikatEl.innerHTML = '<div style="background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:8px; padding:12px; color:#6ee7b7;">' +
                                    '<div style="font-weight:700; font-size:13px; margin-bottom:4px; display:flex; align-items:center; gap:6px;">' +
                                      '<span>✓ Możesz zmienić stały dzień</span>' +
                                    '</div>' +
                                    '<div style="font-size:12px; line-height:1.4;">' +
                                      'Nowy dzień zacznie obowiązywać <b>od razu w bieżącym tygodniu</b> i przez resztę miesiąca bez limitu miejsc. Po zatwierdzeniu kolejna zmiana będzie możliwa po 30 dniach.' +
                                    '</div>' +
                                  '</div>';
        }
        if (selDzien) selDzien.disabled = false;
        if (btnZatwierdz) {
          btnZatwierdz.disabled = false;
          btnZatwierdz.style.opacity = '1';
          btnZatwierdz.style.cursor = 'pointer';
          btnZatwierdz.innerText = 'Zapisz zmianę';
        }
      }

      document.getElementById('modal-zmien-staly-dzien').style.display = 'flex';
    }

    function zamknijModalZmienStalyDzien() {
      var m = document.getElementById('modal-zmien-staly-dzien');
      if (m) m.style.display = 'none';
    }

    async function zatwierdzZmianeStalegoDnia() {
      if (!globalUser || !globalUser.nazwisko) {
        alert('Brak zalogowanego użytkownika.');
        return;
      }
      var myName = globalUser.nazwisko;
      var selEl = document.getElementById('sel-nowy-staly-dzien');
      if (!selEl) return;
      var nowyDzien = parseInt(selEl.value, 10);
      if (isNaN(nowyDzien) || nowyDzien < 1 || nowyDzien > 5) {
        alert('Wybierz poprawny dzień w tygodniu (Poniedziałek - Piątek).');
        return;
      }
      if (!czyDzienTygodniaMaDyzury(nowyDzien, tabelaMiesiacaDane)) {
        alert('W wybranym dniu tygodnia nikt w parafii nie ma wyznaczonej służby.');
        return;
      }

      var myRow = null;
      if (tabelaMiesiacaDane && tabelaMiesiacaDane.wiersze) {
        myRow = tabelaMiesiacaDane.wiersze.find(function(w) { return czyToSamoNazwisko(w.nazwisko, myName); });
      }
      if (!myRow) {
        alert('Nie znaleziono Twojego profilu w grafiku.');
        return;
      }

      var nazwyDni = ['', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];
      var godzinyDni = wyznaczGodzinyDniTygodnia(tabelaMiesiacaDane);
      var staryDzien = myRow.stalyDzienTygodnia;
      var rok = tabelaMiesiacaDane.rok || (new Date()).getFullYear();
      var mIdx = (tabelaMiesiacaDane.miesiacIdx !== undefined) ? tabelaMiesiacaDane.miesiacIdx : (new Date()).getMonth();
      if (staryDzien === undefined || staryDzien < 1) {
        for (var dayIdx = 0; dayIdx < myRow.komorki.length; dayIdx++) {
          var dt = new Date(rok, mIdx, dayIdx + 1);
          var dow = dt.getDay();
          if (dow >= 1 && dow <= 5 && myRow.komorki[dayIdx] && myRow.komorki[dayIdx].maDyzur) {
            staryDzien = dow;
            break;
          }
        }
      }

      if (staryDzien === nowyDzien) {
        pokazToast('Wybrany dzień (' + nazwyDni[nowyDzien] + ' - ' + godzinyDni[nowyDzien] + ') jest już Twoim stałym dniem służby.');
        zamknijModalZmienStalyDzien();
        return;
      }

      // Sprawdź cooldown 30 dni
      var lastChangeIso = myRow.ostatniaZmianaDnia || localStorage.getItem('min_ostatnia_zmiana_dnia_' + encodeURIComponent(myName));
      if (lastChangeIso) {
        var diffMs = Date.now() - new Date(lastChangeIso).getTime();
        if (diffMs < 30 * 24 * 60 * 60 * 1000) {
          alert('Nie minęło jeszcze 30 dni od Twojej ostatniej zmiany stałego dnia.');
          return;
        }
      }

      var btn = document.getElementById('btn-zatwierdz-zmiane-dnia');
      if (btn) {
        btn.disabled = true;
        btn.innerText = 'Zapisywanie...';
      }

      var now = new Date();
      var todayD = now.getDate();
      var todayM = now.getMonth();
      var todayY = now.getFullYear();
      var isSameMonth = (rok === todayY && mIdx === todayM);

      // Aktualizacja komórek w bieżącym miesiącu od dzisiaj / od bieżącego tygodnia
      if (myRow.komorki && myRow.komorki.length) {
        for (var d = 1; d <= myRow.komorki.length; d++) {
          var dtCell = new Date(rok, mIdx, d);
          var dowCell = dtCell.getDay();

          var czyMozeZmienic = !isSameMonth || (d >= todayD);

          if (czyMozeZmienic) {
            var cell = myRow.komorki[d - 1];
            if (cell && (cell.wartosc === null || cell.wartosc === undefined)) {
              if (dowCell === staryDzien) {
                cell.maDyzur = false;
              } else if (dowCell === nowyDzien) {
                cell.maDyzur = true;
              }
            }
          }
        }
      }

      // Wyczyść ewentualne zgłoszenia na giełdzie dla starego dnia, które oczekują
      if (tabelaMiesiacaDane.gieldaTydzien && Array.isArray(tabelaMiesiacaDane.gieldaTydzien)) {
        tabelaMiesiacaDane.gieldaTydzien = tabelaMiesiacaDane.gieldaTydzien.filter(function(g) {
          var dOdd = (g.dzienOddawany !== undefined ? g.dzienOddawany : g.dzien);
          if (czyToSamoNazwisko(g.oddajacy || g.wystawiajacy || g.nazwisko, myName) && dOdd >= todayD && g.status === 'OCZEKUJE') {
            var dtG = new Date(rok, mIdx, dOdd);
            if (dtG.getDay() === staryDzien) return false;
          }
          return true;
        });
      }

      var nowIso = new Date().toISOString();
      myRow.stalyDzienTygodnia = nowyDzien;
      myRow.ostatniaZmianaDnia = nowIso;
      localStorage.setItem('min_ostatnia_zmiana_dnia_' + encodeURIComponent(myName), nowIso);
      localStorage.setItem('min_staly_dzien_' + encodeURIComponent(myName), String(nowyDzien));

      // Jeśli załadowany jest kolejny miesiąc, zaktualizuj także w kolejnym miesiącu
      if (daneKolejnegoMiesiaca && daneKolejnegoMiesiaca.wiersze) {
        var nextRow = daneKolejnegoMiesiaca.wiersze.find(function(w) { return czyToSamoNazwisko(w.nazwisko, myName); });
        if (nextRow) {
          nextRow.stalyDzienTygodnia = nowyDzien;
          nextRow.ostatniaZmianaDnia = nowIso;
          var nextR = daneKolejnegoMiesiaca.rok || (new Date()).getFullYear();
          var nextM = (daneKolejnegoMiesiaca.miesiacIdx !== undefined) ? daneKolejnegoMiesiaca.miesiacIdx : ((mIdx + 1) % 12);
          if (nextRow.komorki) {
            for (var nd = 1; nd <= nextRow.komorki.length; nd++) {
              var dtN = new Date(nextR, nextM, nd);
              var dowN = dtN.getDay();
              var nCell = nextRow.komorki[nd - 1];
              if (nCell && (nCell.wartosc === null || nCell.wartosc === undefined)) {
                if (dowN === staryDzien) nCell.maDyzur = false;
                else if (dowN === nowyDzien) nCell.maDyzur = true;
              }
            }
          }
        }
      }

      // Zapisz do localStorage
      try { localStorage.setItem('min_cached_tabela', JSON.stringify(tabelaMiesiacaDane)); } catch(e) {}

      // Zapisz do Firestore
      if (dbFirestore) {
        try {
          var promises = [];
          var curDocKey = pobierzAktywnyKluczMiesiaca();
          // Aktualizuj konfigurację stałych dni
          promises.push(dbFirestore.collection('konfiguracja').doc('stale_dni').set({
            [myName]: {
              stalyDzien: nowyDzien,
              nazwaDnia: nazwyDni[nowyDzien],
              godzinaDnia: godzinyDni[nowyDzien],
              ostatniaZmiana: nowIso,
              zmienionoPrzez: myName
            }
          }, { merge: true }));

          // Bezpieczna aktualizacja wierszy w transakcji Firestore:
          // Pobieramy NAJŚWIEŻSZY stan z bazy i modyfikujemy TYLKO przyszłe komórki danego ministranta!
          promises.push(dbFirestore.runTransaction(async function(transaction) {
            var curDocRef = dbFirestore.collection('stan_grafiku').doc(curDocKey);
            var sfDoc = await transaction.get(curDocRef);
            if (!sfDoc.exists) return;
            var sfData = sfDoc.data();
            var sfWiersze = sfData.wiersze || [];
            var sfRow = sfWiersze.find(function(w) { return czyToSamoNazwisko(w.nazwisko, myName); });
            if (sfRow) {
              sfRow.stalyDzienTygodnia = nowyDzien;
              sfRow.ostatniaZmianaDnia = nowIso;
              if (sfRow.komorki) {
                for (var cd = 1; cd <= sfRow.komorki.length; cd++) {
                  if (cd >= todayD) {
                    var dtCell = new Date(rok, mIdx, cd);
                    var dowCell = dtCell.getDay();
                    var cell = sfRow.komorki[cd - 1];
                    if (cell && (cell.wartosc === null || cell.wartosc === undefined || cell.wartosc === '')) {
                      if (dowCell === staryDzien) cell.maDyzur = false;
                      else if (dowCell === nowyDzien) cell.maDyzur = true;
                    }
                  }
                }
              }
              transaction.update(curDocRef, { wiersze: sfWiersze });
              tabelaMiesiacaDane.wiersze = sfWiersze;
            }
          }));

          if (daneKolejnegoMiesiaca) {
            var nextDocKey = wyznaczKluczMiesiaca(new Date(daneKolejnegoMiesiaca.rok || (new Date()).getFullYear(), (daneKolejnegoMiesiaca.miesiacIdx !== undefined ? daneKolejnegoMiesiaca.miesiacIdx : ((mIdx + 1) % 12)), 1));
            if (nextDocKey !== curDocKey) {
              promises.push(dbFirestore.runTransaction(async function(transaction) {
                var nextDocRef = dbFirestore.collection('stan_grafiku').doc(nextDocKey);
                var sfNextDoc = await transaction.get(nextDocRef);
                if (!sfNextDoc.exists) return;
                var sfNextData = sfNextDoc.data();
                var sfNextWiersze = sfNextData.wiersze || [];
                var sfNextRow = sfNextWiersze.find(function(w) { return czyToSamoNazwisko(w.nazwisko, myName); });
                if (sfNextRow) {
                  sfNextRow.stalyDzienTygodnia = nowyDzien;
                  sfNextRow.ostatniaZmianaDnia = nowIso;
                  var nextR = sfNextData.rok || (new Date()).getFullYear();
                  var nextM = (sfNextData.miesiacIdx !== undefined) ? sfNextData.miesiacIdx : ((mIdx + 1) % 12);
                  if (sfNextRow.komorki) {
                    for (var nd = 1; nd <= sfNextRow.komorki.length; nd++) {
                      var dtN = new Date(nextR, nextM, nd);
                      var dowN = dtN.getDay();
                      var nCell = sfNextRow.komorki[nd - 1];
                      if (nCell && (nCell.wartosc === null || nCell.wartosc === undefined || nCell.wartosc === '')) {
                        if (dowN === staryDzien) nCell.maDyzur = false;
                        else if (dowN === nowyDzien) nCell.maDyzur = true;
                      }
                    }
                  }
                  transaction.update(nextDocRef, { wiersze: sfNextWiersze });
                  daneKolejnegoMiesiaca.wiersze = sfNextWiersze;
                }
              }));
            }
          }
          await Promise.all(promises);
        } catch(errFs) {
          console.warn('Błąd zapisu zmiany stałego dnia do Firestore:', errFs);
        }
      }

      if (btn) {
        btn.disabled = false;
        btn.innerText = 'Zapisz zmianę';
      }

      zamknijModalZmienStalyDzien();
      pokazToast('✓ Twój stały dzień został zmieniony na ' + nazwyDni[nowyDzien] + ' (' + godzinyDni[nowyDzien] + ')');

      // Odśwież pulpit ministranta
      var nowyStan = generujStanZFirestore(myName, tabelaMiesiacaDane);
      if (nowyStan) {
        if (globalUser) globalUser.stan = nowyStan;
        renderujDane(nowyStan);
      }
      if (typeof renderujTabeleMiesiaca === 'function' && document.getElementById('widok-pelna-tabela') && document.getElementById('widok-pelna-tabela').style.display !== 'none') {
        renderujTabeleMiesiaca(tabelaMiesiacaDane);
      }
    }

    // =============================================================
    // MODALE I AKCJE ZASTĘPSTW (+4 / +1 PKT)
    // =============================================================
    var wybranyDyzurDoOddania = null;
    var wybranaOfertaDoWziecia = null;

    function otworzModalOddajDyzur(dzien, typ, godzina, optRok, optMiesiacIdx) {
      var myNameOdd = (globalUser && globalUser.nazwisko) ? globalUser.nazwisko.trim() : (localStorage.getItem('min_name') || '');
      var stanOdd = (globalUser && globalUser.stan) ? globalUser.stan : {};
      var targetRok = (optRok !== undefined && optRok !== null) ? optRok : (stanOdd.rok || (new Date()).getFullYear());
      var targetMiesiacIdx = (optMiesiacIdx !== undefined && optMiesiacIdx !== null) ? optMiesiacIdx : ((stanOdd.miesiacIdx !== undefined) ? stanOdd.miesiacIdx : (new Date()).getMonth());
      var targetDocKey = wyznaczKluczMiesiaca(new Date(targetRok, targetMiesiacIdx, 1));
      var isNextMonth = (typeof czyToTenSamKluczMiesiaca === 'function') 
        ? !czyToTenSamKluczMiesiaca(targetDocKey, pobierzAktywnyKluczMiesiaca()) 
        : (targetDocKey !== pobierzAktywnyKluczMiesiaca());
      var targetData = isNextMonth ? (daneKolejnegoMiesiaca || {}) : (tabelaMiesiacaDane || stanOdd || {});
      var isWeekend = (typ === 'Weekend' || typ === 'Niedziela' || typ === 'Msza niedzielna');

      // 1. Sprawdź czy dzień nie jest już wystawiony na giełdzie wymian 1:1
      var jestNaGieldzie = false;
      if (isWeekend) {
        jestNaGieldzie = (targetData.gieldaNiedziele || []).some(function(o) {
          return o.dzien === dzien && czyToSamoNazwisko(o.wystawiajacy, myNameOdd) && o.status !== 'ANULOWANA' && o.status !== 'ZAAKCEPTOWANA';
        });
      } else {
        jestNaGieldzie = (targetData.gieldaTydzien || []).some(function(o) {
          var dO = o.dzienOddawany !== undefined ? o.dzienOddawany : o.dzien;
          return dO === dzien && czyToSamoNazwisko(o.wystawiajacy, myNameOdd) && o.status !== 'ANULOWANA' && o.status !== 'ZAAKCEPTOWANA';
        });
      }
      if (jestNaGieldzie) {
        alert('Ten dyżur jest już wystawiony na giełdzie wymian (1:1). Aby zgłosić nieobecność, najpierw wycofaj ofertę z giełdy na pulpicie.');
        return;
      }

      // 2. Sprawdź czy do mszy nie zostało mniej niż 2 godziny (min. 2h przed rozpoczęciem)
      if (isWeekend) {
        if (czyWeekendMszaPrzeterminowana(dzien, godzina, targetRok, targetMiesiacIdx)) {
          alert('Zbyt późno na oddanie dyżuru na giełdę (mniej niż 2 godziny do mszy). Jeśli nie możesz przyjść, skontaktuj się bezpośrednio z zakrystią.');
          return;
        }
      } else {
        if (czyTydzienMszaPrzeterminowana(dzien, godzina, targetRok, targetMiesiacIdx)) {
          alert('Zbyt późno na oddanie dyżuru na giełdę (mniej niż 2 godziny do mszy). Jeśli nie możesz przyjść, skontaktuj się bezpośrednio z zakrystią.');
          return;
        }
      }

      wybranyDyzurDoOddania = { 
        dzien: dzien, 
        typ: typ, 
        godzina: godzina,
        rok: targetRok,
        miesiacIdx: targetMiesiacIdx,
        docKey: targetDocKey,
        isNextMonth: isNextMonth
      };
      var realModalD = dzien;
      if (isWeekend && cleanTime(godzina) === '17:00') {
        var dowM = new Date(targetRok, targetMiesiacIdx, dzien).getDay();
        realModalD = (dowM === 0) ? (dzien - 1) : dzien;
      }
      var dataStr = formatujDateDnia(realModalD, stanOdd, targetRok, targetMiesiacIdx);

      if (isWeekend) {
        document.getElementById('modal-oddaj-tytul').innerText = 'Zgłoś nieobecność (0 pkt)';
        document.getElementById('modal-oddaj-opis').innerHTML = 'Czy na pewno chcesz zgłosić nieobecność na mszy niedzielnej <b>' + dataStr + '</b>' + (godzina ? ' (' + godzina + ')' : '') + '?';
        document.getElementById('modal-oddaj-szczegoly').innerHTML = 
          '<div>• <b>Zero pisania:</b> nie musisz podawać powodu.</div>' +
          '<div>• <b>Ochrona przed karą:</b> natychmiast otrzymujesz <b>0 pkt</b> (usprawiedliwienie chroniące przed -5 pkt).</div>' +
          '<div>• <b>Zasada dyżurów niedzielnych:</b> msze niedzielne nie trafiają na giełdę wolnych dyżurów. Jeśli szukasz zastępcy na wymianę, skorzystaj z zakładki <i>Wymiany</i> (wymiana 1:1).</div>' +
          '<div>• W każdej chwili przed mszą możesz wycofać to zgłoszenie.</div>';
        document.getElementById('btn-potwierdz-oddaj').innerText = 'Zgłoś nieobecność (0 pkt)';
      } else {
        document.getElementById('modal-oddaj-tytul').innerText = 'Nie mogę przyjść';
        document.getElementById('modal-oddaj-opis').innerHTML = 'Czy na pewno chcesz zgłosić nieobecność i oddać dyżur z dnia <b>' + dataStr + '</b>' + (godzina ? ' (' + godzina + ')' : '') + ' na giełdę wolnych?';
        document.getElementById('modal-oddaj-szczegoly').innerHTML = 
          '<div>• <b>Zero pisania:</b> nie musisz podawać powodu.</div>' +
          '<div>• <b>Brak kary:</b> natychmiast otrzymujesz <b>0 pkt</b> (ochrona przed ujemnymi -5 pkt).</div>' +
          '<div>• <b>Dyżur trafia na giełdę:</b> inny ministrant może go przejąć i otrzymać <b>+4 pkt</b>!</div>' +
          '<div>• <b>Szansa na punkt:</b> jeśli ktoś przejmie Twój dyżur i przyjdzie na mszę, otrzymasz <b>+1 pkt</b>!</div>' +
          '<div>• W każdej chwili przed przejęciem możesz wycofać ofertę z giełdy.</div>';
        document.getElementById('btn-potwierdz-oddaj').innerText = 'Tak, oddaj na giełdę (+4 pkt)';
      }
      document.getElementById('modal-oddaj-dyzur').style.display = 'flex';
    }

    function zamknijModalOddajDyzur() {
      document.getElementById('modal-oddaj-dyzur').style.display = 'none';
      wybranyDyzurDoOddania = null;
    }

    async function wykonajOddajDyzur() {
      if (!wybranyDyzurDoOddania || !dbFirestore) return;
      var btn = document.getElementById('btn-potwierdz-oddaj');
      btn.disabled = true;
      btn.innerText = 'Wysyłanie...';

      var isWeekend = (wybranyDyzurDoOddania.typ === 'Weekend' || wybranyDyzurDoOddania.typ === 'Niedziela' || wybranyDyzurDoOddania.typ === 'Msza niedzielna');
      var typDyzuru = isWeekend ? 'Niedziela' : 'Tydzień';
      var dOdd = wybranyDyzurDoOddania.dzien;
      var godz = wybranyDyzurDoOddania.godzina || '18:00';
      var myName = (globalUser && globalUser.nazwisko) ? globalUser.nazwisko.trim() : (localStorage.getItem('min_name') || '');
      var docKey = wybranyDyzurDoOddania.docKey || pobierzAktywnyKluczMiesiaca();
      var docRef = dbFirestore.collection('stan_grafiku').doc(docKey);
      var tempId = 'oferta_' + dOdd + '_' + Date.now();

      try {
        await dbFirestore.runTransaction(async function(transaction) {
          var sfDoc = await transaction.get(docRef);
          if (!sfDoc.exists) throw new Error('Brak grafiku w bazie.');
          var data = sfDoc.data();
          if (isWeekend) {
            if (czyWeekendMszaPrzeterminowana(dOdd, godz, data.rok, data.miesiacIdx)) {
              throw new Error('Zbyt późno na oddanie dyżuru na giełdę (mniej niż 2 godziny do mszy).');
            }
          } else {
            if (czyTydzienMszaPrzeterminowana(dOdd, godz, data.rok, data.miesiacIdx)) {
              throw new Error('Zbyt późno na oddanie dyżuru na giełdę (mniej niż 2 godziny do mszy).');
            }
          }

          var wiersze = data.wiersze || [];
          var row = wiersze.find(function(w) { return czyToSamoNazwisko(w.nazwisko, myName); });
          if (row && row.komorki) {
            var targetIdx = dOdd - 1;
            if (isWeekend && cleanTime(godz) === '17:00') {
              var dowOdd = new Date(data.rok, data.miesiacIdx, dOdd).getDay();
              targetIdx = (dowOdd === 0) ? (dOdd - 2) : (dOdd - 1);
              var sunIdx = (dowOdd === 0) ? (dOdd - 1) : dOdd;
              if (row.komorki[sunIdx] && (row.komorki[sunIdx].wartosc === 0 || row.komorki[sunIdx].wartosc === '0')) {
                row.komorki[sunIdx].wartosc = null;
              }
            }
            if (targetIdx >= 0 && row.komorki[targetIdx]) {
              row.komorki[targetIdx].wartosc = 0; // Usprawiedliwienie 0 pkt na właściwy dzień mszy!
            }
          }

          var updates = {
            wiersze: wiersze,
            zaktualizowano: firebase.firestore.FieldValue.serverTimestamp()
          };

          if (!isWeekend) {
            var wolne = data.wolneZastepstwa || [];
            var zam = data.zamianyZastepstwa || [];
            var nowaOferta = {
              id: tempId,
              dzien: dOdd,
              oddajacy: myName,
              godzina: godz,
              typ: typDyzuru,
              status: 'OCZEKUJE',
              punkty: 4,
              rok: data.rok,
              miesiacIdx: data.miesiacIdx,
              utworzono: Date.now()
            };
            wolne.push(nowaOferta);
            zam.push(nowaOferta);
            updates.wolneZastepstwa = wolne;
            updates.zamianyZastepstwa = zam;
          }

          transaction.update(docRef, updates);
        });

        btn.disabled = false;
        btn.innerText = isWeekend ? 'Zgłoś nieobecność (0 pkt)' : 'Tak, oddaj na giełdę (+4 pkt)';
        zamknijModalOddajDyzur();
        pokazToast(isWeekend ? 'Zgłoszono nieobecność (0 pkt)' : 'Dyżur oddany na giełdę wolnych');
        odswiezDane();
      } catch(err) {
        btn.disabled = false;
        btn.innerText = isWeekend ? 'Zgłoś nieobecność (0 pkt)' : 'Tak, oddaj na giełdę (+4 pkt)';
        alert(err.message || 'Wystąpił błąd podczas oddawania dyżuru.');
      }
    }
    window.otworzModalOddajDyzur = otworzModalOddajDyzur;
    window.zamknijModalOddajDyzur = zamknijModalOddajDyzur;
    window.wykonajOddajDyzur = wykonajOddajDyzur;

    async function anulujUsprawiedliwienieNiedziela(dzien, optDocKey) {
      if (!confirm('Czy na pewno chcesz wycofać zgłoszenie nieobecności i powrócić do normalnego dyżuru?')) return;
      if (!dbFirestore) return;
      var dNum = parseInt(dzien, 10);
      var myName = (globalUser && globalUser.nazwisko) ? globalUser.nazwisko.trim() : (localStorage.getItem('min_name') || '');
      var docKey = optDocKey || pobierzAktywnyKluczMiesiaca();
      var docRef = dbFirestore.collection('stan_grafiku').doc(docKey);

      try {
        await dbFirestore.runTransaction(async function(transaction) {
          var sfDoc = await transaction.get(docRef);
          if (!sfDoc.exists) return;
          var data = sfDoc.data();
          var wiersze = data.wiersze || [];
          var row = wiersze.find(function(w) { return czyToSamoNazwisko(w.nazwisko, myName); });
          if (row && row.komorki) {
            if (row.komorki[dNum - 1] && (row.komorki[dNum - 1].wartosc === 0 || row.komorki[dNum - 1].wartosc === '0')) {
              row.komorki[dNum - 1].wartosc = null;
            }
            if (dNum > 1 && row.komorki[dNum - 2] && (row.komorki[dNum - 2].wartosc === 0 || row.komorki[dNum - 2].wartosc === '0')) {
              row.komorki[dNum - 2].wartosc = null;
            }
          }
          transaction.update(docRef, {
            wiersze: wiersze,
            zaktualizowano: firebase.firestore.FieldValue.serverTimestamp()
          });
        });
        pokazToast('Wycofano zgłoszenie nieobecności.');
        odswiezDane();
      } catch(err) {
        alert(err.message || 'Wystąpił błąd podczas wycofywania nieobecności.');
      }
    }

    async function anulujMojeZastepstwo(ofertaId, dzienParam, optDocKey) {
      if (!confirm('Czy na pewno chcesz wycofać ten dyżur z giełdy i powrócić do standardowego grafiku?')) return;
      if (!dbFirestore) return;
      var anulowanyDzien = dzienParam ? parseInt(dzienParam, 10) : null;
      var myName = (globalUser && globalUser.nazwisko) ? globalUser.nazwisko.trim() : (localStorage.getItem('min_name') || '');
      var docKey = optDocKey;
      if (!docKey) {
        if (daneKolejnegoMiesiaca && (daneKolejnegoMiesiaca.wolneZastepstwa || []).some(function(z) { return z.id === ofertaId; })) {
          var now = new Date();
          var nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          docKey = wyznaczKluczMiesiaca(nextMonthDate);
        } else {
          docKey = pobierzAktywnyKluczMiesiaca();
        }
      }
      var docRef = dbFirestore.collection('stan_grafiku').doc(docKey);

      try {
        await dbFirestore.runTransaction(async function(transaction) {
          var sfDoc = await transaction.get(docRef);
          if (!sfDoc.exists) return;
          var data = sfDoc.data();
          var wiersze = data.wiersze || [];

          if (anulowanyDzien) {
            var row = wiersze.find(function(w) { return czyToSamoNazwisko(w.nazwisko, myName); });
            if (row && row.komorki && row.komorki[anulowanyDzien - 1]) {
              if (row.komorki[anulowanyDzien - 1].wartosc === 0 || row.komorki[anulowanyDzien - 1].wartosc === '0') {
                row.komorki[anulowanyDzien - 1].wartosc = null;
              }
            }
          }

          var wolne = (data.wolneZastepstwa || []).filter(function(z) {
            if (ofertaId && z.id === ofertaId) return false;
            if (anulowanyDzien && parseInt(z.dzien, 10) === anulowanyDzien) {
              if (czyToSamoNazwisko(z.oddajacy, myName)) return false;
            }
            return true;
          });

          var zam = (data.zamianyZastepstwa || []).filter(function(z) {
            if (ofertaId && z.id === ofertaId) return false;
            if (anulowanyDzien && parseInt(z.dzien, 10) === anulowanyDzien) {
              if (czyToSamoNazwisko(z.oddajacy, myName)) return false;
            }
            return true;
          });

          // Wycofaj również powiązaną ofertę z gieldaTydzien
          var gt = (data.gieldaTydzien || []).filter(function(o) {
            var odD = o.dzienOddawany !== undefined ? parseInt(o.dzienOddawany, 10) : parseInt(o.dzien, 10);
            if (anulowanyDzien && odD === anulowanyDzien && czyToSamoNazwisko(o.wystawiajacy, myName)) return false;
            return true;
          });

          transaction.update(docRef, {
            wolneZastepstwa: wolne,
            zamianyZastepstwa: zam,
            gieldaTydzien: gt,
            wiersze: wiersze,
            zaktualizowano: firebase.firestore.FieldValue.serverTimestamp()
          });
        });
        pokazToast('Dyżur wycofany z giełdy');
        odswiezDane();
      } catch(err) {
        alert(err.message || 'Wystąpił błąd podczas wycofywania oferty.');
      }
    }

    // Wycofanie się z PRZYJĘTEGO zastępstwa (dyżur wraca na giełdę jako wolny)
    async function wycofajPrzyjeteZastepstwo(ofertaId, dzienParam, optDocKey) {
      if (!confirm('Czy na pewno chcesz zrezygnować z przyjętego zastępstwa? Dyżur wróci na giełdę jako wolny.')) return;
      if (!dbFirestore) return;
      var myName = (globalUser && globalUser.nazwisko) ? globalUser.nazwisko.trim() : (localStorage.getItem('min_name') || '');
      var dzien = dzienParam ? parseInt(dzienParam, 10) : null;
      var docKey = optDocKey || pobierzAktywnyKluczMiesiaca();
      var keys = [docKey];
      var alt = wyznaczWariantKluczaMiesiaca(docKey);
      if (alt && alt !== docKey) keys.push(alt);

      function pasuje(z) {
        if (!z) return false;
        if (ofertaId && z.id === ofertaId) return true;
        return !ofertaId && dzien && parseInt(z.dzien, 10) === dzien && czyToSamoNazwisko(z.przejmujacy, myName);
      }

      try {
        var zmieniono = false;
        for (var ki = 0; ki < keys.length; ki++) {
          var docRef = dbFirestore.collection('stan_grafiku').doc(keys[ki]);
          await dbFirestore.runTransaction(async function(transaction) {
            var sfDoc = await transaction.get(docRef);
            if (!sfDoc.exists) return;
            var data = sfDoc.data();
            var wolne = data.wolneZastepstwa || [];
            var zam = data.zamianyZastepstwa || [];
            var found = null;
            wolne.concat(zam).forEach(function(z) { if (pasuje(z) && !found) found = z; });
            if (!found) return;
            if (!czyToSamoNazwisko(found.przejmujacy, myName)) {
              throw new Error('To zastępstwo nie jest przypisane do Ciebie.');
            }
            if (found.status !== 'PRZEJETE') {
              throw new Error('Tego zastępstwa nie można już wycofać.');
            }
            var curY = data.rok || (new Date()).getFullYear();
            var curM = (data.miesiacIdx !== undefined) ? data.miesiacIdx : (new Date()).getMonth();
            if (czyMszaJuzSieRozpoczela(parseInt(found.dzien, 10), cleanTime(found.godzina) || '18:00', curY, curM)) {
              throw new Error('Msza już się rozpoczęła - nie można zrezygnować z zastępstwa.');
            }
            [wolne, zam].forEach(function(lista) {
              lista.forEach(function(z) {
                if (pasuje(z)) {
                  z.status = 'OCZEKUJE';
                  z.przejmujacy = '';
                  delete z.czasPrzejecia;
                }
              });
            });
            // Jeśli oferta była tylko w zamianach, przywróć ją na giełdę wolnych
            if (!wolne.some(pasuje)) {
              var kopia = Object.assign({}, found, { status: 'OCZEKUJE', przejmujacy: '' });
              delete kopia.czasPrzejecia;
              wolne.push(kopia);
            }
            zmieniono = true;
            transaction.update(docRef, {
              wolneZastepstwa: wolne,
              zamianyZastepstwa: zam,
              zaktualizowano: firebase.firestore.FieldValue.serverTimestamp()
            });
          });
        }
        pokazToast(zmieniono ? 'Zrezygnowano z zastępstwa - dyżur wrócił na giełdę' : 'Nie znaleziono zastępstwa');
        odswiezDane();
      } catch(err) {
        alert(err.message || 'Wystąpił błąd podczas rezygnacji z zastępstwa.');
        odswiezDane();
      }
    }
    window.wycofajPrzyjeteZastepstwo = wycofajPrzyjeteZastepstwo;

    function otworzModalWezDyzur(ofertaId, dzien, oddajacy, optRok, optMiesiacIdx, optDocKey) {
      try {
        wybranaOfertaDoWziecia = {
          id: ofertaId,
          dzien: dzien,
          oddajacy: oddajacy,
          rok: optRok,
          miesiacIdx: optMiesiacIdx,
          docKey: optDocKey
        };
        var curStan = (globalUser && globalUser.stan) ? globalUser.stan : {};
        var r = optRok || curStan.rok || (new Date()).getFullYear();
        var m = (optMiesiacIdx !== undefined) ? optMiesiacIdx : (curStan.miesiacIdx !== undefined ? curStan.miesiacIdx : (new Date()).getMonth());
        var dataStr = formatujDateDnia(dzien, curStan, r, m);
        var dt = new Date(r, m, dzien);
        var isSunday = (dt.getDay() === 0);
        var pts = isSunday ? 3 : 4;

        document.getElementById('modal-wez-opis').innerHTML = 'Czy chcesz przejąć wolny dyżur w dniu <b>' + dataStr + '</b> od ministranta <b>' + oddajacy + '</b>?';
        var badge = document.querySelector('#modal-wez-dyzur .badge-plus4');
        if (badge) badge.innerText = '+' + pts + ' PKT';
        var btnP = document.getElementById('btn-potwierdz-wez');
        if (btnP) btnP.innerText = 'Weź dyżur (+' + pts + ' pkt)';

        var boxSzczegoly = document.querySelector('#modal-wez-dyzur .modal-content > div:first-of-type');
        if (boxSzczegoly) {
          if (isSunday) {
            boxSzczegoly.innerHTML = '<div>• <b>Punkty za mszę:</b> za obecność na tej mszy niedzielnej otrzymasz <b>+3 punkty</b>!</div><div>• Zostaniesz wpisany jako oficjalny zastępca.</div>';
          } else {
            boxSzczegoly.innerHTML = '<div>• <b>Bonus punktowy:</b> za obecność na tej mszy otrzymasz <b>+4 punkty</b> (zamiast standardowych 2 pkt)!</div><div>• Zostaniesz wpisany jako oficjalny zastępca.</div>';
          }
        }
        document.getElementById('modal-wez-dyzur').style.display = 'flex';
      } catch(err) {
        alert('BŁĄD otworzModalWezDyzur: ' + err.message);
      }
    }

    function zamknijModalWezDyzur() {
      document.getElementById('modal-wez-dyzur').style.display = 'none';
      wybranaOfertaDoWziecia = null;
    }

    async function wykonajWezDyzur() {
      if (!wybranaOfertaDoWziecia || !dbFirestore) return;
      var btn = document.getElementById('btn-potwierdz-wez');
      btn.disabled = true;
      btn.innerText = 'Przejmowanie...';
      
      var ofertaId = (typeof wybranaOfertaDoWziecia === 'object') ? wybranaOfertaDoWziecia.id : wybranaOfertaDoWziecia;
      var docKey = (typeof wybranaOfertaDoWziecia === 'object' && wybranaOfertaDoWziecia.docKey) ? wybranaOfertaDoWziecia.docKey : null;

      if (!docKey) {
        if (daneKolejnegoMiesiaca && (daneKolejnegoMiesiaca.wolneZastepstwa || []).some(function(z) { return z.id === ofertaId; })) {
          var now = new Date();
          var nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          docKey = wyznaczKluczMiesiaca(nextMonthDate);
        } else {
          docKey = pobierzAktywnyKluczMiesiaca();
        }
      }

      var myName = (globalUser && globalUser.nazwisko) ? globalUser.nazwisko.trim() : (localStorage.getItem('min_name') || '');
      if (!myName) {
        alert('Musisz być zalogowany, aby przejąć dyżur.');
        btn.disabled = false;
        btn.innerText = 'Weź dyżur (+4 pkt)';
        return;
      }
      
      var docRef = dbFirestore.collection('stan_grafiku').doc(docKey);

      try {
        await dbFirestore.runTransaction(async function(transaction) {
          var sfDoc = await transaction.get(docRef);
          if (!sfDoc.exists) throw new Error("Brak danych grafiku w bazie.");
          var data = sfDoc.data();
          
          var wolne = data.wolneZastepstwa || [];
          var idx = wolne.findIndex(function(o) { return o.id === ofertaId; });
          if (idx === -1 || wolne[idx].status !== 'OCZEKUJE') {
            throw new Error("Ta służba została już przejęta przez innego ministranta!");
          }
          if (czyMszaJuzSieRozpoczela(wolne[idx].dzien, cleanTime(wolne[idx].godzina) || '18:00', data.rok, data.miesiacIdx)) {
            throw new Error("Msza już się rozpoczęła - nie można już przejąć tej służby.");
          }
          
          var oddajacy = wolne[idx].oddajacy;
          if (czyToSamoNazwisko(oddajacy, myName)) {
            throw new Error("Nie możesz przejąć własnego dyżuru.");
          }
          
          // Zaktualizuj ofertę
          wolne[idx].status = 'PRZEJETE';
          wolne[idx].przejmujacy = myName;
          wolne[idx].czasPrzejecia = Date.now();
          
          // Zaktualizuj zamianyZastepstwa
          if (!data.zamianyZastepstwa) data.zamianyZastepstwa = [];
          var zIdx = data.zamianyZastepstwa.findIndex(function(z) { return z.id === ofertaId; });
          if (zIdx !== -1) {
            data.zamianyZastepstwa[zIdx].status = 'PRZEJETE';
            data.zamianyZastepstwa[zIdx].przejmujacy = myName;
          } else {
            data.zamianyZastepstwa.push(wolne[idx]);
          }

          transaction.update(docRef, {
            wolneZastepstwa: wolne,
            zamianyZastepstwa: data.zamianyZastepstwa,
            zaktualizowano: firebase.firestore.FieldValue.serverTimestamp()
          });
        });

        btn.disabled = false;
        btn.innerText = 'Weź dyżur (+4 pkt)';
        zamknijModalWezDyzur();
        pokazToast('Przejąłeś dyżur! Przyznano +4 pkt');
        odswiezDane();
      } catch(err) {
        btn.disabled = false;
        btn.innerText = 'Weź dyżur (+4 pkt)';
        alert(err.message || 'Wystąpił błąd podczas przejmowania dyżuru.');
        zamknijModalWezDyzur();
        odswiezDane();
      }
    }