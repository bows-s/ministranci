// =============================================================
    // AUTORYZACJA I ZARZĄDZANIE GRAFIKIEM (100% FIREBASE FIRESTORE)
    // =============================================================
    var PIN_SALT = 'parafia_sw_jozefa_2026_';

    async function obliczHashPIN(pin) {
      var str = PIN_SALT + (pin || '').toString().trim();
      if (window.crypto && window.crypto.subtle) {
        var encoder = new TextEncoder();
        var data = encoder.encode(str);
        var hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        var hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
      }
      var hash = 0;
      for (var i = 0; i < str.length; i++) {
        var char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
      }
      return 'simple_' + Math.abs(hash);
    }

    function wyznaczKluczMiesiaca(dataOdniesienia) {
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
              var dtPrev = new Date(baza.rok || (new Date()).getFullYear(), baza.miesiacIdx !== undefined ? baza.miesiacIdx : (targetMIdx === 0 ? 11 : targetMIdx - 1), dayIdx + 1);
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
          var pmListPrzeniesione = (prevItem && prevItem.punktyPoMiesiacach && Array.isArray(prevItem.punktyPoMiesiacach))
            ? JSON.parse(JSON.stringify(prevItem.punktyPoMiesiacach))
            : [];
          rankingRokPrzeniesiony.push({
            nazwisko: nw.nazwisko,
            normName: nw.nazwisko.toLowerCase().trim(),
            punkty: prevItem ? (prevItem.punkty || prevItem.suma || 0) : 0,
            suma: prevItem ? (prevItem.punkty || prevItem.suma || 0) : 0,
            grupa: nw.grupa,
            punktyPoMiesiacach: pmListPrzeniesione
          });
        }
        rankingRokPrzeniesiony.sort(function(a, b) { return b.punkty - a.punkty; });
        var poz = 1;
        rankingRokPrzeniesiony.forEach(function(r, idx) {
          if (idx > 0 && r.punkty < rankingRokPrzeniesiony[idx - 1].punkty) poz = idx + 1;
          r.pozycja = poz;
          r.miejsce = poz;
        });

        // Przenosimy pełną historię punktów minusowych z poprzednich miesięcy!
        var prevMinusyRok = (baza.rankingMinusyRok && baza.rankingMinusyRok.length)
          ? baza.rankingMinusyRok
          : ((baza.rankingMinusy && baza.rankingMinusy.length) ? baza.rankingMinusy : []);
        var rankingMinusyRokPrzeniesiony = JSON.parse(JSON.stringify(prevMinusyRok || []));

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
          rankingMinusy: rankingMinusyRokPrzeniesiony,
          rankingMinusyRok: rankingMinusyRokPrzeniesiony,
          rankingMinusyMiesiac: [],
          rankingiMiesiecy: baza.rankingiMiesiecy || {},
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
    }

    var aktywnyKluczMiesiacaGlobal = (function() {
      var realCalMonth = wyznaczKluczMiesiaca(new Date());
      try {
        var cached = localStorage.getItem('min_active_month');
        if (cached && cached !== realCalMonth) {
          localStorage.removeItem('min_cached_data');
          localStorage.removeItem('min_cached_tabela');
          localStorage.setItem('min_active_month', realCalMonth);
          return realCalMonth;
        }
        return cached || realCalMonth;
      } catch(e) {
        return realCalMonth;
      }
    })();

    function pobierzAktywnyKluczMiesiaca() {
      return aktywnyKluczMiesiacaGlobal || wyznaczKluczMiesiaca(new Date());
    }

    var wybranyMiesiacTabeli = pobierzAktywnyKluczMiesiaca();

    var daneKolejnegoMiesiaca = (function() {
      try {
        var nowD = new Date();
        var nDt = new Date(nowD.getFullYear(), nowD.getMonth() + 1, 1);
        var nDocId = wyznaczKluczMiesiaca(nDt);
        var cNext = localStorage.getItem('min_cached_tabela_' + nDocId);
        if (cNext) return JSON.parse(cNext);
      } catch(e) {}
      return null;
    })();

    var unsubKolejnyMiesiac = null;
    function wczytajKolejnyMiesiacJesliKoniecMiesiaca() {
      if (!dbFirestore) return;
      var nowD = new Date();
      if (nowD.getDate() >= 20) {
        var nDt = new Date(nowD.getFullYear(), nowD.getMonth() + 1, 1);
        var nDocId = wyznaczKluczMiesiaca(nDt);
        if (unsubKolejnyMiesiac) {
          try { unsubKolejnyMiesiac(); } catch(e) {}
        }
        try {
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
        } catch(eSnap) {
          console.warn('Błąd subskrypcji kolejnego miesiąca:', eSnap);
        }
      }
    }

function logujJakoKoscielny() {
      var pin = prompt('Podaj PIN dla Kościelnego:');
      if (pin === null) return; // anulowano
      if ((pin || '').trim() !== '0000') {
        alert('Nieprawidłowy PIN.');
        return;
      }
      localStorage.setItem('min_name', 'Kościelny');
      localStorage.setItem('min_pin', '0000');
      globalUser.nazwisko = 'Kościelny';
      globalUser.pin = '0000';
      globalUser.stan = null; // wyczyść stary stan
      document.getElementById('auth-panel').style.display = 'none';
      document.getElementById('app-panel').style.display = 'block';
      document.getElementById('user-display').innerText = 'Kościelny';
      sprawdzUprawnieniaZakrystii();
      otworzTrybZakrystia();
      pokazToast('Zalogowano jako Kościelny');
    }

    function wypelnijSelectUzytkownikow(wybraneNazwisko) {
      var sel = document.getElementById('auth-select-user');
      if (!sel) return;
      var curVal = (typeof wybraneNazwisko === 'string') ? wybraneNazwisko : sel.value;
      sel.innerHTML = '<option value="">Wybierz siebie z listy...</option>';
      listaUzytkownikow.filter(function(u) {
        var un = (u.nazwisko || '').toLowerCase();
        return un.indexOf('kościelny') === -1 && un.indexOf('koscielny') === -1;
      }).forEach(function(u) {
        var opt = document.createElement('option');
        opt.value = u.nazwisko;
        opt.innerText = u.nazwisko;
        if (curVal && u.nazwisko === curVal) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.value = curVal || '';
      zmianaUzytkownika();
    }

    function zmianaUzytkownika() {
      var selName = document.getElementById('auth-select-user').value;
      var container = document.getElementById('pin-container');
      var label = document.getElementById('pin-label');
      var hint = document.getElementById('pin-hint');
      var pinInput = document.getElementById('auth-pin');
      var btn = document.getElementById('btn-login');
      if (!selName) { container.style.display = 'none'; return; }
      container.style.display = 'block';

      if (selName.toLowerCase().indexOf('kościelny') !== -1 || selName.toLowerCase().indexOf('koscielny') !== -1) {
        label.innerText = 'Dostęp dla Kościelnego:';
        hint.innerText = 'Nie wymaga kodu PIN. Kliknij przycisk poniżej, aby otworzyć panel odhaczania.';
        if (pinInput) pinInput.style.display = 'none';
        btn.innerText = 'Wejdź do panelu Zakrystii';
        return;
      }

      if (pinInput) pinInput.style.display = 'block';
      btn.innerText = 'Zaloguj się';

      var u = listaUzytkownikow.find(function(x) { return x.nazwisko === selName; });
      if (u && !u.maPin) {
        label.innerText = 'Ustal swój 4-cyfrowy PIN:';
        hint.innerText = 'Zapamiętaj go. Będziesz go używać przy każdym logowaniu.';
      } else {
        label.innerText = 'Wpisz swój PIN:';
        hint.innerText = '';
      }
    }

    async function logowanie() {
      var n = document.getElementById('auth-select-user').value;
      var p = document.getElementById('auth-pin').value.trim();
      var btn = document.getElementById('btn-login');

      // Obsługa konta Kościelny (błyskawiczne logowanie 0 ms!)
      if (n.toLowerCase().indexOf('kościelny') !== -1 || n.toLowerCase().indexOf('koscielny') !== -1) {
        localStorage.setItem('min_name', n);
        localStorage.setItem('min_pin', p || '0000');
        globalUser.nazwisko = n;
        globalUser.pin = p || '0000';
        document.getElementById('auth-panel').style.display = 'none';
        document.getElementById('app-panel').style.display = 'block';
        document.getElementById('user-display').innerText = n;
        otworzTrybZakrystia();
        pokazToast('Zalogowano jako Kościelny');
        return;
      }

      if (!n) { alert('Wybierz profil z listy ministrantów.'); return; }
      if (!p || p.length !== 4) { alert('Podaj 4-cyfrowy kod PIN.'); return; }

      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }

      function zalogujSukces() {
        localStorage.setItem('min_name', n);
        localStorage.setItem('min_pin', p);
        globalUser.nazwisko = n;
        globalUser.pin = p;
        document.getElementById('auth-panel').style.display = 'none';
        document.getElementById('app-panel').style.display = 'block';
        document.getElementById('user-display').innerText = n;
        pokazWidok('pulpit');
        sprawdzUprawnieniaZakrystii();
        pokazMiniRefresh(true);

        // Natychmiastowy render stanu (0 ms!)
        if (tabelaMiesiacaDane) {
          var stan = generujStanZFirestore(n, tabelaMiesiacaDane);
          if (stan) {
            renderujDane(stan);
            ukryjSpinner();
          }
        } else {
          var cachedTbl = null;
          try {
            var raw = localStorage.getItem('min_cached_tabela');
            if (raw) cachedTbl = JSON.parse(raw);
          } catch(e) {}
          if (cachedTbl) {
            tabelaMiesiacaDane = cachedTbl;
            var stan2 = generujStanZFirestore(n, cachedTbl);
            if (stan2) {
              renderujDane(stan2);
              ukryjSpinner();
            }
          }
          if (dbFirestore) {
            dbFirestore.collection('stan_grafiku').doc(pobierzAktywnyKluczMiesiaca()).get().then(function(doc) {
              ukryjSpinner();
              if (doc.exists && doc.data()) {
                tabelaMiesiacaDane = doc.data();
                try { localStorage.setItem('min_cached_tabela', JSON.stringify(tabelaMiesiacaDane)); } catch(e) {}
                var stan3 = generujStanZFirestore(n, doc.data());
                if (stan3) renderujDane(stan3);
              }
            }).catch(function() { ukryjSpinner(); });
          }
        }

        sprawdzStanPowiadomien();
        sprawdzURLParametry();
        pokazToast('Zalogowano pomyślnie');
      }

      var u = (listaUzytkownikow || []).find(function(x) { return x.nazwisko === n; });

      btn.disabled = true;
      btn.innerHTML = '<span class="mini-spin"></span> Sprawdzanie PIN...';

      try {
        var pHash = await obliczHashPIN(p);

        if (!dbFirestore) {
          btn.disabled = false;
          btn.innerHTML = 'Zaloguj się';
          zalogujSukces();
          return;
        }

        // Sprawdź w zabezpieczonej kolekcji autoryzacja_pin
        var authDoc = await dbFirestore.collection('autoryzacja_pin').doc(n).get();
        if (!authDoc.exists) {
          // Ustalenie PIN po raz pierwszy
          await dbFirestore.collection('autoryzacja_pin').doc(n).set({
            nazwisko: n,
            pinHash: pHash,
            utworzono: firebase.firestore.FieldValue.serverTimestamp()
          });
          if (u) u.maPin = true;
          try {
            await dbFirestore.collection('konfiguracja').doc('uzytkownicy').set({
              lista: (listaUzytkownikow || []).map(function(item) {
                return { nazwisko: item.nazwisko, maPin: (item.nazwisko === n ? true : !!item.maPin) };
              }),
              zaktualizowano: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
          } catch(eU) {}
          btn.disabled = false;
          btn.innerHTML = 'Zaloguj się';
          pokazToast('PIN został pomyślnie ustalony');
          zalogujSukces();
          return;
        }

        var savedData = authDoc.data();
        if (savedData && savedData.pinHash === pHash) {
          btn.disabled = false;
          btn.innerHTML = 'Zaloguj się';
          zalogujSukces();
        } else {
          btn.disabled = false;
          btn.innerHTML = 'Zaloguj się';
          alert('Błędny kod PIN. Spróbuj ponownie.');
        }
      } catch(errAuth) {
        console.error('Błąd logowania:', errAuth);
        btn.disabled = false;
        btn.innerHTML = 'Zaloguj się';
        alert('Błąd połączenia podczas sprawdzania PIN. Spróbuj ponownie.');
      }
    }

    function wyloguj() {
      localStorage.removeItem('min_name');
      localStorage.removeItem('min_pin');
      localStorage.removeItem('min_cached_data'); // czyść cache przy wylogowaniu
      localStorage.removeItem('fcm_user'); // czyść zapisanego użytkownika push
      globalUser = { nazwisko: '', pin: '', stan: null };
      wybranyDzienTydzien = null;
      wybranyDzienNiedziela = null;
      mapaTekstowOfert = {};
      tabelaMiesiacaDane = null;
      
      document.getElementById('auth-pin').value = '';
      document.getElementById('auth-select-user').value = '';
      document.getElementById('pin-container').style.display = 'none';
      
      // Reset widoków do pulpitu
      if (document.getElementById('widok-tryb-zakrystia')) document.getElementById('widok-tryb-zakrystia').style.display = 'none';
      if (document.getElementById('widok-tabela-miesiaca')) document.getElementById('widok-tabela-miesiaca').style.display = 'none';
      if (document.getElementById('widok-gielda')) document.getElementById('widok-gielda').style.display = 'none';
      if (document.getElementById('widok-pulpit')) document.getElementById('widok-pulpit').style.display = 'block';
      if (document.getElementById('karta-funkcja-dzisiaj')) document.getElementById('karta-funkcja-dzisiaj').style.display = 'none';

      document.getElementById('app-panel').style.display = 'none';
      document.getElementById('auth-panel').style.display = 'block';
      wypelnijSelectUzytkownikow('');
    }

    function odswiezDane() {
      pokazMiniRefresh(true);
      var mDocId = pobierzAktywnyKluczMiesiaca();
      if (dbFirestore) {
        dbFirestore.collection('stan_grafiku').doc(mDocId).get().then(async function(doc) {
          pokazMiniRefresh(false);
          var docData = (doc.exists && doc.data()) ? doc.data() : null;
          if (!docData) {
            docData = await zapewnijStanGrafikuDlaMiesiaca(mDocId);
          }
          if (docData) {
            tabelaMiesiacaDane = docData;
            try { localStorage.setItem('min_cached_tabela', JSON.stringify(tabelaMiesiacaDane)); } catch(e) {}
            if (globalUser && globalUser.nazwisko) {
              var stan = generujStanZFirestore(globalUser.nazwisko, doc.data());
              if (stan) renderujDane(stan);
            }
            var widokTabeli = document.getElementById('widok-tabela-miesiaca');
            if (widokTabeli && widokTabeli.style.display !== 'none') {
              renderujFiltryTabeli();
              renderujTabeleMiesiaca();
            }
            var widokZakrystia = document.getElementById('widok-tryb-zakrystia');
            if (widokZakrystia && widokZakrystia.style.display !== 'none') {
              wczytajDaneDlaZakrystii();
            }
            wczytajKolejnyMiesiacJesliKoniecMiesiaca();
            pokazToast('Grafik zaktualizowany');
          }
        }).catch(function(e) {
          pokazMiniRefresh(false);
          console.warn('Firestore refresh error:', e);
        });
      } else {
        pokazMiniRefresh(false);
      }
    }