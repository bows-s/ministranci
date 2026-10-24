// =============================================================
    // MODUŁ TRYB ZAKRYSTIA (SMART ATTENDANCE)
    // =============================================================
    var zakrystiaStan = {
      rok: null,
      miesiacIdx: null,
      nazwaMiesiaca: '',
      dzien: null,
      godzina: null,
      dataTekst: '',
      juzZapisane: false,
      ministranci: [],
      wszyscyMinistranciParafii: []
    };

    function czyToDzienSwiateczny5Pkt(dNum, curMIdx, curYear, daneTabeli) {
      if (dNum === 1 && curMIdx === 10) return true; // 1 listopada - Wszystkich Świętych
      var dNaglowek = (daneTabeli && daneTabeli.dniNaglowek) ? (daneTabeli.dniNaglowek[dNum - 1] || daneTabeli.dniNaglowek['' + (dNum - 1)]) : null;
      if (dNaglowek && (dNaglowek.czySwieto || dNaglowek.punktyZaObecnosc === 5)) return true;
      if (typeof wyznaczDaneLiturgiczne === 'function') {
        var lit = wyznaczDaneLiturgiczne(new Date(curYear || 2026, curMIdx !== undefined ? curMIdx : 9, dNum));
        if (lit && (lit.ranga === 'Uroczystość' || (lit.nazwa && lit.nazwa.indexOf('Wszystkich Świętych') !== -1))) {
          return true;
        }
      }
      return false;
    }

    function czyMinistrantBylJuzNaInnejMszyWSwieto(wiersz, colIdx, curGKey) {
      if (!wiersz || !wiersz.komorki || !wiersz.komorki[colIdx]) return false;
      var cell = wiersz.komorki[colIdx];
      var normCurG = (typeof cleanTime === 'function' && curGKey) ? cleanTime(curGKey) : (curGKey || '').trim();
      if (!cell.liturgie || typeof cell.liturgie !== 'object') {
        return (typeof cell.wartosc === 'number' && cell.wartosc >= 5);
      }
      var keys = Object.keys(cell.liturgie);
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        var normK = (typeof cleanTime === 'function') ? cleanTime(k) : k.trim();
        if (normK !== normCurG) {
          var val = cell.liturgie[k];
          var numVal = (typeof val === 'number') ? val : (val && typeof val.punkty === 'number' ? val.punkty : parseFloat(val));
          if (!isNaN(numVal) && numVal > 0) {
            return true;
          }
        }
      }
      return false;
    }

        function generujStanZFirestore(nazwisko, docData) {
      if (!docData) return null;
      var now = new Date();
      var currentYear = docData.rok || now.getFullYear();
      var currentMonthIdx = (docData.miesiacIdx !== undefined) ? docData.miesiacIdx : now.getMonth();
      var currentDay = now.getDate();
      var daysInMonth = (docData.dniNaglowek && docData.dniNaglowek.length) || new Date(currentYear, currentMonthIdx + 1, 0).getDate();

      var polishMonthsAll = [
        "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
        "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
      ];
      var polishMonthsGenitive = [
        "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
        "lipca", "sierpnia", "września", "października", "listopada", "grudnia"
      ];
      var currentMonthName = docData.nazwaMiesiaca || polishMonthsAll[currentMonthIdx] || wyznaczKluczMiesiaca(new Date()).split('_')[0];
      var currentMonthNameGenitive = polishMonthsGenitive[currentMonthIdx];

      var nClean = (nazwisko || "").trim();
      var nLower = nClean.toLowerCase();

      // 1. Wiersz użytkownika z tabeli
      var rawWiersze = docData.wiersze || (tabelaMiesiacaDane && tabelaMiesiacaDane.wiersze) || [];
      var wiersze = rawWiersze.filter(function(w) {
        var nw = (w && w.nazwisko ? w.nazwisko : '').toLowerCase().trim();
        return nw && nw.indexOf('pokojsk') === -1;
      });
      wiersze.forEach(function(w) {
        if (w && w.komorki && Array.isArray(w.komorki)) {
          var sumK = w.komorki.reduce(function(acc, c) {
            var v = c ? c.wartosc : null;
            if (typeof v === 'number') return acc + v;
            if (typeof v === 'string') {
              var p = parseFloat(v.replace(',', '.'));
              if (!isNaN(p)) return acc + p;
            }
            return acc;
          }, 0);
          w.suma = Math.round(sumK * 10) / 10;
        }
      });
      var userRow = wiersze.find(function(w) {
        var nw = (w.nazwisko || "").trim().toLowerCase();
        return nw && (nw === nLower || nw.indexOf(nLower) !== -1 || nLower.indexOf(nw) !== -1);
      });

      // 2. Zamiany i zastępstwa dla tego użytkownika
      var mojeOddaneZastepstwa = {};
      var mojePrzejeteZastepstwa = {};
      var rawZList = [].concat(docData.zamianyZastepstwa || [], docData.wolneZastepstwa || []);
      if (rawZList.length === 0 && tabelaMiesiacaDane) {
        rawZList = [].concat(tabelaMiesiacaDane.zamianyZastepstwa || [], tabelaMiesiacaDane.wolneZastepstwa || []);
      }
      var seenZKeys = {};
      var wszystkieZastepstwa = [];
      rawZList.forEach(function(z) {
        if (!z) return;
        var zk = z.id || (z.dzien + '_' + z.oddajacy + '_' + z.przejmujacy);
        if (!seenZKeys[zk]) {
          seenZKeys[zk] = true;
          wszystkieZastepstwa.push(z);
        }
      });

      wszystkieZastepstwa.forEach(function(z) {
        var oddNorm = (z.oddajacy || "").trim().toLowerCase();
        var przejNorm = (z.przejmujacy || "").trim().toLowerCase();
        var isMeOdd = !!(oddNorm && (oddNorm === nLower || oddNorm.indexOf(nLower) !== -1 || nLower.indexOf(oddNorm) !== -1));
        var isMePrzej = !!(przejNorm && (przejNorm === nLower || przejNorm.indexOf(nLower) !== -1 || nLower.indexOf(przejNorm) !== -1));

        if (isMeOdd) {
          mojeOddaneZastepstwa[z.dzien] = {
            id: z.id,
            status: z.status,
            przejmujacy: z.przejmujacy,
            godzina: z.godzina,
            typ: z.typ
          };
        }
        if (isMePrzej && (z.status === "PRZEJETE" || z.status === "ZREALIZOWANE" || z.status === "NIESTAWIONY")) {
          mojePrzejeteZastepstwa[z.dzien] = {
            id: z.id,
            status: z.status,
            oddajacy: z.oddajacy,
            godzina: z.godzina,
            typ: z.typ
          };
        }
      });

      // 3. Moje dyżury stałe w tygodniu roboczym (ŚCIŚLE PONIEDZIAŁEK - PIĄTEK!)
      var mojeDyzuryTydzien = [];
      var myStalyDzien = (userRow && userRow.stalyDzienTygodnia !== undefined && userRow.stalyDzienTygodnia !== null) ? userRow.stalyDzienTygodnia : -1;
      for (var d = 1; d <= daysInMonth; d++) {
        var dt = new Date(currentYear, currentMonthIdx, d);
        var dow = dt.getDay(); // 0: Niedziela, 1..5: Pn..Pt, 6: Sobota
        if (dow >= 1 && dow <= 5) {
          var k = (userRow && userRow.komorki) ? userRow.komorki[d - 1] : null;
          var nagl = (docData.dniNaglowek && docData.dniNaglowek[d - 1]) ? docData.dniNaglowek[d - 1] : null;
          if (!nagl || (!nagl.czyNiedziela && !nagl.czySobota)) {
            var maDyzurWTymDniu = (myStalyDzien > 0 && dow === myStalyDzien) || (k && k.maDyzur);
            if (maDyzurWTymDniu) {
              mojeDyzuryTydzien.push(d);
            }
          }
        }
      }

      // 4. Dyżury niedzielne / weekendowe
      var godzinyWeekendy = {};
      var mojaGodzinaNiedziela = docData.mojaGodzinaNiedziela || "";
      var godzinyGrup = docData.godzinyGrup || (tabelaMiesiacaDane && tabelaMiesiacaDane.godzinyGrup) || {};
      var userGrupa = (userRow && userRow.grupa) ? userRow.grupa.toUpperCase() : "";
      if (!userGrupa && globalUser && globalUser.nazwisko) {
        userGrupa = wyznaczGrupeParafialna(globalUser.nazwisko, "").toUpperCase();
      }
      if (!mojaGodzinaNiedziela && userGrupa) {
        for (var gK in godzinyGrup) {
          if (userGrupa.indexOf(gK.toUpperCase()) !== -1 || gK.toUpperCase().indexOf(userGrupa) !== -1 || dopasujGrupe(gK, userGrupa)) {
            mojaGodzinaNiedziela = cleanTime(godzinyGrup[gK]);
            break;
          }
        }
      }
      if (!mojaGodzinaNiedziela && userGrupa) {
        var rotUser = wyznaczRotowaneGodzinyGrup(currentYear, currentMonthIdx);
        for (var rGu in rotUser) {
          if (userGrupa.indexOf(rGu.toUpperCase()) !== -1 || rGu.toUpperCase().indexOf(userGrupa) !== -1 || dopasujGrupe(rGu, userGrupa)) {
            mojaGodzinaNiedziela = rotUser[rGu];
            break;
          }
        }
      }
      if (!mojaGodzinaNiedziela) mojaGodzinaNiedziela = "10:00";

      for (var day = 1; day <= daysInMonth; day++) {
        var dt = new Date(currentYear, currentMonthIdx, day);
        if (dt.getDay() === 0) {
          var naglSun = (docData.dniNaglowek && docData.dniNaglowek[day - 1]) ? docData.dniNaglowek[day - 1] : null;
          var kSun = (userRow && userRow.komorki) ? userRow.komorki[day - 1] : null;
          var kSat = (day > 1 && userRow && userRow.komorki) ? userRow.komorki[day - 2] : null;
          var isSatVigil = (mojaGodzinaNiedziela === "17:00");
          var hasWeekendDyzur = !!(userGrupa && userGrupa.length > 0) || (isSatVigil ? ((kSat && kSat.maDyzur) || (kSun && kSun.maDyzur)) : (kSun && kSun.maDyzur));
          if (hasWeekendDyzur) {
            var isOddane = !!(mojeOddaneZastepstwa[day] && (mojeOddaneZastepstwa[day].status === "OCZEKUJE" || mojeOddaneZastepstwa[day].status === "PRZEJETE" || mojeOddaneZastepstwa[day].status === "ZREALIZOWANE"));
            var checkCell = isSatVigil ? ((kSat && kSat.wartosc !== null && kSat.wartosc !== undefined && kSat.wartosc !== "") ? kSat : kSun) : kSun;
            var isUspraw = (checkCell && (checkCell.wartosc === 0 || checkCell.wartosc === "0")) || isOddane;
            godzinyWeekendy[day] = {
              godzina: (naglSun && naglSun.godzina) || mojaGodzinaNiedziela,
              czyZamienione: false,
              czyUsprawiedliwiony: isUspraw
            };
          }
        }
      }

      // Jeśli ministrant ma dyżur w soboty o 17:00 i miesiąc kończy się w sobotę (np. 31 października)
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
      }

      // 4b. Zaakceptowane zamiany weekendowe (wymiany 1:1)
      var zamianyWknd = docData.zamianyNiedziele || (tabelaMiesiacaDane && tabelaMiesiacaDane.zamianyNiedziele) || [];
      zamianyWknd.forEach(function(zn) {
        if (!zn || zn.status === 'ANULOWANA' || zn.typ === 'RECZNA') return;
        var zDzien = zn.dzien;
        var zWyst = zn.wystawiajacy;
        var zPrzej = zn.przejmujacy;
        if (czyToSamoNazwisko(zWyst, nazwisko)) {
          godzinyWeekendy[zDzien] = {
            godzina: cleanTime(zn.godzinaPrzejmujacego),
            czyZamienione: true,
            szczegoly: "zamiana z " + zPrzej,
            czyUsprawiedliwiony: false
          };
        } else if (czyToSamoNazwisko(zPrzej, nazwisko)) {
          godzinyWeekendy[zDzien] = {
            godzina: cleanTime(zn.godzinaWystawiajacego),
            czyZamienione: true,
            szczegoly: "zamiana z " + zWyst,
            czyUsprawiedliwiony: false
          };
        }
      });
      // Ręczne przeniesienia ustawione przez zakrystię — nadpisują zamiany 1:1
      zamianyWknd.forEach(function(zr) {
        if (!zr || zr.typ !== 'RECZNA' || zr.status === 'ANULOWANA') return;
        if (!czyToSamoNazwisko(zr.ministrant, nazwisko)) return;
        godzinyWeekendy[zr.dzien] = {
          godzina: cleanTime(zr.godzina),
          czyZamienione: true,
          szczegoly: "przeniesione przez zakrystię",
          czyUsprawiedliwiony: false
        };
      });

      // 4c. Automatyczne rozliczenie wygasłych ofert weekendowych na 0 pkt (usprawiedliwienie po rozpoczęciu mszy)
      var allGN = docData.gieldaNiedziele || (tabelaMiesiacaDane && tabelaMiesiacaDane.gieldaNiedziele) || [];
      allGN.forEach(function(o) {
        if (!o || o.status === 'ANULOWANA' || o.status === 'ZAAKCEPTOWANA') return;
        var gO = cleanTime(o.godzinaOddawana || o.godzina || '10:00');
        var wlasnaMszaWystartowala = czyMszaJuzSieRozpoczela(o.dzien, gO, currentYear, currentMonthIdx);

        if (wlasnaMszaWystartowala || o.status === 'WYGASLA_USPRAWIEDLIWIONA') {
          o.status = 'WYGASLA_USPRAWIEDLIWIONA';
          if (czyToSamoNazwisko(o.wystawiajacy, nazwisko)) {
            if (godzinyWeekendy[o.dzien]) {
              godzinyWeekendy[o.dzien].czyUsprawiedliwiony = true;
            }
            if (userRow && userRow.komorki) {
              var realSunDay = (gO === '17:00') ? (o.dzien - 1) : o.dzien;
              if (userRow.komorki[realSunDay - 1] && (userRow.komorki[realSunDay - 1].wartosc === null || userRow.komorki[realSunDay - 1].wartosc === undefined || userRow.komorki[realSunDay - 1].wartosc === '')) {
                userRow.komorki[realSunDay - 1].wartosc = 0;
              }
              if (realSunDay !== o.dzien && userRow.komorki[o.dzien - 1] && (userRow.komorki[o.dzien - 1].wartosc === null || userRow.komorki[o.dzien - 1].wartosc === undefined || userRow.komorki[o.dzien - 1].wartosc === '')) {
                userRow.komorki[o.dzien - 1].wartosc = 0;
              }
            }
          }
        }
      });

      // 4d. Automatyczne rozliczenie wygasłych ofert w tygodniu na 0 pkt (usprawiedliwienie po rozpoczęciu mszy)
      var allGT = docData.gieldaTydzien || (tabelaMiesiacaDane && tabelaMiesiacaDane.gieldaTydzien) || [];
      allGT.forEach(function(o) {
        if (!o || o.status === 'ANULOWANA' || o.status === 'ZAAKCEPTOWANA') return;
        var dO = o.dzienOddawany !== undefined ? o.dzienOddawany : o.dzien;
        var gO = cleanTime(o.godzina) || '18:00';
        var isStartedPassed = czyMszaJuzSieRozpoczela(dO, gO, currentYear, currentMonthIdx);
        if (isStartedPassed || o.status === 'WYGASLA_USPRAWIEDLIWIONA' || o.status === 'PRZEKSZTALCONA_NA_WOLNY') {
          if (czyToSamoNazwisko(o.wystawiajacy, nazwisko)) {
            if (userRow && userRow.komorki && userRow.komorki[dO - 1]) {
              if (userRow.komorki[dO - 1].wartosc === null || userRow.komorki[dO - 1].wartosc === undefined || userRow.komorki[dO - 1].wartosc === '') {
                userRow.komorki[dO - 1].wartosc = 0;
              }
            }
          }
        }
      });

      // 5. Najbliższa służba
      function czyMszaJuzMinaDzisLocal(godzinaStr) {
        if (!godzinaStr) return false;
        var parts = godzinaStr.split(":");
        if (parts.length < 2) return false;
        var h = parseInt(parts[0], 10);
        var m = parseInt(parts[1], 10);
        if (isNaN(h) || isNaN(m)) return false;
        var now = new Date();
        var massEndTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m + 45);
        return now.getTime() > massEndTime.getTime();
      }

      var najblizszaSluzba = { jest: false, tekst: "Brak zaplanowanych służb" };
      for (var d = currentDay; d <= daysInMonth; d++) {
        var nagl = (docData.dniNaglowek && docData.dniNaglowek[d - 1]) ? docData.dniNaglowek[d - 1] : null;
        var skrot = nagl ? nagl.skrotDnia : '';
        var k = (userRow && userRow.komorki) ? userRow.komorki[d - 1] : null;
        var dtCheck = new Date(currentYear, currentMonthIdx, d);
        var dowCheck = dtCheck.getDay();
        var isSunday = (dowCheck === 0);
        var isSaturday = (dowCheck === 6);

        var kandydaciDnia = [];

        // 1. Sprawdź czy to sobota i ministrant ma mszę niedzielną w wigilię (sobota 17:00)
        if (isSaturday) {
          var nextSunD = d + 1;
          var kNextSun = (nextSunD <= daysInMonth && userRow && userRow.komorki) ? userRow.komorki[nextSunD - 1] : null;
          var godzinaWknd = (godzinyWeekendy[nextSunD] && godzinyWeekendy[nextSunD].godzina) || mojaGodzinaNiedziela;
          if (cleanTime(godzinaWknd) === '17:00' && ((kNextSun && kNextSun.maDyzur) || (k && k.maDyzur))) {
            var oddaneSat = mojeOddaneZastepstwa[d] || mojeOddaneZastepstwa[nextSunD];
            if (!oddaneSat || (oddaneSat.status !== "OCZEKUJE" && oddaneSat.status !== "PRZEJETE" && oddaneSat.status !== "ZREALIZOWANE")) {
              var czySat17JuzByla = (d === currentDay && czyMszaJuzMinaDzisLocal('17:00'));
              var czyNiedzielnaJuzWpisana = (k && k.wartosc !== null && k.wartosc !== undefined && k.wartosc !== "") || (kNextSun && kNextSun.wartosc !== null && kNextSun.wartosc !== undefined && kNextSun.wartosc !== "");
              if (!czySat17JuzByla && !czyNiedzielnaJuzWpisana) {
                kandydaciDnia.push({
                  jest: true,
                  dzien: d,
                  tekst: (d === currentDay ? 'DZIŚ • ' : (d === currentDay + 1 ? 'JUTRO • ' : '')) + d + ' ' + currentMonthNameGenitive + ' (Sb)',
                  typ: 'Msza niedzielna (sobota 17:00)',
                  godzina: '17:00'
                });
              }
            }
          }
        }

        // 2. Czy ma przejęte zastępstwo w tym dniu
        if (mojePrzejeteZastepstwa[d] && mojePrzejeteZastepstwa[d].status === "PRZEJETE") {
          var prz = mojePrzejeteZastepstwa[d];
          var godzPrz = prz.godzina || '18:00';
          if (!(d === currentDay && czyMszaJuzMinaDzisLocal(godzPrz))) {
            kandydaciDnia.push({
              jest: true,
              dzien: d,
              tekst: (d === currentDay ? 'DZIŚ • ' : (d === currentDay + 1 ? 'JUTRO • ' : '')) + d + ' ' + currentMonthNameGenitive + (skrot ? ' (' + skrot + ')' : ''),
              typ: 'Zastępstwo (+4 pkt) za: ' + prz.oddajacy,
              godzina: godzPrz
            });
          }
        }

        // 3. Czy ma własny dyżur i czy nie jest oddany na giełdę
        if (k && k.maDyzur && !isSaturday) {
          var oddane = mojeOddaneZastepstwa[d];
          if (!oddane || (oddane.status !== "OCZEKUJE" && oddane.status !== "PRZEJETE" && oddane.status !== "ZREALIZOWANE")) {
            var godzinaSluzby = isSunday ? ((godzinyWeekendy[d] && godzinyWeekendy[d].godzina) || mojaGodzinaNiedziela) : '18:00';
            if (!(isSunday && cleanTime(godzinaSluzby) === '17:00')) {
              if (!(d === currentDay && (czyMszaJuzMinaDzisLocal(godzinaSluzby) || (k.wartosc !== null && k.wartosc !== undefined && k.wartosc !== "")))) {
                kandydaciDnia.push({
                  jest: true,
                  dzien: d,
                  tekst: (d === currentDay ? 'DZIŚ • ' : (d === currentDay + 1 ? 'JUTRO • ' : '')) + d + ' ' + currentMonthNameGenitive + (skrot ? ' (' + skrot + ')' : ''),
                  typ: isSunday ? 'Msza niedzielna' : 'Służba w tygodniu',
                  godzina: godzinaSluzby
                });
              }
            }
          }
        }

        if (kandydaciDnia.length > 0) {
          kandydaciDnia.sort(function(a, b) {
            return (a.godzina || '').localeCompare(b.godzina || '');
          });
          najblizszaSluzba = kandydaciDnia[0];
          break;
        }
      }

      // 5b. Dyżury w kolejnym miesiącu (gdy zbliża się przełom miesięcy lub brak dalszych służb)
      var dyzuryKolejnegoMiesiaca = [];
      var isSameMonthAsCurrent = daneKolejnegoMiesiaca && (
        (typeof czyToTenSamKluczMiesiaca === 'function' && czyToTenSamKluczMiesiaca(daneKolejnegoMiesiaca.docId, pobierzAktywnyKluczMiesiaca())) ||
        (daneKolejnegoMiesiaca.miesiacIdx === currentMonthIdx && daneKolejnegoMiesiaca.rok === currentYear)
      );
      if (daneKolejnegoMiesiaca && daneKolejnegoMiesiaca.wiersze && !isSameMonthAsCurrent) {
        var nextRows = daneKolejnegoMiesiaca.wiersze || [];
        var nextUserRow = nextRows.find(function(w) {
          var nw = (w.nazwisko || "").trim().toLowerCase();
          return nw && (nw === nLower || nw.indexOf(nLower) !== -1 || nLower.indexOf(nw) !== -1);
        });
        if (nextUserRow && nextUserRow.komorki) {
          var nextYear = daneKolejnegoMiesiaca.rok || (currentMonthIdx === 11 ? currentYear + 1 : currentYear);
          var nextMonthIdx = (daneKolejnegoMiesiaca.miesiacIdx !== undefined) ? daneKolejnegoMiesiaca.miesiacIdx : (currentMonthIdx + 1) % 12;
          var nextDaysInMonth = (daneKolejnegoMiesiaca.dniNaglowek && daneKolejnegoMiesiaca.dniNaglowek.length) || new Date(nextYear, nextMonthIdx + 1, 0).getDate();
          var nextMonthNameGen = polishMonthsGenitive[nextMonthIdx] || "kolejnego miesiąca";
          var nextGrupa = (nextUserRow.grupa || userGrupa || "").toUpperCase();
          var rotNext = wyznaczRotowaneGodzinyGrup(nextYear, nextMonthIdx);
          var nextGodzinaWknd = "10:00";
          for (var rk in rotNext) {
            if (nextGrupa.indexOf(rk.toUpperCase()) !== -1 || rk.toUpperCase().indexOf(nextGrupa) !== -1 || dopasujGrupe(rk, nextGrupa)) {
              nextGodzinaWknd = rotNext[rk];
              break;
            }
          }

          var nextDocKey = wyznaczKluczMiesiaca(new Date(nextYear, nextMonthIdx, 1));
          for (var nd = 1; nd <= nextDaysInMonth; nd++) {
            var nk = nextUserRow.komorki[nd - 1];
            if (nk && nk.maDyzur) {
              var ndt = new Date(nextYear, nextMonthIdx, nd);
              var ndow = ndt.getDay(); // 0: Sun, 1..5: Mon..Fri, 6: Sat
              var isNextSun = (ndow === 0);
              var nNagl = (daneKolejnegoMiesiaca.dniNaglowek && daneKolejnegoMiesiaca.dniNaglowek[nd - 1]) ? daneKolejnegoMiesiaca.dniNaglowek[nd - 1] : null;
              var nSkrot = nNagl ? nNagl.skrotDnia : '';

              var actualDay = nd;
              var gVal = '';
              var typStr = '';

              if (isNextSun) {
                var gNext = cleanTime(nextGodzinaWknd);
                if (gNext === '17:00') {
                  // Msza weekendowa w sobotę o 17:00!
                  actualDay = nd - 1;
                }
                gVal = gNext;
                typStr = 'Msza niedzielna';
              } else if (ndow >= 1 && ndow <= 5) {
                gVal = pobierzGodzineDlaDniaTygodnia(nextYear, nextMonthIdx, nd);
                typStr = 'Służba w tygodniu';
              } else {
                continue;
              }

              var dName = pobierzDzienTygodnia(nextYear, nextMonthIdx, actualDay);

              // Sprawdź czy użytkownik oddał ten dyżur na giełdę wolnych lub zgłosił nieobecność (0 pkt)
              var nextOddane = (daneKolejnegoMiesiaca.wolneZastepstwa || []).find(function(z) {
                return (parseInt(z.dzien, 10) === actualDay || parseInt(z.dzien, 10) === nd) && czyToSamoNazwisko(z.oddajacy, nLower);
              });
              var czyUsprawiedliwionyNext = (nk.wartosc === 0 || nk.wartosc === '0');
              if (isNextSun && actualDay !== nd && nextUserRow.komorki[actualDay - 1]) {
                if (nextUserRow.komorki[actualDay - 1].wartosc === 0 || nextUserRow.komorki[actualDay - 1].wartosc === '0') {
                  czyUsprawiedliwionyNext = true;
                }
              }

              dyzuryKolejnegoMiesiaca.push({
                dzien: actualDay,
                dzienTabeli: nd,
                godzina: gVal,
                typ: typStr,
                skrotDnia: dName,
                dzienTygodnia: dName,
                nazwaMiesiacaGen: nextMonthNameGen,
                rok: nextYear,
                miesiacIdx: nextMonthIdx,
                kolejnyMiesiac: true,
                docKey: nextDocKey,
                oddane: nextOddane || null,
                czyUsprawiedliwiony: czyUsprawiedliwionyNext
              });
            }
          }
          dyzuryKolejnegoMiesiaca.sort(function(a, b) { return a.dzien - b.dzien; });
        }
      }

      if (!najblizszaSluzba.jest && dyzuryKolejnegoMiesiaca.length > 0) {
        var firstValidNext = dyzuryKolejnegoMiesiaca.find(function(d) {
          return !d.czyUsprawiedliwiony && (!d.oddane || (d.oddane.status !== 'OCZEKUJE' && d.oddane.status !== 'PRZEJETE'));
        }) || dyzuryKolejnegoMiesiaca[0];
        var dName = firstValidNext.dzienTygodnia || pobierzDzienTygodnia(firstValidNext.rok, firstValidNext.miesiacIdx, firstValidNext.dzien);
        najblizszaSluzba = {
          jest: true,
          dzien: firstValidNext.dzien,
          tekst: firstValidNext.dzien + ' ' + firstValidNext.nazwaMiesiacaGen + (dName ? ' (' + dName + ')' : ''),
          typ: firstValidNext.typ,
          godzina: firstValidNext.godzina,
          kolejnyMiesiac: true
        };
      }

      // 6. Rankingi i punkty (ZAWSZE dynamicznie wyliczane bezpośrednio z wierszy obecności w tabeli)
      var rankingMiesiac = [];
      if (wiersze && wiersze.length > 0) {
        rankingMiesiac = wiersze.filter(function(w) {
          if (!w || !w.nazwisko) return false;
          var n = w.nazwisko.toLowerCase().trim();
          return n !== 'kościelny' && n !== 'koscielny' && n.indexOf('pokojsk') === -1;
        }).map(function(w) {
          var p = (w.suma !== undefined && w.suma !== null) ? w.suma : 0;
          return {
            nazwisko: w.nazwisko,
            punkty: p,
            suma: p,
            grupa: w.grupa
          };
        }).sort(function(a, b) {
          if (b.punkty !== a.punkty) return b.punkty - a.punkty;
          return a.nazwisko.localeCompare(b.nazwisko, 'pl');
        });

        var pozM = 1;
        rankingMiesiac.forEach(function(r, idx) {
          if (idx > 0 && r.punkty < rankingMiesiac[idx - 1].punkty) pozM = idx + 1;
          r.pozycja = pozM;
          r.miejsce = pozM;
        });
      } else {
        var rawMiesiac = (docData.rankingMiesiac && docData.rankingMiesiac.length)
          ? docData.rankingMiesiac
          : ((docData.ranking && docData.ranking.length)
              ? docData.ranking
              : ((tabelaMiesiacaDane && tabelaMiesiacaDane.rankingMiesiac && tabelaMiesiacaDane.rankingMiesiac.length)
                  ? tabelaMiesiacaDane.rankingMiesiac
                  : []));

        rankingMiesiac = rawMiesiac.filter(function(r) {
          if (!r || !r.nazwisko) return false;
          var n = r.nazwisko.toLowerCase().trim();
          return n !== 'kościelny' && n !== 'koscielny' && n.indexOf('pokojsk') === -1;
        }).map(function(r, idx) {
          var p = (r.punkty !== undefined && r.punkty !== null) ? r.punkty : ((r.suma !== undefined && r.suma !== null) ? r.suma : 0);
          var poz = (r.pozycja !== undefined && r.pozycja !== null) ? r.pozycja : ((r.miejsce !== undefined && r.miejsce !== null) ? r.miejsce : (idx + 1));
          return {
            nazwisko: r.nazwisko,
            punkty: p,
            suma: p,
            pozycja: poz,
            miejsce: poz,
            grupa: r.grupa
          };
        });
      }

      // Synchronizacja obiektu docData oraz tabelaMiesiacaDane z aktualnym rankingiem
      if (docData) {
        docData.rankingMiesiac = rankingMiesiac;
        docData.ranking = rankingMiesiac;
      }
      if (typeof tabelaMiesiacaDane !== 'undefined' && tabelaMiesiacaDane) {
        tabelaMiesiacaDane.rankingMiesiac = rankingMiesiac;
        tabelaMiesiacaDane.ranking = rankingMiesiac;
      }

      var rawRok = (docData.rankingRok && docData.rankingRok.length)
        ? docData.rankingRok
        : ((tabelaMiesiacaDane && tabelaMiesiacaDane.rankingRok && tabelaMiesiacaDane.rankingRok.length)
            ? tabelaMiesiacaDane.rankingRok
            : null);

      var rankingRok = (rawRok || rankingMiesiac).filter(function(r) {
        if (!r || !r.nazwisko) return false;
        var n = r.nazwisko.toLowerCase().trim();
        return n !== 'kościelny' && n !== 'koscielny';
      }).map(function(r) {
        var rNorm = r.nazwisko.toLowerCase().trim();
        var matchW = wiersze.find(function(w) {
          var nw = (w.nazwisko || '').toLowerCase().trim();
          return nw === rNorm || nw.indexOf(rNorm) !== -1 || rNorm.indexOf(nw) !== -1;
        });
        var biezacePunkty = matchW ? (matchW.suma || 0) : 0;
        
        var sumaPoprzednich = 0;
        var foundCur = false;
        var pmList = (r.punktyPoMiesiacach && Array.isArray(r.punktyPoMiesiacach)) ? r.punktyPoMiesiacach.slice() : [];
        var matchRM = rankingMiesiac.find(function(rm) { return czyToSamoNazwisko(rm.nazwisko, r.nazwisko); });
        var pozMies = (matchRM && (matchRM.pozycja || matchRM.miejsce)) ? (matchRM.pozycja || matchRM.miejsce) : undefined;
        for (var pi = 0; pi < pmList.length; pi++) {
          var pItem = pmList[pi];
          var isCurM = (pItem.miesiacIdx === currentMonthIdx || (pItem.miesiac && pItem.miesiac.toLowerCase() === currentMonthName.toLowerCase()));
          if (isCurM) {
            pItem.punkty = biezacePunkty;
            if (pozMies !== undefined) pItem.pozycja = pozMies;
            foundCur = true;
          } else {
            sumaPoprzednich += (pItem.punkty || 0);
          }
        }
        if (!foundCur && pmList.length > 0) {
          pmList.push({
            miesiacIdx: currentMonthIdx,
            miesiac: currentMonthName,
            rok: currentYear,
            punkty: biezacePunkty,
            pozycja: pozMies
          });
        }
        var totalRok = (pmList.length > 0) ? (sumaPoprzednich + biezacePunkty) : ((r.punkty !== undefined ? r.punkty : (r.suma || 0)));
        totalRok = Math.round(totalRok * 10) / 10;

        return {
          nazwisko: r.nazwisko,
          punkty: totalRok,
          suma: totalRok,
          grupa: r.grupa,
          punktyPoMiesiacach: pmList
        };
      });

      rankingRok.sort(function(a, b) { return b.punkty - a.punkty; });
      var pozRk = 1;
      rankingRok.forEach(function(r, idx) {
        if (idx > 0 && r.punkty < rankingRok[idx - 1].punkty) pozRk = idx + 1;
        r.pozycja = pozRk;
        r.miejsce = pozRk;
      });

      var rawMinusyRok = (docData.rankingMinusyRok && docData.rankingMinusyRok.length)
        ? docData.rankingMinusyRok
        : ((docData.rankingMinusy && docData.rankingMinusy.length) ? docData.rankingMinusy : []);

      var rankingMinusyRok = rawMinusyRok.filter(function(r) {
        if (!r || !r.nazwisko) return false;
        var n = r.nazwisko.toLowerCase().trim();
        return n !== 'kościelny' && n !== 'koscielny';
      });

      var rawMinusyMiesiac = (docData.rankingMinusyMiesiac && docData.rankingMinusyMiesiac.length)
        ? docData.rankingMinusyMiesiac
        : [];

      var rankingMinusyMiesiac = rawMinusyMiesiac.filter(function(r) {
        if (!r || !r.nazwisko) return false;
        var n = r.nazwisko.toLowerCase().trim();
        return n !== 'kościelny' && n !== 'koscielny';
      });

      var rankingMinusy = rankingMinusyRok.length ? rankingMinusyRok : rankingMinusyMiesiac;

      var punktyMiesiac = userRow ? (userRow.suma || 0) : 0;
      var pozycjaMiesiac = 0;
      var punktyRok = punktyMiesiac;
      var pozycjaRok = 0;
      var punktyMinus = 0;
      var pozycjaMinus = 0;

      var matchUserRM = rankingMiesiac.find(function(rm) { return czyToSamoNazwisko(rm.nazwisko, nClean); });
      if (matchUserRM) {
        pozycjaMiesiac = matchUserRM.pozycja || matchUserRM.miejsce || 0;
      }

      var matchUserRY = rankingRok.find(function(ry) { return czyToSamoNazwisko(ry.nazwisko, nClean); });
      if (matchUserRY) {
        punktyRok = matchUserRY.punkty !== undefined ? matchUserRY.punkty : punktyMiesiac;
        pozycjaRok = matchUserRY.pozycja || matchUserRY.miejsce || 0;
      }

      var szczegolyMinusow = [];
      var szczegolyMinusowMiesiac = [];

      for (var rmn = 0; rmn < rankingMinusyRok.length; rmn++) {
        var rmnName = (rankingMinusyRok[rmn].nazwisko || "").trim().toLowerCase();
        if (rmnName && (rmnName === nLower || rmnName.indexOf(nLower) !== -1 || nLower.indexOf(rmnName) !== -1)) {
          punktyMinus = rankingMinusyRok[rmn].minusy !== undefined ? rankingMinusyRok[rmn].minusy : 0;
          pozycjaMinus = rankingMinusyRok[rmn].pozycja || (rmn + 1);
          if (rankingMinusyRok[rmn].szczegolyMinusow && Array.isArray(rankingMinusyRok[rmn].szczegolyMinusow)) {
            szczegolyMinusow = rankingMinusyRok[rmn].szczegolyMinusow.slice();
          }
          break;
        }
      }

      for (var rmm = 0; rmm < rankingMinusyMiesiac.length; rmm++) {
        var rmmName = (rankingMinusyMiesiac[rmm].nazwisko || "").trim().toLowerCase();
        if (rmmName && (rmmName === nLower || rmmName.indexOf(nLower) !== -1 || nLower.indexOf(rmmName) !== -1)) {
          if (rankingMinusyMiesiac[rmm].szczegolyMinusow && Array.isArray(rankingMinusyMiesiac[rmm].szczegolyMinusow)) {
            szczegolyMinusowMiesiac = rankingMinusyMiesiac[rmm].szczegolyMinusow.slice();
          }
          break;
        }
      }

      if (szczegolyMinusow.length === 0 && userRow && userRow.komorki) {
        var dniNazwyMinus = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];
        var polishMonthsGenMinus = [
          "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
          "lipca", "sierpnia", "września", "października", "listopada", "grudnia"
        ];
        var mGenMinus = polishMonthsGenMinus[currentMonthIdx] || docData.nazwaMiesiaca || polishMonthsGenMinus[(new Date()).getMonth()];
        userRow.komorki.forEach(function(k) {
          if (typeof k.wartosc === "number" && k.wartosc < 0) {
            var dtM = new Date(currentYear, currentMonthIdx, k.dzien);
            szczegolyMinusow.push({
              dzien: k.dzien,
              miesiac: docData.nazwaMiesiaca || currentMonthName,
              miesiacGen: mGenMinus,
              rok: currentYear,
              dzienTygodnia: dniNazwyMinus[dtM.getDay()],
              punkty: k.wartosc
            });
          }
        });
      }

      // 7. Wolne zastępstwa z flagą czyMoje (pomijamy te, które już minęły dzisiaj lub w przeszłości)
      var wolneZastepstwaSrc = (docData.wolneZastepstwa && docData.wolneZastepstwa.length)
        ? docData.wolneZastepstwa
        : ((tabelaMiesiacaDane && tabelaMiesiacaDane.wolneZastepstwa) ? tabelaMiesiacaDane.wolneZastepstwa : []);
      var wolneZastepstwa = wolneZastepstwaSrc.filter(function(z) {
        if (!z || !z.dzien) return false;
        if (z.typ && z.typ !== 'Tydzień') return false; // Niedziele i weekendy NIGDY nie trafiają na giełdę wolnych zastępstw!
        if (z.dzien < currentDay) return false;
        if (z.dzien === currentDay && czyMszaJuzMinaDzisLocal(z.godzina)) return false;
        return true;
      }).map(function(z) {
        var zOdd = (z.oddajacy || "").trim().toLowerCase();
        var isMine = !!(zOdd && (zOdd === nLower || zOdd.indexOf(nLower) !== -1 || nLower.indexOf(zOdd) !== -1));
        return Object.assign({}, z, { czyMoje: isMine });
      });

      return {
        sukces: true,
        nazwisko: nazwisko,
        rok: currentYear,
        miesiacIdx: currentMonthIdx,
        dzisDzien: currentDay,
        nazwaMiesiaca: currentMonthNameGenitive,
        daysInMonth: daysInMonth,
        dniSwiateczne: [],
        mojeDyzuryTydzien: mojeDyzuryTydzien,
        mojaGodzinaNiedziela: mojaGodzinaNiedziela,
        godzinyWeekendy: godzinyWeekendy,
        gieldaTydzien: (docData.gieldaTydzien || (tabelaMiesiacaDane && tabelaMiesiacaDane.gieldaTydzien) || []).filter(function(o) {
          if (!o || o.status === 'ANULOWANA' || o.status === 'ZAAKCEPTOWANA' || o.status === 'PRZEKSZTALCONA_NA_WOLNY' || (o.status && o.status.indexOf('WYGASLA') !== -1)) return false;
          var dO = o.dzienOddawany !== undefined ? o.dzienOddawany : o.dzien;
          if (dO < currentDay) return false;
          var gO = o.godzina || pobierzGodzineDlaDniaTygodnia(currentYear, currentMonthIdx, dO);
          if (czyMszaJuzSieRozpoczela(dO, gO, currentYear, currentMonthIdx)) return false;
          return true;
        }),
        gieldaNiedziele: (docData.gieldaNiedziele || (tabelaMiesiacaDane && tabelaMiesiacaDane.gieldaNiedziele) || []).filter(function(o) {
          if (!o || o.status === 'ANULOWANA' || o.status === 'ZAAKCEPTOWANA' || (o.status && o.status.indexOf('WYGASLA') !== -1)) return false;
          if (o.dzien < currentDay) return false;
          var gO = o.godzinaOddawana || o.godzina || '10:00';
          if (czyMszaJuzSieRozpoczela(o.dzien, gO, currentYear, currentMonthIdx)) return false;
          return true;
        }),
        liturgieDodatkowe: (function() {
          var cL = docData.liturgieDodatkowe || (tabelaMiesiacaDane && tabelaMiesiacaDane.liturgieDodatkowe) || [];
          var nL = (daneKolejnegoMiesiaca && daneKolejnegoMiesiaca.liturgieDodatkowe) || [];
          var comb = cL.slice();
          nL.forEach(function(item) {
            if (!comb.some(function(ci) { return ci.id === item.id; })) comb.push(item);
          });
          return comb;
        })(),
        wolneZastepstwa: wolneZastepstwa,
        mojeOddaneZastepstwa: mojeOddaneZastepstwa,
        mojePrzejeteZastepstwa: mojePrzejeteZastepstwa,
        punktyMiesiac: punktyMiesiac,
        pozycjaMiesiac: pozycjaMiesiac,
        punktyOdPoczatkuRoku: punktyRok,
        pozycjaRok: pozycjaRok,
        punktyMinusoweSuma: punktyMinus,
        pozycjaMinusy: pozycjaMinus,
        szczegolyMinusow: szczegolyMinusow,
        szczegolyMinusowRok: szczegolyMinusow,
        szczegolyMinusowMiesiac: szczegolyMinusowMiesiac,
        rankingMiesiac: rankingMiesiac,
        rankingRok: rankingRok,
        rankingMinusy: rankingMinusy,
        rankingMinusyRok: rankingMinusyRok,
        rankingMinusyMiesiac: rankingMinusyMiesiac,
        najblizszaSluzba: najblizszaSluzba,
        dyzuryKolejnegoMiesiaca: dyzuryKolejnegoMiesiaca
      };
    }

    function uruchomNasluchiwanieFirestore() {
      if (!dbFirestore) return;
      try {
        var mDocId = pobierzAktywnyKluczMiesiaca();
        dbFirestore.collection('stan_grafiku').doc(mDocId).onSnapshot(function(doc) {
          if (doc.exists && doc.data()) {
            tabelaMiesiacaDane = doc.data();
            try { localStorage.setItem('min_cached_tabela', JSON.stringify(tabelaMiesiacaDane)); } catch(e) {}
            autoRozliczWygasleOfertyFirestore(doc.data());

            var widokTabeli = document.getElementById('widok-tabela-miesiaca');
            if (widokTabeli && widokTabeli.style.display !== 'none') {
              if (wybranyMiesiacTabeli === mDocId) {
                tabelaPrzegladanyMiesiacDane = tabelaMiesiacaDane;
                renderujFiltryTabeli();
                renderujTabeleMiesiaca();
              }
            }
            var widokZakrystii = document.getElementById('widok-tryb-zakrystia');
            if (widokZakrystii && widokZakrystii.style.display !== 'none') {
              // Nigdy nie resetuj sprawdzanego dnia i godziny przy aktualizacji w tle!
              if (zakrystiaStan && zakrystiaStan.dzien && zakrystiaStan.godzina) {
                wczytajDaneDlaZakrystii(zakrystiaStan.dzien, zakrystiaStan.godzina, true);
              } else {
                wczytajDaneDlaZakrystii();
              }
            }
            if (globalUser && globalUser.nazwisko) {
              var stan = generujStanZFirestore(globalUser.nazwisko, doc.data());
              if (stan) renderujDane(stan);
            }
            var modalRanking = document.getElementById('modal-ranking');
            if (modalRanking && modalRanking.style.display === 'flex') {
              przelaczTabRankingu(aktywnyTabRankingu || 'miesiac');
            }
          }
        }, function(err) {
          console.warn('Firestore onSnapshot info:', err);
        });
      } catch(e) {
        console.warn('Błąd nasłuchiwania Firestore:', e);
      }
    }

function czyMaDostepDoZakrystii(nazwisko) {
      window.czyMaDostepDoZakrystii = czyMaDostepDoZakrystii;
      if (!nazwisko) return false;
      var n = nazwisko.toLowerCase().trim();
      // Mikołaj i Maks NIE są animatorami i nie mają wstępu do zakrystii
      if (n.indexOf('mikołaj') !== -1 || n.indexOf('mikolaj') !== -1) return false;
      if (n.indexOf('maks') !== -1) return false;
      // Dostęp mają wyłącznie Kościelny oraz Maciej Erich
      if (n.indexOf('kościelny') !== -1 || n.indexOf('koscielny') !== -1) return true;
      if (n.indexOf('maciej') !== -1) return true;
      if (n === 'erich' || n === 'eryk') return true;
      return false;
    }

    function sprawdzUprawnieniaZakrystii() {
      var maDostep = czyMaDostepDoZakrystii(globalUser ? globalUser.nazwisko : '');
      var btnTop = document.getElementById('btn-top-zakrystia');
      if (btnTop) btnTop.style.display = maDostep ? 'inline-block' : 'none';
      var karta = document.getElementById('karta-tryb-zakrystia');
      if (karta) karta.style.display = maDostep ? 'block' : 'none';
    }

    function otworzTrybZakrystia(wybranyDzien, wybranaGodzina, optDocKey, optOverrideRodzaj, optOverridePkt, optOverrideNazwa) {
      if (!czyMaDostepDoZakrystii(globalUser ? globalUser.nazwisko : '')) {
        pokazToast('Brak uprawnień. Tryb Zakrystia jest dostępny tylko dla Kościelnego i animatorów.');
        return;
      }
      document.getElementById('auth-panel').style.display = 'none';
      document.getElementById('app-panel').style.display = 'block';
      pokazWidok('zakrystia');
      window.scrollTo({ top: 0, behavior: 'smooth' });

      try { aktualizujPigulkiZakrystiaLiturgia(); } catch(ePl) {}
      wczytajDaneDlaZakrystii(wybranyDzien, wybranaGodzina, true, optDocKey, optOverrideRodzaj, optOverridePkt, optOverrideNazwa);
    }

    function zamknijTrybZakrystia() {
      if (globalUser && globalUser.nazwisko) {
        document.getElementById('app-panel').style.display = 'block';
        pokazWidok('pulpit');
      } else {
        document.getElementById('app-panel').style.display = 'none';
        document.getElementById('auth-panel').style.display = 'block';
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function cleanTime(t) {
      if (!t) return '';
      var str = t.toString().trim();
      if (str.indexOf('19:24') !== -1) return '10:00';
      if (str.indexOf('20:24') !== -1) return '11:00';
      str = str.replace(/:24$/, ':00').replace(/:54$/, ':30');
      var match = str.match(/(?:^|\s)(\d{1,2}):(\d{2})/);
      if (match) {
        var h = parseInt(match[1], 10);
        var m = match[2];
        return (h < 10 ? '0' : '') + h + ':' + m;
      }
      return str;
    }

    function czyLiturgiaJuzMinela(dzien, godzina, dzisDzien, optRok, optMiesiacIdx) {
      var d = parseInt(dzien, 10);
      if (isNaN(d)) return false;
      var now = new Date();
      var r = optRok || now.getFullYear();
      var m = (optMiesiacIdx !== undefined && optMiesiacIdx !== null) ? optMiesiacIdx : now.getMonth();

      var gClean = cleanTime(godzina) || '11:00';
      var parts = gClean.split(':');
      var litH = parseInt(parts[0], 10);
      var litM = parseInt(parts[1], 10);
      if (isNaN(litH)) litH = 11;
      if (isNaN(litM)) litM = 0;

      var litTime = new Date(r, m, d, litH, litM);
      return now.getTime() > litTime.getTime();
    }

    function wyznaczRotowaneGodzinyGrup(rok, miesiacIdx) {
      var godzinyKolejnosc = ["08:30", "10:00", "11:30", "17:00"];
      // Baza: Wrzesień 2026 (rok = 2026, miesiacIdx = 8)
      // IV GRUPA (ŻÓŁTA) -> 08:30 (idx 0)
      // I GRUPA (CZERWONA) -> 10:00 (idx 1)
      // II GRUPA (POMARAŃCZOWA) -> 11:30 (idx 2)
      // III GRUPA (ZIELONA) -> 17:00 (idx 3)
      var r = (rok !== undefined && rok !== null) ? parseInt(rok, 10) : (new Date()).getFullYear();
      var m = (miesiacIdx !== undefined && miesiacIdx !== null) ? parseInt(miesiacIdx, 10) : (new Date()).getMonth();
      var diffMiesiace = (r - 2026) * 12 + (m - 8);
      var shift = ((diffMiesiace % 4) + 4) % 4;

      return {
        "I GRUPA (CZERWONA)": godzinyKolejnosc[(1 + shift) % 4],
        "II GRUPA (POMARAŃCZOWA)": godzinyKolejnosc[(2 + shift) % 4],
        "III GRUPA (ZIELONA)": godzinyKolejnosc[(3 + shift) % 4],
        "IV GRUPA (ŻÓŁTA)": godzinyKolejnosc[(0 + shift) % 4]
      };
    }

    function rozpoznajNumerGrupy(nazwa) {
      if (!nazwa) return 0;
      var s = nazwa.toLowerCase();
      if (s.indexOf("czerwon") !== -1) return 1;
      if (s.indexOf("pomarańcz") !== -1 || s.indexOf("pomarancz") !== -1) return 2;
      if (s.indexOf("zielon") !== -1) return 3;
      if (s.indexOf("żółt") !== -1 || s.indexOf("zolt") !== -1) return 4;
      if (/(?:^|[\s(\[])(?:iv|4)(?:[\s)\]]|$)/i.test(s)) return 4;
      if (/(?:^|[\s(\[])(?:iii|3)(?:[\s)\]]|$)/i.test(s)) return 3;
      if (/(?:^|[\s(\[])(?:ii|2)(?:[\s)\]]|$)/i.test(s)) return 2;
      if (/(?:^|[\s(\[])(?:i|1)(?:[\s)\]]|$)/i.test(s)) return 1;
      return 0;
    }

    function dopasujGrupe(nazwa1, nazwa2) {
      if (!nazwa1 || !nazwa2) return false;
      var g1 = rozpoznajNumerGrupy(nazwa1);
      var g2 = rozpoznajNumerGrupy(nazwa2);
      if (g1 > 0 && g2 > 0) return g1 === g2;
      return nazwa1.toLowerCase().trim() === nazwa2.toLowerCase().trim();
    }

    function czyToSamoNazwisko(n1, n2) {
      if (!n1 || !n2) return false;
      var s1 = n1.toLowerCase().trim().replace(/ł/g, 'l').replace(/ą/g, 'a').replace(/ę/g, 'e').replace(/ś/g, 's').replace(/ć/g, 'c').replace(/ż/g, 'z').replace(/ź/g, 'z').replace(/ń/g, 'n').replace(/ó/g, 'o');
      var s2 = n2.toLowerCase().trim().replace(/ł/g, 'l').replace(/ą/g, 'a').replace(/ę/g, 'e').replace(/ś/g, 's').replace(/ć/g, 'c').replace(/ż/g, 'z').replace(/ź/g, 'z').replace(/ń/g, 'n').replace(/ó/g, 'o');
      if (s1 === s2) return true;
      if (s1.length >= 4 && s2.indexOf(s1) !== -1) return true;
      if (s2.length >= 4 && s1.indexOf(s2) !== -1) return true;
      return false;
    }

    function czyJestCzytajacym(nazwisko) {
      if (!nazwisko) return false;
      var n = nazwisko.toLowerCase().trim();
      return n.indexOf('maciej erich') !== -1 || n.indexOf('maciej erlich') !== -1 ||
             n.indexOf('maks erich') !== -1 || n.indexOf('maks erlich') !== -1 ||
             n.indexOf('maksymilian erich') !== -1 || n.indexOf('maksymilian erlich') !== -1 ||
             n.indexOf('michał kupiec') !== -1 || n.indexOf('michal kupiec') !== -1 ||
             n.indexOf('michał danielczok') !== -1 || n.indexOf('michal danielczok') !== -1 ||
             n.indexOf('mikołaj erich') !== -1 || n.indexOf('mikolaj erich') !== -1 || n.indexOf('mikołaj erlich') !== -1 || n.indexOf('mikolaj erlich') !== -1 ||
             n.indexOf('emil czech') !== -1;
    }
    var czyJestLektorem = czyJestCzytajacym;

    function wyznaczGodzineWeekendowaDlaGrupy(grupaNazwa, nazwisko, rok, mIdx, docData) {
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
      }
      var r = (rok !== undefined && rok !== null) ? parseInt(rok, 10) : (dData.rok || (new Date()).getFullYear());
      var m = (mIdx !== undefined && mIdx !== null) ? parseInt(mIdx, 10) : ((dData.miesiacIdx !== undefined) ? dData.miesiacIdx : (new Date()).getMonth());
      var rot = wyznaczRotowaneGodzinyGrup(r, m);
      for (var rk in rot) {
        if (g.indexOf(rk.toUpperCase()) !== -1 || rk.toUpperCase().indexOf(g) !== -1 || dopasujGrupe(rk, g)) {
          return rot[rk];
        }
      }
      return '10:00';
    }

    function wyznaczEfektywnaGodzineWeekendowaDlaMinistranta(w, dNum, dow, docData) {
      if (!w) return { godzina: '10:00', zamiana: false, partner: null, oryginalnaGodzina: '10:00' };
      var nazwisko = (typeof w === 'string') ? w : (w.nazwisko || '');
      var grupa = (typeof w === 'object' && w) ? (w.grupa || '') : '';
      var dData = docData || tabelaMiesiacaDane || {};
      var bazaGodz = wyznaczGodzineWeekendowaDlaGrupy(grupa, nazwisko, dData.rok, dData.miesiacIdx, dData);

      var zamianyWknd = dData.zamianyNiedziele || (tabelaMiesiacaDane && tabelaMiesiacaDane.zamianyNiedziele) || [];
      var weekendSunDay = (dow === 6 ? dNum + 1 : dNum);

      // 1. Ręczne przeniesienie ustawione przez zakrystię (typ: 'RECZNA') — ma pierwszeństwo, najnowsze wygrywa
      for (var ri = zamianyWknd.length - 1; ri >= 0; ri--) {
        var zr = zamianyWknd[ri];
        if (!zr || zr.typ !== 'RECZNA' || zr.status === 'ANULOWANA') continue;
        if (zr.dzien !== weekendSunDay) continue;
        if (!czyToSamoNazwisko(zr.ministrant, nazwisko)) continue;
        return {
          godzina: cleanTime(zr.godzina),
          zamiana: true,
          reczna: true,
          partner: 'Zakrystia',
          opis: 'Przeniesiony przez zakrystię (z ' + cleanTime(zr.godzinaPoprzednia || bazaGodz) + ')',
          oryginalnaGodzina: cleanTime(zr.godzinaPoprzednia || bazaGodz)
        };
      }

      // 2. Zamiany 1:1 z giełdy
      for (var zi = 0; zi < zamianyWknd.length; zi++) {
        var zn = zamianyWknd[zi];
        if (!zn || zn.status === 'ANULOWANA' || zn.typ === 'RECZNA') continue;
        var matchDay = (zn.dzien === weekendSunDay || zn.dzien === dNum);
        if (!matchDay) continue;

        if (czyToSamoNazwisko(zn.wystawiajacy, nazwisko)) {
          return {
            godzina: cleanTime(zn.godzinaPrzejmujacego),
            zamiana: true,
            partner: zn.przejmujacy,
            opis: 'Zamiana z: ' + zn.przejmujacy,
            oryginalnaGodzina: cleanTime(zn.godzinaWystawiajacego || bazaGodz)
          };
        } else if (czyToSamoNazwisko(zn.przejmujacy, nazwisko)) {
          return {
            godzina: cleanTime(zn.godzinaWystawiajacego),
            zamiana: true,
            partner: zn.wystawiajacy,
            opis: 'Zamiana z: ' + zn.wystawiajacy,
            oryginalnaGodzina: cleanTime(zn.godzinaPrzejmujacego || bazaGodz)
          };
        }
      }

      return {
        godzina: bazaGodz,
        zamiana: false,
        partner: null,
        oryginalnaGodzina: bazaGodz
      };
    }

    function czyMinistrantBylNaSwoimDyzurzeWeekendowym(wiersz, dNum, dow, docData) {
      if (!wiersz || !wiersz.komorki) return false;
      var ef = wyznaczEfektywnaGodzineWeekendowaDlaMinistranta(wiersz, dNum, dow, docData);
      var dutyGodz = cleanTime(ef.godzina);
      var satColIdx = (dow === 6) ? (dNum - 1) : (dNum - 2);
      var sunColIdx = (dow === 6) ? dNum : (dNum - 1);

      if (dutyGodz === '17:00') {
        if (satColIdx >= 0 && satColIdx < wiersz.komorki.length) {
          var cSat = wiersz.komorki[satColIdx];
          if (cSat && cSat.liturgie && typeof cSat.liturgie['17:00'] === 'number' && cSat.liturgie['17:00'] >= 3) {
            return true;
          }
        }
      } else {
        if (sunColIdx >= 0 && sunColIdx < wiersz.komorki.length) {
          var cSun = wiersz.komorki[sunColIdx];
          if (cSun && cSun.liturgie && typeof cSun.liturgie[dutyGodz] === 'number' && cSun.liturgie[dutyGodz] >= 3) {
            return true;
          }
        }
      }
      return false;
    }


    var PROFIL_MINISTRANTOW_BAZA = {
      "maks erich": { stopien: "Animator", ranga: 5 },
      "mateusz pierścieński": { stopien: "Starszy ministrant", ranga: 3 },
      "wiktor kowalski": { stopien: "Starszy ministrant", ranga: 3 },
      "jan radliński": { stopien: "Młodszy ministrant", ranga: 2 },
      "maciej erich": { stopien: "Animator", ranga: 5 },
      "mikołaj erich": { stopien: "Lektor", ranga: 4 },
      "ksawery skrzypek": { stopien: "Starszy ministrant", ranga: 3 },
      "rafał danielczok": { stopien: "Młodszy ministrant", ranga: 2 },
      "michał kupiec": { stopien: "Animator", ranga: 5 },
      "paweł głaz": { stopien: "Starszy ministrant", ranga: 3 },
      "jakub brytner": { stopien: "Młodszy ministrant", ranga: 2 },
      "franek kik": { stopien: "Kandydat", ranga: 1 },
      "michał danielczok": { stopien: "Animator", ranga: 5 },
      "emil czech": { stopien: "Lektor", ranga: 4 },
      "bartosz rozik": { stopien: "Młodszy ministrant", ranga: 2 },
      "marcel mazurkiewicz": { stopien: "Młodszy ministrant", ranga: 2 },
      "mateusz pokojski": { stopien: "Starszy ministrant", ranga: 3 },
      "wojtek pszczółkowski": { stopien: "Młodszy ministrant", ranga: 2 },
      "piotr matuszczyk": { stopien: "Młodszy ministrant", ranga: 2 }
    };

    function wyznaczStopienMinistranta(nazwisko, wiersze) {
      var s = (nazwisko || '').toString().trim();

      // 1. Sprawdź profil z Firestore konfiguracja/uzytkownicy (jeśli wczytany)
      if (typeof listaUzytkownikow !== 'undefined' && Array.isArray(listaUzytkownikow)) {
        var uItem = listaUzytkownikow.find(function(u) { return u && u.nazwisko && czyToSamoNazwisko(u.nazwisko, s); });
        if (uItem && uItem.stopien) {
          return { stopien: uItem.stopien, ranga: uItem.ranga || uItem.stopienRanga || 2 };
        }
      }

      // 2. Sprawdź autorytatywny profil stały parafii
      for (var pKey in PROFIL_MINISTRANTOW_BAZA) {
        if (czyToSamoNazwisko(pKey, s)) {
          return { stopien: PROFIL_MINISTRANTOW_BAZA[pKey].stopien, ranga: PROFIL_MINISTRANTOW_BAZA[pKey].ranga };
        }
      }

      // 3. Fallback: z wierszy tabeli jeśli istnieją
      if (wiersze && wiersze.length) {
        var wRow = wiersze.find(function(w) { return czyToSamoNazwisko(w.nazwisko, s); });
        if (wRow && wRow.stopien) {
          return { stopien: wRow.stopien, ranga: wRow.stopienRanga || 2 };
        }
      }

      // 4. Fallback ogólny
      if (/\b(animator|prezes|ceremoniarz)\b/i.test(s)) return { stopien: "Animator", ranga: 5 };
      if (/\blektor\b/i.test(s)) return { stopien: "Lektor", ranga: 4 };
      if (/\bstarszy\b/i.test(s)) return { stopien: "Starszy ministrant", ranga: 3 };
      if (/\bkandydat\b/i.test(s)) return { stopien: "Kandydat", ranga: 1 };
      return { stopien: "Młodszy ministrant", ranga: 2 };
    }

    function odswiezZakrystie() {
      pokazMiniRefresh(true);
      if (dbFirestore) {
        dbFirestore.collection('stan_grafiku').doc(pobierzAktywnyKluczMiesiaca()).get().then(function(doc) {
          if (doc.exists && doc.data()) {
            tabelaMiesiacaDane = doc.data();
            try { localStorage.setItem('min_cached_tabela', JSON.stringify(tabelaMiesiacaDane)); } catch(e) {}
          }
          wczytajDaneDlaZakrystii(zakrystiaStan ? zakrystiaStan.dzien : null, zakrystiaStan ? zakrystiaStan.godzina : null, true);
          pokazMiniRefresh(false);
          pokazToast('Dane zakrystii zaktualizowane');
        }).catch(function(err) {
          console.warn('Błąd odświeżania zakrystii:', err);
          wczytajDaneDlaZakrystii(zakrystiaStan ? zakrystiaStan.dzien : null, zakrystiaStan ? zakrystiaStan.godzina : null, true);
          pokazMiniRefresh(false);
        });
      } else {
        wczytajDaneDlaZakrystii(zakrystiaStan ? zakrystiaStan.dzien : null, zakrystiaStan ? zakrystiaStan.godzina : null, true);
        pokazMiniRefresh(false);
      }
    }

    window.wczytajDaneDlaZakrystii = wczytajDaneDlaZakrystii;
    window.otworzTrybZakrystia = otworzTrybZakrystia;
    window.zakrystiaUstawStatus = zakrystiaUstawStatus;
    function wczytajDaneDlaZakrystii(wybranyDzien, wybranaGodzina, force, optDocKey, optOverrideRodzaj, optOverridePkt, optOverrideNazwa) {
      var kontener = document.getElementById('zakrystia-lista-kontener');
      var btnZapisz = document.getElementById('btn-zapisz-zakrystia');
      if (btnZapisz) {
        btnZapisz.disabled = true;
        btnZapisz.innerText = '⏳ Wczytywanie mszy...';
        btnZapisz.style.opacity = '0.6';
        btnZapisz.style.cursor = 'not-allowed';
      }

      var nowD = new Date();
      var targetDocKey = optDocKey;
      var dNumParsed = parseInt(wybranyDzien, 10);
      if (!targetDocKey) {
        if (nowD.getDate() >= 20 && !isNaN(dNumParsed) && dNumParsed <= 15) {
          targetDocKey = wyznaczKluczMiesiaca(new Date(nowD.getFullYear(), nowD.getMonth() + 1, 1));
        } else {
          targetDocKey = pobierzAktywnyKluczMiesiaca();
        }
      }
      var isNextMonthZak = (typeof czyToTenSamKluczMiesiaca === 'function') 
        ? !czyToTenSamKluczMiesiaca(targetDocKey, pobierzAktywnyKluczMiesiaca()) 
        : (targetDocKey !== pobierzAktywnyKluczMiesiaca());

      async function budujZakrystie(daneTabeli) {
        var now = new Date();
        var dNum = parseInt(wybranyDzien, 10);
        if (isNaN(dNum) || dNum < 1 || dNum > 31) {
          dNum = now.getDate();
        }
        var parsedTKey = parsujKluczMiesiaca(targetDocKey);
        var currentYear = daneTabeli.rok || parsedTKey.rok || now.getFullYear();
        var currentMonthIdx = (daneTabeli.miesiacIdx !== undefined) ? daneTabeli.miesiacIdx : parsedTKey.miesiacIdx;
        var dt = new Date(currentYear, currentMonthIdx, dNum);
        var dow = dt.getDay(); // 0=Nd, 1=Pn, ..., 6=Sb

        var shortDayNames = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];
        var polishMonthsGen = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
        var dayName = shortDayNames[dow];
        var monthGen = polishMonthsGen[currentMonthIdx];

        var boxZakLits = document.getElementById('zakrystia-nadchodzace-liturgie');
        var curLitsZak = daneTabeli.liturgieDodatkowe || [];
        var nextLitsZak = (daneKolejnegoMiesiaca && daneKolejnegoMiesiaca.liturgieDodatkowe) || [];
        var allCombinedLits = curLitsZak.slice();
        nextLitsZak.forEach(function(nl) {
          if (!allCombinedLits.some(function(cl) { return cl.id === nl.id; })) {
            allCombinedLits.push(nl);
          }
        });

        if (boxZakLits) {
          var allUpcomingLits = allCombinedLits.filter(function(l) {
            return !czyLiturgiaJuzMinela(l.dzien, l.godzina, null, l.rok, l.miesiacIdx);
          }).sort(function(a, b) {
            var curYDef = (new Date()).getFullYear();
          var curMDef = (new Date()).getMonth();
          var ta = new Date(a.rok || curYDef, (a.miesiacIdx !== undefined) ? a.miesiacIdx : curMDef, a.dzien).getTime();
          var tb = new Date(b.rok || curYDef, (b.miesiacIdx !== undefined) ? b.miesiacIdx : curMDef, b.dzien).getTime();
            if (ta !== tb) return ta - tb;
            return (a.godzina || '').localeCompare(b.godzina || '');
          });
          if (allUpcomingLits.length > 0) {
            var hL = '<div style="background:rgba(59,130,246,0.08); border:1px solid rgba(59,130,246,0.25); border-radius:8px; padding:12px; margin-bottom:12px;">' +
              '<div style="font-size:12px; font-weight:700; color:#93c5fd; text-transform:uppercase; margin-bottom:6px;">Nadchodzące pogrzeby i nabożeństwa dodatkowe:</div>';
            allUpcomingLits.forEach(function(ul) {
              var zg = (ul.zgloszeni && ul.zgloszeni.length > 0) ? ul.zgloszeni.join(', ') : 'Brak zgłoszonych';
              var dispH = cleanTime(ul.godzina) || ul.godzina;
              if (!dispH || dispH.indexOf('24') !== -1 || dispH === '19:24' || dispH === '20:24') {
                dispH = (Number(ul.dzien) === 14) ? '10:00' : '11:00';
              }
              var isUlNext = (ul.miesiacIdx !== undefined && ul.miesiacIdx !== currentMonthIdx);
              var ulDocKey = isUlNext ? wyznaczKluczMiesiaca(new Date(ul.rok || currentYear, ul.miesiacIdx, 1)) : '';
              hL += '<div style="font-size:13px; color:#fafafa; margin-top:5px; display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:6px 8px; border-radius:6px; flex-wrap:wrap; gap:6px;">' +
                '<div><b>' + ul.rodzaj + '</b> — ' + ul.dataTekst + ' godz. ' + dispH + ' (+ ' + (ul.punkty || 3) + ' pkt) • Zgłoszeni: <span style="color:#60a5fa; font-weight:600;">' + zg + '</span></div>' +
                '<div style="display:flex; gap:6px;">' +
                  '<button onclick="otworzTrybZakrystia(' + ul.dzien + ', \'' + dispH + '\', \'' + ulDocKey + '\')" style="background:rgba(99,102,241,0.2); color:#a5b4fc; border:1px solid rgba(99,102,241,0.4); border-radius:4px; padding:3px 8px; font-size:11px; cursor:pointer; font-weight:600;">Wpisz obecność</button>' +
                  '<button onclick="usunLiturgie(\'' + ul.id + '\')" style="background:rgba(239,68,68,0.18); color:#fca5a5; border:1px solid rgba(239,68,68,0.35); border-radius:4px; padding:3px 8px; font-size:11px; cursor:pointer; font-weight:600;" title="Usuń tę liturgię">Usuń</button>' +
                '</div>' +
              '</div>';
            });
            hL += '</div>';
            boxZakLits.innerHTML = hL;
            boxZakLits.style.display = 'block';
          } else {
            boxZakLits.innerHTML = '';
            boxZakLits.style.display = 'none';
          }
        }
        var extraLits = allCombinedLits.filter(function(l) {
          var lm = (l.miesiacIdx !== undefined) ? l.miesiacIdx : currentMonthIdx;
          return l.dzien === dNum && lm === currentMonthIdx;
        });
        var gStr = cleanTime(wybranaGodzina);
        var matchedExtraLit = null;

        if (gStr) {
          matchedExtraLit = extraLits.find(function(l) { return cleanTime(l.godzina) === gStr; });
        } else {
          // Inteligentne wykrywanie pogrzebu/nabożeństwa jeśli godzina jest w pobliżu
          var curMinutes = now.getHours() * 60 + now.getMinutes();
          for (var eli = 0; eli < extraLits.length; eli++) {
            var eLit = extraLits[eli];
            var eParts = cleanTime(eLit.godzina).split(":");
            if (eParts.length === 2) {
              var eTotalM = parseInt(eParts[0], 10) * 60 + parseInt(eParts[1], 10);
              // W przedziale 50 minut przed do 60 minut po nabożeństwie
              if (curMinutes >= eTotalM - 50 && curMinutes <= eTotalM + 60) {
                matchedExtraLit = eLit;
                gStr = cleanTime(eLit.godzina);
                break;
              }
            }
          }

          var hDzien = (daneTabeli && daneTabeli.harmonogramDni) ? daneTabeli.harmonogramDni[dNum] : null;

          if (dow === 0 && gStr === "17:00") {
            gStr = "11:30";
          }
          if (!gStr && hDzien && ((hDzien.msze && hDzien.msze.length > 0) || (hDzien.nabozenstwa && hDzien.nabozenstwa.length > 0))) {
            var curTotalM = now.getHours() * 60 + now.getMinutes();
            var allDzienGodziny = [];
            if (hDzien.msze) hDzien.msze.forEach(function(m) { allDzienGodziny.push(cleanTime(m.godzina)); });
            if (hDzien.nabozenstwa) hDzien.nabozenstwa.forEach(function(n) { allDzienGodziny.push(cleanTime(n.godzina)); });
            
            if (allDzienGodziny.length > 0) {
              var minDiff = 9999;
              var bestH = allDzienGodziny[0];
              for (var gi = 0; gi < allDzienGodziny.length; gi++) {
                var gp = allDzienGodziny[gi].split(':');
                var gTotalM = parseInt(gp[0], 10) * 60 + parseInt(gp[1], 10);
                var diff = Math.abs(curTotalM - gTotalM);
                if (diff < minDiff) { minDiff = diff; bestH = allDzienGodziny[gi]; }
              }
              gStr = bestH;
            }
          }
          if (!gStr) {
            if (dow === 0) {
              var sunHours = ["08:30", "10:00", "11:30"];
              var curTotal = now.getHours() * 60 + now.getMinutes();
              var bestH = "10:00";
              if (curTotal > 12 * 60) {
                bestH = "11:30";
              } else {
                var minDiff = 9999;
                for (var shi = 0; shi < sunHours.length; shi++) {
                  var parts = sunHours[shi].split(":");
                  var totalM = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
                  var diff = Math.abs(curTotal - totalM);
                  if (diff < minDiff) { minDiff = diff; bestH = sunHours[shi]; }
                }
              }
              gStr = bestH;
            } else if (dow === 6) {
              if (dNum <= 7 && now.getHours() < 12) {
                gStr = "08:00";
              } else {
                gStr = "17:00";
              }
            } else if (dow === 4) {
              gStr = "17:00";
            } else {
              gStr = "18:00";
            }
          }
        }

        var cleanG = cleanTime(gStr);
        var isFirstSatRose = (dow === 6 && dNum <= 7 && cleanG === "08:00");
        var isWeekendMass = (dow === 0 && cleanG !== "15:00") || (dow === 6 && cleanG === "17:00");
        var dSun = (dow === 6) ? (dNum + 1) : dNum;
        var sunColIdx = dSun - 1;

        // Wykrywanie dni świątecznych i uroczystości (np. 1 listopada - Wszystkich Świętych -> 5 pkt):
        var dNaglowek = (daneTabeli && daneTabeli.dniNaglowek) ? daneTabeli.dniNaglowek[dNum - 1] : null;
        var litInfo = (typeof wyznaczDaneLiturgiczne === 'function') ? wyznaczDaneLiturgiczne(new Date(currentYear, currentMonthIdx, dNum)) : null;
        var isHoliday5Pkt = (dNaglowek && (dNaglowek.czySwieto || dNaglowek.punktyZaObecnosc === 5)) ||
                            (dNum === 1 && currentMonthIdx === 10) || // 1 listopada Wszystkich Świętych
                            (litInfo && (litInfo.ranga === 'Uroczystość' || (litInfo.nazwa && litInfo.nazwa.indexOf('Wszystkich Świętych') !== -1)));

        // Podstawowy rodzaj z reguł ogólnych (msze św. są zawsze widoczne):
        var domyslnyRodzaj = isHoliday5Pkt ? 'msza_swieto' : (isWeekendMass ? 'msza_niedziela' : 'msza_tydzien');
        var domyslnePkt = isHoliday5Pkt ? 5 : (isWeekendMass ? 3 : 5);
        var domyslnaNazwa = isHoliday5Pkt ? ((litInfo && litInfo.nazwa) ? litInfo.nazwa : 'Uroczystość Wszystkich Świętych') : (isWeekendMass ? (dow === 6 ? 'Msza w niedzielę (sobota 17:00)' : 'Msza w niedzielę') : ((dow === 4 && cleanG === '17:00') ? 'Msza św. szkolna' : 'Msza w tygodniu'));

        if (isFirstSatRose) {
          domyslnyRodzaj = 'msza_roza';
          domyslnePkt = 4;
          domyslnaNazwa = 'Msza Róży Różańcowej (Msza + Różaniec)';
        }

        // 1. Sprawdź harmonogram z gazetki dla tego dnia:
        var hDzienDoc = (daneTabeli && daneTabeli.harmonogramDni) ? (daneTabeli.harmonogramDni[dNum] || daneTabeli.harmonogramDni['' + dNum]) : null;
        if (hDzienDoc) {
          var nFromH = (hDzienDoc.nabozenstwa || []).find(function(n) { return cleanTime(n.godzina) === cleanG; });
          var mFromH = (hDzienDoc.msze || []).find(function(m) { return cleanTime(m.godzina) === cleanG; });
          if (nFromH) {
            domyslnyRodzaj = 'nabozenstwo';
            domyslnePkt = nFromH.punkty || (dow === 0 ? 3 : 2);
            domyslnaNazwa = nFromH.nazwa || 'Nabożeństwo';
          } else if (mFromH) {
            domyslnyRodzaj = (mFromH.typ && mFromH.typ !== 'nabozenstwo') ? mFromH.typ : (isHoliday5Pkt ? 'msza_swieto' : (isWeekendMass ? 'msza_niedziela' : 'msza_tydzien'));
            domyslnePkt = mFromH.punkty || (isHoliday5Pkt ? 5 : (isWeekendMass ? 3 : 5));
            domyslnaNazwa = mFromH.nazwa || (isHoliday5Pkt ? 'Uroczystość Wszystkich Świętych' : 'Msza św.');
          }
        }

        // 2. Sprawdź liturgie dodatkowe (np. pogrzeby, śluby, nabożeństwa specjalne):
        if (matchedExtraLit) {
          var rLow = (matchedExtraLit.rodzaj || '').toLowerCase();
          domyslnyRodzaj = (rLow.indexOf('pogrzeb') !== -1) ? 'pogrzeb' : (rLow.indexOf('naboż') !== -1 || rLow.indexOf('róż') !== -1 ? 'nabozenstwo' : 'msza_tydzien');
          domyslnePkt = matchedExtraLit.punkty || (domyslnyRodzaj === 'pogrzeb' ? 3 : 2);
          domyslnaNazwa = matchedExtraLit.rodzaj || 'Pogrzeb';
        }

        // 3. Wymuszone nadpisanie przez wybór użytkownika (z modalu zmiany mszy lub pilli):
        if (optOverrideRodzaj) {
          domyslnyRodzaj = optOverrideRodzaj;
          if (optOverridePkt !== undefined && optOverridePkt !== null) domyslnePkt = optOverridePkt;
          if (optOverrideNazwa) domyslnaNazwa = optOverrideNazwa;
        }

        var colIdx = dNum - 1;
        var ministranci = [];
        var juzZapisane = false;

        var allNames = (listaUzytkownikow || []).map(function(u) { return u.nazwisko; }).filter(function(n) {
          return n.toLowerCase() !== "kościelny" && n.toLowerCase() !== "koscielny";
        }).sort(function(a, b) { return a.localeCompare(b, "pl"); });

        function czyToSamoNazwisko(n1, n2) {
          if (!n1 || !n2) return false;
          var s1 = n1.toLowerCase().trim().replace(/ł/g, 'l').replace(/ą/g, 'a').replace(/ę/g, 'e').replace(/ś/g, 's').replace(/ć/g, 'c').replace(/ż/g, 'z').replace(/ź/g, 'z').replace(/ń/g, 'n').replace(/ó/g, 'o');
          var s2 = n2.toLowerCase().trim().replace(/ł/g, 'l').replace(/ą/g, 'a').replace(/ę/g, 'e').replace(/ś/g, 's').replace(/ć/g, 'c').replace(/ż/g, 'z').replace(/ź/g, 'z').replace(/ń/g, 'n').replace(/ó/g, 'o');
          if (s1 === s2) return true;
          if (s1.length >= 4 && s2.indexOf(s1) !== -1) return true;
          if (s2.length >= 4 && s1.indexOf(s2) !== -1) return true;
          return false;
        }

        function znajdzOferteDlaMinistranta(nazwisko, dzien, godzina) {
          var gNorm = cleanTime(godzina);

          // 1. Sprawdź zamianyZastepstwa
          var allZ = daneTabeli.zamianyZastepstwa || [];
          for (var i = 0; i < allZ.length; i++) {
            var z = allZ[i];
            if (z.dzien === dzien && z.status !== 'ANULOWANA') {
              if (czyToSamoNazwisko(z.oddajacy, nazwisko)) {
                var zGodz = cleanTime(z.godzina);
                if (!zGodz || !gNorm || zGodz === gNorm || (dow !== 0 && (zGodz === '18:00' || gNorm === '18:00'))) {
                  return z;
                }
              }
            }
          }

          // 2. Sprawdź wolneZastepstwa
          var allW = daneTabeli.wolneZastepstwa || [];
          for (var j = 0; j < allW.length; j++) {
            var wZ = allW[j];
            if (wZ.dzien === dzien) {
              if (czyToSamoNazwisko(wZ.oddajacy, nazwisko)) {
                var wGodz = cleanTime(wZ.godzina);
                if (!wGodz || !gNorm || wGodz === gNorm || (dow !== 0 && (wGodz === '18:00' || gNorm === '18:00'))) {
                  return {
                    id: wZ.id,
                    dzien: wZ.dzien,
                    oddajacy: wZ.oddajacy,
                    przejmujacy: '',
                    godzina: wZ.godzina,
                    typ: wZ.typ,
                    status: 'OCZEKUJE'
                  };
                }
              }
            }
          }

          // 3. Sprawdź gieldaTydzien (zamiany 1:1)
          var allGT = daneTabeli.gieldaTydzien || [];
          for (var k = 0; k < allGT.length; k++) {
            var gt = allGT[k];
            if (gt.dzienOddawany === dzien) {
              if (czyToSamoNazwisko(gt.wystawiajacy, nazwisko)) {
                return {
                  id: gt.id,
                  dzien: gt.dzienOddawany,
                  oddajacy: gt.wystawiajacy,
                  przejmujacy: '',
                  godzina: gt.godzina,
                  typ: 'Tydzień',
                  status: 'OCZEKUJE',
                  isGielda1do1: true
                };
              }
            }
          }

          // 4. Sprawdź gieldaNiedziele
          var allGN = daneTabeli.gieldaNiedziele || [];
          for (var gn = 0; gn < allGN.length; gn++) {
            var gnItem = allGN[gn];
            var matchDay = (gnItem.dzien === dzien) || (isWeekendMass && (gnItem.dzien === dSun || gnItem.dzien === dNum));
            if (matchDay) {
              if (czyToSamoNazwisko(gnItem.wystawiajacy, nazwisko)) {
                var gnGodz = cleanTime(gnItem.godzinaOddawana);
                if (!gnGodz || !gNorm || gnGodz === gNorm) {
                  return {
                    id: gnItem.id,
                    dzien: gnItem.dzien,
                    oddajacy: gnItem.wystawiajacy,
                    przejmujacy: '',
                    godzina: gnItem.godzinaOddawana,
                    typ: 'Niedziela',
                    status: 'OCZEKUJE'
                  };
                }
              }
            }
          }

          return null;
        }

        function wyznaczGodzineWeekendowaDlaGrupy(grupaNazwa, nazwisko) {
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
          var rot = wyznaczRotowaneGodzinyGrup(currentYear, currentMonthIdx);
          for (var rk in rot) {
            if (g.indexOf(rk.toUpperCase()) !== -1 || rk.toUpperCase().indexOf(g) !== -1 || dopasujGrupe(rk, g)) {
              return rot[rk];
            }
          }
          return '10:00';
        }

                var wiersze = daneTabeli.wiersze || [];
        
        // JEŚLI TO LITURGIA DODATKOWA (np. pogrzeb o 10:00), lista służących składa się WYŁĄCZNIE ze zgłoszonych chętnych!
        // Ministranci z grafiku tygodniowego (np. Jakub Brytner, Maks Erich) służą o 18:00, NIE na pogrzebie!
        if (matchedExtraLit) {
          var zgloszeniList = matchedExtraLit.zgloszeni || [];
          zgloszeniList.forEach(function(zName) {
            var normZ = zName.toLowerCase().trim();
            var exists = ministranci.some(function(m) { return czyToSamoNazwisko(m.nazwisko, zName); });
            if (!exists) {
              var wRow = wiersze.find(function(w) { return czyToSamoNazwisko(w.nazwisko, zName); });
              var stInfo = wyznaczStopienMinistranta(zName, wiersze);
              ministranci.push({
                nazwisko: zName,
                normName: normZ,
                grupa: (wRow && wRow.grupa) ? wRow.grupa : 'Ministrant',
                stopien: stInfo.stopien,
                stopienRanga: stInfo.ranga,
                funkcja: null,
                strona: null,
                typ: 'DODATKOWY',
                zastepuje: null,
                status: 'OBECNY',
                domyslnyStatus: 'OBECNY',
                obecnyPkt: domyslnePkt,
                opisGieldy: '',
                poprzedniaWartosc: null
              });
            }
          });
        } else if (domyslnyRodzaj === 'nabozenstwo' && !isFirstSatRose) {
          // Automatycznie proponuj ministrantów ze służby powiązanej z tym nabożeństwem
          // (przed mszą w tygodniu, po mszy w czwartek, lub przed mszą weekendową):
          var linkedMassHour = (dow === 0 || dow === 6) ? '17:00' : (dow === 4 ? '17:45' : '18:00');
          for (var i = 0; i < wiersze.length; i++) {
            var w = wiersze[i];
            var kCur = (w.komorki && w.komorki[colIdx]) ? w.komorki[colIdx] : null;
            var kSun = (w.komorki && w.komorki[sunColIdx]) ? w.komorki[sunColIdx] : null;

            var maDyzurNaMszy = false;
            var opisDyzuru = 'Dyżur z mszy tego dnia';
            if (dow === 0) {
              // Niedziela: po nabożeństwie o 15:00 jest msza o 17:00, proponujemy ministrantów z grupy 17:00
              var efNd = wyznaczEfektywnaGodzineWeekendowaDlaMinistranta(w, dNum, dow, daneTabeli);
              maDyzurNaMszy = (efNd.godzina === '17:00') || (!efNd.zamiana && (kSun && kSun.maDyzur) && (efNd.godzina === '17:00'));
              opisDyzuru = efNd.zamiana ? ('Dyżur przed mszą 17:00 (zamiana z ' + efNd.partner + ')') : 'Dyżur przed mszą 17:00';
            } else if (dow === 6) {
              // Sobota: nabożeństwo o 16:15 jest przed mszą wigilijną o 17:00, proponujemy grupę ze mszy 17:00
              var efSb = wyznaczEfektywnaGodzineWeekendowaDlaMinistranta(w, dNum, dow, daneTabeli);
              maDyzurNaMszy = (efSb.godzina === '17:00') || (!efSb.zamiana && (((kSun && kSun.maDyzur) && (efSb.godzina === '17:00')) || !!(kCur && kCur.maDyzur)));
              opisDyzuru = efSb.zamiana ? ('Dyżur przed mszą sobotnią 17:00 (zamiana z ' + efSb.partner + ')') : 'Dyżur przed mszą sobotnią 17:00';
            } else if (dow === 4) {
              // Czwartek: nabożeństwo jest po mszy szkolnej (17:45), proponujemy ministrantów ze mszy z czwartku
              var stalyD4 = (w.stalyDzienTygodnia !== undefined && w.stalyDzienTygodnia !== null) ? w.stalyDzienTygodnia : -1;
              maDyzurNaMszy = (stalyD4 === 4) || !!(kCur && kCur.maDyzur);
              opisDyzuru = 'Dyżur po mszy szkolnej (czwartek)';
            } else {
              // Dni powszednie (pn, wt, śr, pt): nabożeństwo jest przed mszą o 18:00
              var stalyDWeek = (w.stalyDzienTygodnia !== undefined && w.stalyDzienTygodnia !== null) ? w.stalyDzienTygodnia : -1;
              maDyzurNaMszy = (stalyDWeek === dow) || !!(kCur && kCur.maDyzur);
              opisDyzuru = 'Dyżur przed mszą 18:00';
            }

            // Jeśli ministrant oddał swój dyżur z powiązanej mszy LUB się z niej usprawiedliwił (0 pkt), nie proponuj go jako domyślnego uczestnika nabożeństwa:
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
            }

            if (maDyzurNaMszy) {
              var stInfoW = wyznaczStopienMinistranta(w.nazwisko, wiersze);
              ministranci.push({
                nazwisko: w.nazwisko,
                normName: w.nazwisko.toLowerCase(),
                grupa: w.grupa || 'Ogólna',
                stopien: w.stopien || stInfoW.stopien,
                stopienRanga: w.stopienRanga || stInfoW.ranga,
                funkcja: null,
                strona: null,
                typ: 'DODATKOWY', // Nabożeństwo to dobrowolna służba dodatkowa (+2 pkt), NIGDY kara -5 pkt!
                zastepuje: null,
                status: 'OBECNY',
                domyslnyStatus: 'OBECNY',
                obecnyPkt: domyslnePkt, // np. 2 pkt w tygodniu, 3 pkt w niedzielę
                opisGieldy: opisDyzuru,
                poprzedniaWartosc: null,
                poprzedniePunktyZTejMszy: 0
              });
            }
          }

          // Zaproponuj również zastępców, którzy przejęli dyżur na powiązanej mszy (np. Maciej Erich za Ksawerego Skrzypek):
          var allZastepstwaNabozenstwa = [].concat(daneTabeli.zamianyZastepstwa || [], daneTabeli.wolneZastepstwa || []).filter(function(z) {
            if (!z || (z.status !== 'PRZEJETE' && z.status !== 'ZREALIZOWANE') || !z.przejmujacy) return false;
            var matchDay = (z.dzien === dNum) || (dow === 6 && z.dzien === (dNum + 1));
            if (!matchDay) return false;
            var zGodz = cleanTime(z.godzina);
            if (!zGodz || zGodz === linkedMassHour || (linkedMassHour === '18:00' && (!zGodz || zGodz === '18:00'))) return true;
            return false;
          });

          for (var zni = 0; zni < allZastepstwaNabozenstwa.length; zni++) {
            var ofeN = allZastepstwaNabozenstwa[zni];
            var normPN = ofeN.przejmujacy.toLowerCase().trim();
            var existsN = ministranci.some(function(m) { return czyToSamoNazwisko(m.nazwisko, ofeN.przejmujacy); });
            if (!existsN) {
              var pRowN = wiersze.find(function(w) { return czyToSamoNazwisko(w.nazwisko, ofeN.przejmujacy); });
              var stInfoPN = wyznaczStopienMinistranta(ofeN.przejmujacy, wiersze);
              ministranci.push({
                nazwisko: ofeN.przejmujacy,
                normName: normPN,
                grupa: pRowN ? pRowN.grupa : 'Zastępca',
                stopien: pRowN ? pRowN.stopien : stInfoPN.stopien,
                stopienRanga: pRowN ? pRowN.stopienRanga : stInfoPN.ranga,
                funkcja: null,
                strona: null,
                typ: 'DODATKOWY',
                zastepuje: ofeN.oddajacy,
                status: 'OBECNY',
                domyslnyStatus: 'OBECNY',
                obecnyPkt: domyslnePkt,
                opisGieldy: 'Zastępca z mszy ' + linkedMassHour + ' (' + ofeN.oddajacy + ')',
                poprzedniaWartosc: pRowN && pRowN.komorki && pRowN.komorki[colIdx] ? pRowN.komorki[colIdx].wartosc : null,
                poprzedniePunktyZTejMszy: 0
              });
            }
          }
        } else {
          // ZWYKŁA MSZA GRAFIKOWA (np. 18:00 w tygodniu, lub godziny niedzielne)
          for (var i = 0; i < wiersze.length; i++) {
            var w = wiersze[i];
            var kCur = (w.komorki && w.komorki[colIdx]) ? w.komorki[colIdx] : null;
            var kSun = (w.komorki && w.komorki[sunColIdx]) ? w.komorki[sunColIdx] : null;

            var maDyzur = false;
            var zamianaInfoText = '';
            if (isWeekendMass) {
              var efInfo = wyznaczEfektywnaGodzineWeekendowaDlaMinistranta(w, dNum, dow, daneTabeli);
              var userGodz = efInfo.godzina;
              if (efInfo.zamiana) {
                if (dow === 6 && cleanG === "17:00") {
                  maDyzur = (userGodz === "17:00");
                } else {
                  maDyzur = (userGodz === gStr || userGodz === cleanG);
                }
                if (maDyzur) {
                  zamianaInfoText = efInfo.opis || ('Zamiana z: ' + efInfo.partner);
                }
              } else {
                if (dow === 6 && cleanG === "17:00") {
                  maDyzur = (userGodz === "17:00") || !!(kCur && kCur.maDyzur);
                } else {
                  maDyzur = (userGodz === gStr || userGodz === cleanG) || ((kSun && kSun.maDyzur) && (userGodz === gStr));
                }
              }
            } else if (dow === 6) {
              // W sobotę rano (08:00 Msza Róży Różańcowej lub inne godziny przed 17:00):
              // Żadna grupa nie ma dyżuru grafikowego! Kropki w kolumnie soboty należą do 17:00.
              // Sobota 08:00 jest dobrowolna (+4 pkt) - brak kary -5 pkt, brak narzuconej grupy.
              maDyzur = false;
            } else {
              // W tygodniu (pn-pt):
              var stalyD = (w.stalyDzienTygodnia !== undefined && w.stalyDzienTygodnia !== null) ? w.stalyDzienTygodnia : -1;
              maDyzur = (stalyD === dow) || !!(kCur && kCur.maDyzur);
            }

            if (maDyzur) {
              var cellVal = kCur ? kCur.wartosc : null;
              var status = 'OBECNY';
              var domyslnyStatus = 'OBECNY';
              var typ = 'DOMYSLNY';
              var pkt = isHoliday5Pkt ? 5 : (isWeekendMass ? 3 : 5);
              var zastepuje = null;
              var opisGieldy = zamianaInfoText || '';

              if (isHoliday5Pkt) {
                var juzBylSwieto = czyMinistrantBylJuzNaInnejMszyWSwieto(w, colIdx, gStr);
                if (juzBylSwieto) {
                  pkt = 2;
                  if (!opisGieldy) opisGieldy = 'Kolejna msza w święto (+2 pkt • służył już dzisiaj)';
                }
              }

              // Sprawdź czy ministrant oddał ten dyżur na giełdę / ma zastępcę
              var ofertaZ = znajdzOferteDlaMinistranta(w.nazwisko, dNum, gStr);
              if (!ofertaZ && isWeekendMass && dow === 6) {
                ofertaZ = znajdzOferteDlaMinistranta(w.nazwisko, dSun, gStr);
              }
              if (ofertaZ) {
                if ((ofertaZ.status === 'PRZEJETE' || ofertaZ.status === 'ZREALIZOWANE') && ofertaZ.przejmujacy) {
                  status = 'ODDANY';
                  domyslnyStatus = 'ODDANY';
                  zastepuje = ofertaZ.przejmujacy;
                  opisGieldy = 'Oddał dyżur (Zastępuje: ' + ofertaZ.przejmujacy + ')';
                } else {
                  status = 'USPRAWIEDLIWIONY';
                  domyslnyStatus = 'USPRAWIEDLIWIONY';
                  opisGieldy = 'Wolny dyżur na giełdzie (nikt nie przejął • 0 pkt)';
                }
              }

              var checkVal = cellVal;
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
              }

              if (checkVal !== null && checkVal !== undefined && checkVal !== '') {
                var nVal = parseFloat(checkVal);
                if (domyslnyStatus === 'ODDANY') {
                  // Jeśli oddał dyżur, wartość 1 oznacza zrealizowane oddanie dyżuru (+1 pkt). Status pozostaje ODDANY!
                  if (nVal >= 3) {
                    status = 'OBECNY';
                  } else {
                    status = 'ODDANY';
                  }
                } else if (domyslnyStatus === 'USPRAWIEDLIWIONY') {
                  if (nVal >= 3) {
                    status = 'OBECNY';
                  } else {
                    status = 'USPRAWIEDLIWIONY';
                  }
                } else {
                  if (nVal > 0) {
                    status = 'OBECNY';
                  } else if (nVal < 0) {
                    status = 'NIEOBECNY';
                  } else if (nVal === 0) {
                    status = 'USPRAWIEDLIWIONY';
                    domyslnyStatus = 'USPRAWIEDLIWIONY';
                    if (!opisGieldy) opisGieldy = 'Zgłoszona nieobecność (0 pkt)';
                  }
                }
              }

              var stInfoW = wyznaczStopienMinistranta(w.nazwisko, wiersze);
              ministranci.push({
                nazwisko: w.nazwisko,
                normName: w.nazwisko.toLowerCase(),
                grupa: w.grupa || 'Ogólna',
                stopien: w.stopien || stInfoW.stopien,
                stopienRanga: w.stopienRanga || stInfoW.ranga,
                funkcja: null,
                strona: null,
                typ: typ,
                zastepuje: zastepuje,
                status: status,
                domyslnyStatus: domyslnyStatus,
                obecnyPkt: pkt,
                opisGieldy: opisGieldy,
                poprzedniaWartosc: cellVal,
                poprzedniePunktyZTejMszy: 0
              });
            }
          }

          // Dodanie zastępców z giełdy, którzy przejęli dyżur na tę mszę (+4 pkt)
          var allZastepstwaDnia = [].concat(daneTabeli.zamianyZastepstwa || [], daneTabeli.wolneZastepstwa || []).filter(function(z) {
            if (!z || (z.status !== 'PRZEJETE' && z.status !== 'ZREALIZOWANE') || !z.przejmujacy) return false;
            var matchDay = (z.dzien === dNum) || (isWeekendMass && (z.dzien === dSun || z.dzien === dNum));
            if (!matchDay) return false;
            var zGodz = cleanTime(z.godzina);
            if (!zGodz || !gStr || zGodz === gStr || (!isWeekendMass && (zGodz === '18:00' || gStr === '18:00'))) return true;
            return false;
          });

          for (var zi = 0; zi < allZastepstwaDnia.length; zi++) {
            var ofe = allZastepstwaDnia[zi];
            var normP = ofe.przejmujacy.toLowerCase().trim();
            var exists = ministranci.some(function(m) { return czyToSamoNazwisko(m.nazwisko, ofe.przejmujacy); });
            if (!exists) {
              var pRow = wiersze.find(function(w) { return czyToSamoNazwisko(w.nazwisko, ofe.przejmujacy); });
              var stInfoP = wyznaczStopienMinistranta(ofe.przejmujacy, wiersze);
              ministranci.push({
                nazwisko: ofe.przejmujacy,
                normName: normP,
                grupa: (pRow && pRow.grupa) ? pRow.grupa : 'Zastępca z giełdy',
                stopien: (pRow && pRow.stopien) || stInfoP.stopien,
                stopienRanga: (pRow && pRow.stopienRanga) || stInfoP.ranga,
                funkcja: null,
                strona: null,
                typ: 'ZASTEPCA',
                zastepuje: ofe.oddajacy || null,
                status: 'OBECNY',
                domyslnyStatus: 'OBECNY',
                obecnyPkt: 4,
                opisGieldy: 'Zastępca za: ' + ofe.oddajacy + ' (+4 pkt)',
                poprzedniaWartosc: null,
                poprzedniePunktyZTejMszy: 0
              });
            }
          }
        }

        var maRozaniec = false; // Nabożeństwa mają własne, odrębne godziny w grafiku z gazetki

        zakrystiaStan = {
          sukces: true,
          docKey: targetDocKey || pobierzAktywnyKluczMiesiaca(),
          rok: currentYear,
          miesiacIdx: currentMonthIdx,
          dzien: dNum,
          godzina: gStr,
          dataTekst: dNum + ' ' + monthGen + ' (' + dayName + ')',
          dzienTygodnia: dayName,
          rodzajLiturgii: domyslnyRodzaj,
          punktyLiturgii: domyslnePkt,
          nazwaLiturgii: domyslnaNazwa,
          juzZapisane: juzZapisane,
          czyLiturgiaDodatkowa: !!matchedExtraLit,
          maRozaniec: maRozaniec,
          ministranci: ministranci,
          wszyscyMinistranciParafii: allNames
        };

        renderujTrybZakrystia();

        // Sprawdź czy jest już zapisana obecność dla tej konkretnej mszy (dzień+godzina).
        // Jeśli tak — użyj jej jako bazę (zachowuje ręcznie dodane osoby i zmiany statusów).
        if (dbFirestore && gStr) {
          var logPrefix = (currentMonthIdx !== undefined && currentMonthIdx !== 8) ? ('M' + currentMonthIdx + '_') : '';
          var lId = logPrefix + ((dNum < 10 ? '0' : '') + dNum) + '_' + gStr.replace(':', '');
          try {
            var docObecSaved = await dbFirestore.collection('obecnosc').doc(lId).get();
            if (docObecSaved && docObecSaved.exists && docObecSaved.data() && docObecSaved.data().ministranci) {
              var dOb = docObecSaved.data();
              (dOb.ministranci || []).forEach(function(m) {
                if (!m.stopien) {
                  var stInfoLoad = wyznaczStopienMinistranta(m.nazwisko, wiersze);
                  m.stopien = stInfoLoad.stopien;
                  m.stopienRanga = stInfoLoad.ranga;
                }
              });
              if (dOb.zapisano) {
                zakrystiaStan.ministranci = dOb.ministranci;
                zakrystiaStan.juzZapisane = true;
                (zakrystiaStan.ministranci || []).forEach(function(m) {
                  m.poprzedniePunktyZTejMszy = (typeof m.punkty === 'number') ? m.punkty : ((m.obecnyPkt || 0) + (m.bylNaRozancu ? 2 : 0) - (m.karaPunkty || 0));
                });
                if (dOb.rodzajLiturgii) zakrystiaStan.rodzajLiturgii = dOb.rodzajLiturgii;
                if (dOb.punktyLiturgii) zakrystiaStan.punktyLiturgii = dOb.punktyLiturgii;
                if (dOb.recznieUstawionePunkty !== undefined) zakrystiaStan.recznieUstawionePunkty = dOb.recznieUstawionePunkty;
                if (dOb.nazwaLiturgii) zakrystiaStan.nazwaLiturgii = dOb.nazwaLiturgii;
                if (dOb.maRozaniec !== undefined) zakrystiaStan.maRozaniec = dOb.maRozaniec;
              } else {
                zakrystiaStan.juzZapisane = false;
              }
              renderujTrybZakrystia();
            }
          } catch(eObec) {
            console.warn('Nie udało się sprawdzić zapisanej obecności:', eObec);
          }
        }
      }

      // 1. Z pamięci podręcznej i localStorage (błyskawiczny render w 0 ms!)
      var tabelaDoUzycia = isNextMonthZak ? daneKolejnegoMiesiaca : tabelaMiesiacaDane;
      if (!tabelaDoUzycia || !tabelaDoUzycia.wiersze || !tabelaDoUzycia.wiersze.length) {
        try {
          var rawT = isNextMonthZak ? localStorage.getItem('min_cached_tabela_' + targetDocKey) : localStorage.getItem('min_cached_tabela');
          if (rawT) {
            var pT = JSON.parse(rawT);
            if (pT && pT.wiersze && pT.wiersze.length) {
              tabelaDoUzycia = pT;
              if (isNextMonthZak) daneKolejnegoMiesiaca = pT;
              else tabelaMiesiacaDane = pT;
            }
          }
        } catch(e) {}
      }

      var juzWyrenderowanoZCache = false;
      if (tabelaDoUzycia && tabelaDoUzycia.wiersze && tabelaDoUzycia.wiersze.length) {
        try {
          budujZakrystie(tabelaDoUzycia);
          juzWyrenderowanoZCache = true;
        } catch(eCached) {
          console.warn('Błąd szybkiego renderu z cache zakrystii:', eCached);
        }
      }

      // 2. Pobierz z bazy Firestore w Warszawie (lub zaktualizuj w tle)
      if (dbFirestore) {
        if (!juzWyrenderowanoZCache && kontener) {
          kontener.innerHTML = '<div style="text-align:center; padding:30px; color:#818cf8;"><span class="mini-spin" style="font-size:20px;">⟳</span> Ładowanie zaplanowanych ministrantów...</div>';
        }
        var targetG = cleanTime(wybranaGodzina);
        var parsedTgt = parsujKluczMiesiaca(targetDocKey);
        var logIdPrefix = (parsedTgt.miesiacIdx !== 8 || parsedTgt.rok !== 2026) ? ('M' + parsedTgt.miesiacIdx + '_') : '';
        var lId = targetG ? (logIdPrefix + ((parseInt(wybranyDzien, 10) < 10 ? '0' : '') + parseInt(wybranyDzien, 10)) + '_' + targetG.replace(':', '')) : null;
        
        var timeoutPromise = new Promise(function(resolve) {
          setTimeout(function() { resolve({ isTimeout: true }); }, 3500);
        });

        var fsPromises = Promise.all([
          dbFirestore.collection('stan_grafiku').doc(targetDocKey).get(),
          lId ? dbFirestore.collection('obecnosc').doc(lId).get().catch(function() { return null; }) : Promise.resolve(null)
        ]);

        Promise.race([fsPromises, timeoutPromise]).then(function(resArray) {
          if (resArray && resArray.isTimeout) {
            console.warn('Zakrystia: timeout pobierania z Firestore.');
            if (!juzWyrenderowanoZCache) {
              if (tabelaDoUzycia && tabelaDoUzycia.wiersze) {
                budujZakrystie(tabelaDoUzycia);
              } else if (kontener) {
                kontener.innerHTML = '<div style="text-align:center; padding:30px; color:#fca5a5;">Połączenie z bazą trwa zbyt długo.<br><button onclick="wczytajDaneDlaZakrystii(null, null, true)" class="btn-secondary" style="margin-top:12px; width:auto; padding:8px 16px;">Spróbuj ponownie</button></div>';
              }
            }
            return;
          }

          var doc = resArray[0];
          var docObec = resArray[1];
          if (doc && doc.exists && doc.data() && doc.data().wiersze) {
            var docData = doc.data();
            if (isNextMonthZak) {
              daneKolejnegoMiesiaca = docData;
              try { localStorage.setItem('min_cached_tabela_' + targetDocKey, JSON.stringify(daneKolejnegoMiesiaca)); } catch(e) {}
            } else {
              tabelaMiesiacaDane = docData;
              try { localStorage.setItem('min_cached_tabela', JSON.stringify(tabelaMiesiacaDane)); } catch(e) {}
            }
            
            // Jeśli istnieje już ZAPISANA obecność dla tej konkretnej godziny w dokumencie obecnosc/{logId}
            // (kościelny kliknął wcześniej "Zapisz obecność"), użyj jej:
            if (docObec && docObec.exists && docObec.data() && docObec.data().ministranci && docObec.data().zapisano) {
              var dOb = docObec.data();
              (dOb.ministranci || []).forEach(function(m) {
                if (!m.stopien) {
                  var sInfo = wyznaczStopienMinistranta(m.nazwisko, docData ? docData.wiersze : []);
                  m.stopien = sInfo.stopien;
                  m.stopienRanga = sInfo.ranga;
                }
                m.poprzedniePunktyZTejMszy = (typeof m.punkty === 'number') ? m.punkty : ((m.obecnyPkt || 0) + (m.bylNaRozancu ? 2 : 0) - (m.karaPunkty || 0));
              });
              var parsedTgtZ = parsujKluczMiesiaca(targetDocKey);
              zakrystiaStan = {
                sukces: true,
                docKey: targetDocKey,
                rok: dOb.rok || parsedTgtZ.rok,
                miesiacIdx: (dOb.miesiacIdx !== undefined) ? dOb.miesiacIdx : parsedTgtZ.miesiacIdx,
                dzien: dOb.dzien || parseInt(wybranyDzien, 10),
                godzina: dOb.godzina || cleanTime(wybranaGodzina),
                dataTekst: dOb.dataTekst || (wybranyDzien + ' ' + (polishMonthsGenitive[parsedTgtZ.miesiacIdx] || '')),
                dzienTygodnia: dOb.dzienTygodnia || '',
                rodzajLiturgii: dOb.rodzajLiturgii || 'msza_tydzien',
                punktyLiturgii: dOb.punktyLiturgii || 5,
                nazwaLiturgii: dOb.nazwaLiturgii || 'Msza św.',
                juzZapisane: true,
                czyLiturgiaDodatkowa: (dOb.rodzajLiturgii === 'pogrzeb' || dOb.rodzajLiturgii === 'nabozenstwo'),
                maRozaniec: (dOb.maRozaniec !== undefined) ? dOb.maRozaniec : (parsedTgtZ.miesiacIdx === 9),
                ministranci: dOb.ministranci || [],
                wszyscyMinistranciParafii: (listaUzytkownikow || []).map(function(u) { return u.nazwisko; }).filter(function(n) {
                  return n.toLowerCase() !== "kościelny" && n.toLowerCase() !== "koscielny";
                }).sort(function(a, b) { return a.localeCompare(b, "pl"); })
              };
              renderujTrybZakrystia();
              return;
            }
            budujZakrystie(docData);
          } else {
            console.warn('Zakrystia: brak dokumentu w Firestore, sprawdzam pamięć podręczną');
            var cached = isNextMonthZak ? daneKolejnegoMiesiaca : tabelaMiesiacaDane;
            if (cached && cached.wiersze) {
              budujZakrystie(cached);
            } else if (!juzWyrenderowanoZCache && kontener) {
              kontener.innerHTML = '<div style="text-align:center; padding:30px; color:#ef4444;">Nie udało się załadować grafiku dla tej daty.<br><button onclick="wczytajDaneDlaZakrystii(null, null, true)" class="btn-secondary" style="margin-top:12px; width:auto; padding:8px 16px;">Spróbuj ponownie</button></div>';
            }
          }
        }).catch(function(err) {
          console.warn('Firestore zakrystia error:', err);
          var cached = isNextMonthZak ? daneKolejnegoMiesiaca : tabelaMiesiacaDane;
          if (cached && cached.wiersze) {
            budujZakrystie(cached);
          } else if (!juzWyrenderowanoZCache && kontener) {
            kontener.innerHTML = '<div style="text-align:center; padding:30px; color:#ef4444;">Wystąpił błąd połączenia z bazą grafiku.<br><button onclick="wczytajDaneDlaZakrystii(null, null, true)" class="btn-secondary" style="margin-top:12px; width:auto; padding:8px 16px;">Spróbuj ponownie</button></div>';
          }
        });
      } else if (!juzWyrenderowanoZCache && kontener) {
        var cachedLocal = isNextMonthZak ? daneKolejnegoMiesiaca : tabelaMiesiacaDane;
        if (cachedLocal && cachedLocal.wiersze) {
          budujZakrystie(cachedLocal);
        } else {
          kontener.innerHTML = '<div style="text-align:center; padding:30px; color:#ef4444;">Brak połączenia z bazą danych.<br><button onclick="wczytajDaneDlaZakrystii(null, null, true)" class="btn-secondary" style="margin-top:12px; width:auto; padding:8px 16px;">Spróbuj ponownie</button></div>';
        }
      }
    }


    // =============================================================
    // MODUŁ NABOŻEŃSTW DODATKOWYCH (POGRZEBY / ŚLUBY +3 PKT)
    // =============================================================
    function otworzModalOglosLiturgie() {
      if (!czyMaDostepDoZakrystii(globalUser ? globalUser.nazwisko : '')) {
        pokazToast('Brak uprawnień. Ogłaszanie nabożeństw jest dostępne dla Kościelnego i animatorów.');
        return;
      }

      // Resetuj przycisk na wypadek gdyby był zablokowany po błędzie
      var btnZ = document.getElementById('btn-oglos-zatwierdz');
      if (btnZ) { btnZ.disabled = false; btnZ.innerText = 'Wyślij PUSH i ogłoś'; }

      var selD = document.getElementById('sel-oglos-dzien');
      if (selD) {
        selD.innerHTML = '';
        var now = new Date();
        // Generuj 14 dni do przodu, przekraczając granicę miesiąca
        for (var i = 0; i <= 14; i++) {
          var dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
          var dDay   = dt.getDate();
          var dMonth = dt.getMonth();
          var dYear  = dt.getFullYear();
          var dayName = pobierzDzienTygodnia(dYear, dMonth, dDay);
          var miesiacNazwa = polishMonthsGenitive[dMonth] || '';
          var prefix = (i === 0 ? 'DZIŚ • ' : (i === 1 ? 'JUTRO • ' : ''));
          var opt = document.createElement('option');
          opt.value = dDay + '|' + dMonth + '|' + dYear;
          opt.innerText = prefix + dDay + ' ' + miesiacNazwa + ' (' + dayName + ')';
          selD.appendChild(opt);
        }
      }
      document.getElementById('modal-oglos-liturgie').style.display = 'flex';
    }

    function zamknijModalOglosLiturgie() {
      document.getElementById('modal-oglos-liturgie').style.display = 'none';
    }

    function zatwierdzOgloszenieLiturgii() {
      try {
        var selD = document.getElementById('sel-oglos-dzien');
        var inputG = document.getElementById('input-oglos-godzina');
        var selR = document.getElementById('sel-oglos-rodzaj');
        var btn = document.getElementById('btn-oglos-zatwierdz');

        if (!selD || !inputG || !selR) return;

        var dParts = selD.value.split('|');
        var dNum    = parseInt(dParts[0], 10);
        var dMonth  = dParts.length > 1 ? parseInt(dParts[1], 10) : (new Date().getMonth());
        var dYear   = dParts.length > 2 ? parseInt(dParts[2], 10) : (new Date().getFullYear());
        var targetDocKey = wyznaczKluczMiesiaca(new Date(dYear, dMonth, 1));
        var gStr = cleanTime(inputG.value) || '';
        var rodzaj = selR.value;
        var punkty = 3;

        var match = gStr.match(/^(\d{1,2}):(\d{2})$/);
        if (!match) {
          alert('Podaj prawidłową godzinę nabożeństwa w formacie GG:MM (np. 10:00 lub 11:30).');
          return;
        }

        var hNum = parseInt(match[1], 10);
        var mNum = parseInt(match[2], 10);
        if (hNum < 6 || hNum > 21 || mNum < 0 || mNum > 59) {
          alert('Podano nieprawidłową godzinę (' + gStr + '). Dopuszczalny zakres to 06:00 - 21:00.');
          return;
        }

        // Ustal źródło liturgii do sprawdzenia duplikatów
        var isCurrentMonth = (targetDocKey === pobierzAktywnyKluczMiesiaca());
        var liturgieDoSprawdzenia = [];
        try {
          liturgieDoSprawdzenia = isCurrentMonth
            ? ((tabelaMiesiacaDane && tabelaMiesiacaDane.liturgieDodatkowe) || [])
            : ((daneKolejnegoMiesiaca && daneKolejnegoMiesiaca.liturgieDodatkowe) || []);
        } catch(e2) { liturgieDoSprawdzenia = []; }

        // Blokada duplikatów:
        var isDuplicate = liturgieDoSprawdzenia.some(function(l) {
          return l.dzien === dNum && l.miesiacIdx === dMonth && cleanTime(l.godzina) === gStr && (l.rodzaj || '').toLowerCase() === rodzaj.toLowerCase();
        });
        if (isDuplicate) {
          alert('Uwaga: liturgia tego typu (' + rodzaj + ') na ten dzień i godzinę (' + gStr + ') została już wcześniej ogłoszona!');
          return;
        }

        if (rodzaj === 'Pogrzeb' && (hNum >= 17 || hNum < 8)) {
          if (!confirm('Uwaga: wybrano pogrzeb na nietypową porę: ' + gStr + '.\nPogrzeby w parafii odbywają się zwykle w godzinach przedpołudniowych (09:00 - 15:00).\n\nCzy na pewno zatwierdzić tę godzinę?')) {
            return;
          }
        }

        if (mNum % 5 !== 0) {
          if (!confirm('Uwaga: minuta ' + match[2] + ' w godzinie ' + gStr + ' jest nietypowa.\n\nCzy na pewno zatwierdzić godzinę ' + gStr + '?')) {
            return;
          }
        }

        if (btn) {
          btn.disabled = true;
          btn.innerText = '⏳ Zapisywanie...';
        }

        var liturgia = {
          id: 'LIT_' + Date.now(),
          rok: dYear,
          miesiacIdx: dMonth,
          dzien: dNum,
          godzina: gStr,
          rodzaj: rodzaj,
          punkty: punkty,
          dataTekst: selD.options[selD.selectedIndex].text,
          opis: rodzaj,
          utworzyl: (globalUser && globalUser.nazwisko) ? globalUser.nazwisko : 'Kościelny',
          zgloszeni: [],
          utworzono: new Date().toISOString()
        };

        // Dla liturgii z bieżącego miesiąca lub kolejnego aktualizuj lokalny cache
        if (isCurrentMonth) {
          if (!tabelaMiesiacaDane) tabelaMiesiacaDane = {};
          if (!tabelaMiesiacaDane.liturgieDodatkowe) tabelaMiesiacaDane.liturgieDodatkowe = [];
          tabelaMiesiacaDane.liturgieDodatkowe.push(liturgia);
          try { localStorage.setItem('min_cached_tabela', JSON.stringify(tabelaMiesiacaDane)); } catch(e) {}
        } else {
          if (!daneKolejnegoMiesiaca) daneKolejnegoMiesiaca = {};
          if (!daneKolejnegoMiesiaca.liturgieDodatkowe) daneKolejnegoMiesiaca.liturgieDodatkowe = [];
          daneKolejnegoMiesiaca.liturgieDodatkowe.push(liturgia);
          try { localStorage.setItem('min_cached_tabela_' + targetDocKey, JSON.stringify(daneKolejnegoMiesiaca)); } catch(e) {}
        }

        // 1. Zapis do bazy Firestore do właściwego dokumentu miesiąca
        if (dbFirestore) {
          dbFirestore.collection('stan_grafiku').doc(targetDocKey).get().then(function(snap) {
            var istniejace = (snap.exists && snap.data().liturgieDodatkowe) ? snap.data().liturgieDodatkowe : [];
            // Unikaj duplikatów o tym samym id
            if (!istniejace.some(function(il) { return il.id === liturgia.id; })) {
              istniejace.push(liturgia);
            }
            return dbFirestore.collection('stan_grafiku').doc(targetDocKey).set({
              liturgieDodatkowe: istniejace
            }, { merge: true });
          }).then(function() {
            pokazToast('✅ ' + rodzaj + ' (' + liturgia.dataTekst + ' godz. ' + gStr + ') zapisano w grafiku!');
            if (globalUser && globalUser.nazwisko && tabelaMiesiacaDane) {
              var s = generujStanZFirestore(globalUser.nazwisko, tabelaMiesiacaDane);
              if (s) renderujDane(s);
            }
          }).catch(function(e) {
            alert('Błąd zapisu Firestore: ' + (e.message || e));
          });
        }

        zamknijModalOglosLiturgie();
        if (btn) {
          btn.disabled = false;
          btn.innerText = 'Wyślij PUSH i ogłoś';
        }
        pokazToast('✅ Ogłoszono ' + rodzaj + ' na ' + liturgia.dataTekst + ' godz. ' + gStr + '! Zapisano w grafiku.', 6000);

        // Odśwież UI natychmiast na pulpicie i w zakrystii
        if (zakrystiaStan && zakrystiaStan.dzien && zakrystiaStan.godzina) {
          wczytajDaneDlaZakrystii(zakrystiaStan.dzien, zakrystiaStan.godzina, true);
        } else {
          wczytajDaneDlaZakrystii(null, null, true);
        }
        if (globalUser && globalUser.nazwisko && tabelaMiesiacaDane) {
          var stan = generujStanZFirestore(globalUser.nazwisko, tabelaMiesiacaDane);
          if (stan) renderujDane(stan);
        }
      } catch(err) {
        alert('BŁĄD zatwierdzOgloszenieLiturgii: ' + err.message);
        var btn2 = document.getElementById('btn-oglos-zatwierdz');
        if (btn2) { btn2.disabled = false; btn2.innerText = 'Wyślij PUSH i ogłoś'; }
      }
    }

    function usunLiturgie(litId) {
      if (!czyMaDostepDoZakrystii(globalUser ? globalUser.nazwisko : '')) {
        pokazToast('Brak uprawnień do usuwania liturgii.');
        return;
      }
      if (!confirm('Czy na pewno chcesz usunąć tę liturgię?')) return;

      var found = false;
      var targetDocKey = pobierzAktywnyKluczMiesiaca();

      if (tabelaMiesiacaDane && tabelaMiesiacaDane.liturgieDodatkowe) {
        var idxCur = tabelaMiesiacaDane.liturgieDodatkowe.findIndex(function(l) { return l.id === litId; });
        if (idxCur !== -1) {
          tabelaMiesiacaDane.liturgieDodatkowe.splice(idxCur, 1);
          found = true;
          targetDocKey = pobierzAktywnyKluczMiesiaca();
          try { localStorage.setItem('min_cached_tabela', JSON.stringify(tabelaMiesiacaDane)); } catch(e) {}
          if (dbFirestore) {
            dbFirestore.collection('stan_grafiku').doc(targetDocKey).set({
              liturgieDodatkowe: tabelaMiesiacaDane.liturgieDodatkowe
            }, { merge: true }).catch(function(e) { console.warn('Firestore usun liturgia error:', e); });
          }
        }
      }

      if (!found && daneKolejnegoMiesiaca && daneKolejnegoMiesiaca.liturgieDodatkowe) {
        var idxNext = daneKolejnegoMiesiaca.liturgieDodatkowe.findIndex(function(l) { return l.id === litId; });
        if (idxNext !== -1) {
          daneKolejnegoMiesiaca.liturgieDodatkowe.splice(idxNext, 1);
          found = true;
          var nDt = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
          targetDocKey = wyznaczKluczMiesiaca(nDt);
          try { localStorage.setItem('min_cached_tabela_' + targetDocKey, JSON.stringify(daneKolejnegoMiesiaca)); } catch(e) {}
          if (dbFirestore) {
            dbFirestore.collection('stan_grafiku').doc(targetDocKey).set({
              liturgieDodatkowe: daneKolejnegoMiesiaca.liturgieDodatkowe
            }, { merge: true }).catch(function(e) { console.warn('Firestore usun liturgia error:', e); });
          }
        }
      }

      pokazToast('Liturgia została usunięta.');
      if (zakrystiaStan && zakrystiaStan.dzien && zakrystiaStan.godzina) {
        wczytajDaneDlaZakrystii(zakrystiaStan.dzien, zakrystiaStan.godzina, true);
      } else {
        wczytajDaneDlaZakrystii(null, null, true);
      }
      if (globalUser && globalUser.nazwisko) {
        var stan = generujStanZFirestore(globalUser.nazwisko, tabelaMiesiacaDane);
        if (stan) renderujDane(stan);
      }
    }
    window.usunLiturgie = usunLiturgie;

    function przelaczZgloszenieLiturgia(litId) {
      if (!globalUser || !globalUser.nazwisko) {
        pokazToast('Musisz być zalogowany, aby się zgłosić.');
        return;
      }
      var lit = null;
      var targetDocKey = pobierzAktywnyKluczMiesiaca();
      var sourceList = null;

      if (tabelaMiesiacaDane && tabelaMiesiacaDane.liturgieDodatkowe) {
        lit = tabelaMiesiacaDane.liturgieDodatkowe.find(function(l) { return l.id === litId; });
        if (lit) {
          sourceList = tabelaMiesiacaDane.liturgieDodatkowe;
          targetDocKey = pobierzAktywnyKluczMiesiaca();
        }
      }
      if (!lit && daneKolejnegoMiesiaca && daneKolejnegoMiesiaca.liturgieDodatkowe) {
        lit = daneKolejnegoMiesiaca.liturgieDodatkowe.find(function(l) { return l.id === litId; });
        if (lit) {
          sourceList = daneKolejnegoMiesiaca.liturgieDodatkowe;
          var nDt = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
          targetDocKey = wyznaczKluczMiesiaca(nDt);
        }
      }
      if (!lit) return;

      if (!lit.zgloszeni) lit.zgloszeni = [];
      var myName = globalUser.nazwisko.trim();
      var myLower = myName.toLowerCase();
      var idx = lit.zgloszeni.findIndex(function(z) {
        var zn = (z || '').toLowerCase().trim();
        return zn === myLower || zn.indexOf(myLower) !== -1 || myLower.indexOf(zn) !== -1;
      });

      if (idx !== -1) {
        lit.zgloszeni.splice(idx, 1);
        pokazToast('Wycofano zgłoszenie ze służby.');
      } else {
        lit.zgloszeni.push(myName);
        pokazToast('Zgłoszono obecność na ' + lit.rodzaj + '! (+3 pkt po mszy)');
      }

      // 1. Zapis do Firestore (15 ms)
      if (dbFirestore) {
        dbFirestore.collection('stan_grafiku').doc(targetDocKey).set({
          liturgieDodatkowe: sourceList
        }, { merge: true }).catch(function(e) {
          console.warn('Błąd zapisu zgloszenia Firestore:', e);
        });
      }

      // 2. Odśwież widok natychmiast
      if (targetDocKey === pobierzAktywnyKluczMiesiaca()) {
        try { localStorage.setItem('min_cached_tabela', JSON.stringify(tabelaMiesiacaDane)); } catch(e) {}
      } else {
        try { localStorage.setItem('min_cached_tabela_' + targetDocKey, JSON.stringify(daneKolejnegoMiesiaca)); } catch(e) {}
      }
      var stan = generujStanZFirestore(globalUser.nazwisko, tabelaMiesiacaDane);
      if (stan) renderujDane(stan);
    }

    function przelaczOpcjeZaawansowaneZakrystii() {
      var b = document.getElementById("zakrystia-opcje-zaawansowane");
      if (b) b.style.display = (b.style.display === "none" ? "block" : "none");
    }

    function zakrystiaUstawPunktyLiturgii(nowePunkty) {
      if (!zakrystiaStan) return;
      nowePunkty = parseInt(nowePunkty, 10) || 3;
      zakrystiaStan.punktyLiturgii = nowePunkty;
      zakrystiaStan.recznieUstawionePunkty = true;

      // Zaktualizuj punkty dla wszystkich ministrantów na tej mszy (w tym służących dodatkowo!)
      if (zakrystiaStan.ministranci && zakrystiaStan.ministranci.length > 0) {
        zakrystiaStan.ministranci.forEach(function(m) {
          if (m.typ === 'ZASTEPCA') {
            // Zastępca zachowuje punkty ze swojej oferty giełdy (np. 4 pkt w tygodniu)
          } else {
            m.obecnyPkt = nowePunkty;
          }
          if (m.status === 'OBECNY') {
            m.punkty = m.obecnyPkt + (m.bylNaRozancu ? 2 : 0) - (m.karaPunkty || 0);
          }
        });
      }

      renderujTrybZakrystia();
      pokazToast('Ustawiono: +' + nowePunkty + ' pkt za tę mszę dla wszystkich');
    }

    // Bezpieczny alias wsteczny:
    function zakrystiaZmienRodzajLiturgii(rodzaj, punkty, nazwa) {
      zakrystiaUstawPunktyLiturgii(punkty);
    }

    function renderujTrybZakrystia() {
      if (zakrystiaStan) {
        zakrystiaStan.maRozaniec = false;
      }
      var curDocKey = (zakrystiaStan && zakrystiaStan.docKey) || pobierzAktywnyKluczMiesiaca();
      var isNextMDoc = (daneKolejnegoMiesiaca && typeof czyToTenSamKluczMiesiaca === 'function' && czyToTenSamKluczMiesiaca(curDocKey, daneKolejnegoMiesiaca.docId));
      var daneTabeli = isNextMDoc ? daneKolejnegoMiesiaca : (tabelaMiesiacaDane || {});
      var currentMonthIdx = (zakrystiaStan && zakrystiaStan.miesiacIdx !== undefined) ? zakrystiaStan.miesiacIdx : (daneTabeli.miesiacIdx !== undefined ? daneTabeli.miesiacIdx : (new Date()).getMonth());
      var currentYear = (zakrystiaStan && zakrystiaStan.rok) || daneTabeli.rok || (new Date()).getFullYear();
      var colIdx = (zakrystiaStan && zakrystiaStan.dzien) ? (zakrystiaStan.dzien - 1) : 0;
      var wiersze = daneTabeli.wiersze || [];

      var naglowek = document.getElementById('zakrystia-msza-naglowek');
      var podtytul = document.getElementById('zakrystia-msza-podtytul');
      var stanInfo = document.getElementById('zakrystia-stan-zapisania');
      var kontener = document.getElementById('zakrystia-lista-kontener');
      var banerZalegla = document.getElementById('zakrystia-baner-zalegla');
      var banerZaleglaData = document.getElementById('zakrystia-zalegla-data');

      // Baner zaległej obecności (gdy dzień jest z przeszłości)
      var dzisD = (new Date()).getDate();
      var dzisM = (new Date()).getMonth();
      var dzisY = (new Date()).getFullYear();
      var stanM = (zakrystiaStan.miesiacIdx !== undefined) ? zakrystiaStan.miesiacIdx : dzisM;
      var stanY = zakrystiaStan.rok || dzisY;
      var czyZalegla = (stanY < dzisY) || (stanY === dzisY && stanM < dzisM) || (stanY === dzisY && stanM === dzisM && zakrystiaStan.dzien < dzisD);
      if (banerZalegla) {
        if (czyZalegla) {
          banerZalegla.style.display = 'flex';
          if (banerZaleglaData) banerZaleglaData.innerText = zakrystiaStan.dataTekst + ' • ' + zakrystiaStan.godzina;
        } else {
          banerZalegla.style.display = 'none';
        }
      }

      // Podświetlenie aktywnej liczby punktów (+2, +3, +4, +5)
      var curPts = (zakrystiaStan && zakrystiaStan.punktyLiturgii) ? zakrystiaStan.punktyLiturgii : ((zakrystiaStan && zakrystiaStan.dzienTygodnia === 'niedziela') ? 3 : 5);
      [2, 3, 4, 5].forEach(function(p) {
        var pill = document.getElementById('pill-punkty-' + p);
        if (pill) {
          if (curPts === p) pill.classList.add('active');
          else pill.classList.remove('active');
        }
      });

      if (naglowek) naglowek.innerText = zakrystiaStan.dataTekst + ' • ' + zakrystiaStan.godzina;
      if (podtytul) {
        var typMszy = zakrystiaStan.nazwaLiturgii || ((zakrystiaStan.dzienTygodnia === 'niedziela') ? 'Msza w niedzielę' : 'Msza w tygodniu');
        var czystyTyp = typMszy.replace(/\s*\([^)]*\)/g, '').trim();
        var cntMin = (zakrystiaStan && zakrystiaStan.ministranci) ? zakrystiaStan.ministranci.length : 0;
        podtytul.innerHTML = czystyTyp + ' • Zaplanowano: ' + cntMin + ' ministrantów' + ' • <b>+' + curPts + ' pkt</b>';
      }

      if (stanInfo) {
        stanInfo.style.display = zakrystiaStan.juzZapisane ? 'block' : 'none';
      }

      if (!zakrystiaStan.ministranci || zakrystiaStan.ministranci.length === 0) {
        kontener.innerHTML = '<div style="text-align:center; padding:30px; background:#18181b; border-radius:12px; border:1px dashed #cbd5e1; color:#a1a1aa;">' +
                               '<b>Brak zaplanowanych ministrantów na tę mszę.</b><br>' +
                               '<span style="font-size:12px;">Możesz dodać ministrantów, którzy przyszli służyć, klikając poniższy przycisk:</span><br><br>' +
                               '<button onclick="otworzModalDodajMinistranta()" class="btn-secondary" style="width:auto; padding:8px 16px;">Dodaj ministranta</button>' +
                             '</div>';
        aktualizujPodsumowanieZakrystia();
        return;
      }

      var html = '';
      for (var i = 0; i < zakrystiaStan.ministranci.length; i++) {
        var m = zakrystiaStan.ministranci[i];
        var cardClass = 'zakrystia-card';
        if (m.tylkoRozaniec) cardClass += ' is-rozaniec';
        else if (m.status === 'OBECNY') cardClass += ' is-present';
        else if (m.status === 'NIEOBECNY') cardClass += ' is-absent';
        else if (m.status === 'USPRAWIEDLIWIONY') cardClass += ' is-excused';

        var isSwietoL = czyToDzienSwiateczny5Pkt(zakrystiaStan.dzien, currentMonthIdx, currentYear, daneTabeli);
        var wierszM = znajdzWierszMinistranta(wiersze, m.nazwisko);
        var juzBylSwieto = isSwietoL ? czyMinistrantBylJuzNaInnejMszyWSwieto(wierszM, colIdx, zakrystiaStan.godzina) : false;

        var czyNiedziela = (zakrystiaStan.rodzajLiturgii === 'msza_niedziela' || zakrystiaStan.dzienTygodnia === 'niedziela');
        var czyDodatkowa = (zakrystiaStan.rodzajLiturgii === 'pogrzeb' || zakrystiaStan.rodzajLiturgii === 'nabozenstwo' || zakrystiaStan.rodzajLiturgii === 'msza_roza' || zakrystiaStan.czyLiturgiaDodatkowa);
        var ptsDlaObecnego = isSwietoL ? (juzBylSwieto ? 2 : 5) : (zakrystiaStan.punktyLiturgii || 3);
        if (m.typ === 'ZASTEPCA') {
          ptsDlaObecnego = (typeof m.obecnyPkt === 'number') ? m.obecnyPkt : 4;
        } else if (m.typ === 'DODATKOWY') {
          if (zakrystiaStan.recznieUstawionePunkty) {
            ptsDlaObecnego = zakrystiaStan.punktyLiturgii || (isSwietoL ? (juzBylSwieto ? 2 : 5) : 3);
          } else if (isSwietoL) {
            ptsDlaObecnego = juzBylSwieto ? 2 : 5;
          } else if (typeof m.obecnyPkt === 'number') {
            ptsDlaObecnego = m.obecnyPkt;
          } else if (czyDodatkowa) {
            ptsDlaObecnego = zakrystiaStan.punktyLiturgii || 3;
          } else {
            ptsDlaObecnego = czyNiedziela ? 1 : 2;
          }
        } else {
          ptsDlaObecnego = (typeof m.obecnyPkt === 'number') ? m.obecnyPkt : (isSwietoL ? (juzBylSwieto ? 2 : 5) : (zakrystiaStan.punktyLiturgii || 3));
        }

        var badgeHtml = '';
        if (m.typ === 'ZASTEPCA') {
          badgeHtml = '<span style="background:rgba(59,130,246,0.15); color:#60a5fa; border:1px solid rgba(59,130,246,0.3); font-size:11px; font-weight:600; padding:2px 8px; border-radius:4px; display:inline-block; margin-top:2px;">Zastępuje: ' + (m.zastepuje || 'Wolny dyżur') + ' (+4 pkt)</span>';
        } else if (m.typ === 'DODATKOWY') {
          badgeHtml = '<span style="background:rgba(168,85,247,0.15); color:#c084fc; border:1px solid rgba(168,85,247,0.3); font-size:11px; font-weight:600; padding:2px 8px; border-radius:4px; display:inline-block; margin-top:2px;">Dodatkowa służba (+' + ptsDlaObecnego + ' pkt)</span>';
        } else if (m.domyslnyStatus === 'ODDANY') {
          badgeHtml = '<span style="background:rgba(168,85,247,0.15); color:#c084fc; border:1px solid rgba(168,85,247,0.3); font-size:11px; font-weight:600; padding:2px 8px; border-radius:4px; display:inline-block; margin-top:2px;">' + (m.opisGieldy || 'Oddał dyżur na giełdę') + '</span>';
        } else if (m.domyslnyStatus === 'USPRAWIEDLIWIONY') {
          badgeHtml = '<span style="background:rgba(251,191,36,0.15); color:#fbbf24; border:1px solid rgba(251,191,36,0.3); font-size:11px; font-weight:600; padding:2px 8px; border-radius:4px; display:inline-block; margin-top:2px;">' + (m.opisGieldy || 'Zgłoszona nieobecność (0 pkt)') + '</span>';
        }

        var btnObecnyClass = 'btn-status-toggle status-obecny' + (m.status === 'OBECNY' ? ' active' : '');
        var btnNieobecnyClass = 'btn-status-toggle status-nieobecny' + (m.status === 'NIEOBECNY' ? ' active' : '');
        var btnUsprawClass = 'btn-status-toggle status-uspraw' + (m.status === 'USPRAWIEDLIWIONY' ? ' active' : '');
        var btnOddanyClass = 'btn-status-toggle status-uspraw' + (m.status === 'ODDANY' ? ' active' : '');
        var pktLabel = '+' + ptsDlaObecnego + ' pkt';

        var badgeColor = '#10b981';
        var badgeText = pktLabel;
        if (m.tylkoRozaniec) {
          badgeColor = '#d8b4fe';
          badgeText = '+2 pkt (Różaniec)';
        } else if (m.status === 'OBECNY') {
          var kPkt = parseInt(m.karaPunkty, 10) || 0;
          var sumaPkt = ptsDlaObecnego;
          if (m.bylNaRozancu) sumaPkt += 2;
          sumaPkt -= kPkt;

          if (kPkt > 0) {
            badgeColor = sumaPkt > 0 ? '#f59e0b' : '#ef4444';
            var sign = sumaPkt > 0 ? '+' : '';
            badgeText = sign + sumaPkt + ' pkt (kara -' + kPkt + ')';
          } else if (m.bylNaRozancu) {
            badgeColor = '#c084fc';
            badgeText = '+' + (ptsDlaObecnego + 2) + ' pkt (msza+różaniec)';
          } else {
            badgeColor = '#10b981';
            badgeText = '+' + ptsDlaObecnego + ' pkt';
          }
        } else if (m.status === 'NIEOBECNY') {
          badgeColor = '#ef4444';
          badgeText = '-5 pkt';
        } else if (m.status === 'USPRAWIEDLIWIONY') {
          badgeColor = '#f59e0b';
          badgeText = '0 pkt';
        } else if (m.status === 'ODDANY') {
          badgeColor = '#8b5cf6';
          badgeText = '+1 pkt';
        }

        var buttonsHtml = '';
        if (m.typ === 'DODATKOWY') {
          buttonsHtml = '<button type="button" class="' + btnObecnyClass + '" style="flex:1.3;" onclick="zakrystiaUstawStatus(' + i + ', \'OBECNY\')">Obecny (+' + ptsDlaObecnego + ' pkt)</button>' +
                        '<button type="button" class="btn-status-toggle status-nieobecny" style="flex:1;" onclick="zakrystiaUsunDodatkowego(' + i + ')">Usuń (Cofnij pkt)</button>';
        } else if (m.domyslnyStatus === 'ODDANY') {
          var isOddanyActive = (m.status === 'ODDANY');
          var isObecnyActive = (m.status === 'OBECNY');
          buttonsHtml = '<button type="button" class="btn-status-toggle status-uspraw' + (isOddanyActive ? ' active' : '') + '" style="flex:1.2;" onclick="zakrystiaUstawStatus(' + i + ', \'ODDANY\')">Oddał dyżur (' + (m.zastepuje || 'Zastępca') + ')</button>' +
                        '<button type="button" class="btn-status-toggle status-obecny' + (isObecnyActive ? ' active' : '') + '" style="flex:1;" onclick="zakrystiaUstawStatus(' + i + ', \'OBECNY\')">Jednak przyszedł (' + pktLabel + ')</button>';
        } else if (m.domyslnyStatus === 'USPRAWIEDLIWIONY') {
          var isUspActive = (m.status === 'USPRAWIEDLIWIONY');
          var isObecnyActive = (m.status === 'OBECNY');
          buttonsHtml = '<button type="button" class="btn-status-toggle status-uspraw' + (isUspActive ? ' active' : '') + '" style="flex:1.2;" onclick="zakrystiaUstawStatus(' + i + ', \'USPRAWIEDLIWIONY\')">Zgłoszona nieobecność (0 pkt)</button>' +
                        '<button type="button" class="btn-status-toggle status-obecny' + (isObecnyActive ? ' active' : '') + '" style="flex:1;" onclick="zakrystiaUstawStatus(' + i + ', \'OBECNY\')">Jednak przyszedł (' + pktLabel + ')</button>';
        } else if (m.typ === 'ZASTEPCA') {
          var isZastObecny = (m.status === 'OBECNY');
          var isZastNieobecny = (m.status === 'NIEOBECNY');
          buttonsHtml = '<button type="button" class="btn-status-toggle status-obecny' + (isZastObecny ? ' active' : '') + '" style="flex:1;" onclick="zakrystiaUstawStatus(' + i + ', \'OBECNY\')">Zastępca obecny (+4 pkt)</button>' +
                        '<button type="button" class="btn-status-toggle status-nieobecny' + (isZastNieobecny ? ' active' : '') + '" style="flex:1;" onclick="zakrystiaUstawStatus(' + i + ', \'NIEOBECNY\')">Nie przyszedł (0 pkt)</button>';
        } else {
          var isNabozenstwo = (zakrystiaStan && (zakrystiaStan.rodzajLiturgii === 'nabozenstwo' || zakrystiaStan.czyLiturgiaDodatkowa));
          var nieobecnyBtnText = isNabozenstwo ? 'Nieobecny (0 pkt)' : 'Nieobecny (-5 pkt)';
          buttonsHtml = '<button type="button" class="' + btnObecnyClass + '" style="flex:1;" onclick="zakrystiaUstawStatus(' + i + ', \'OBECNY\')">Obecny (' + pktLabel + ')</button>' +
                        '<button type="button" class="' + btnNieobecnyClass + '" style="flex:1;" onclick="zakrystiaUstawStatus(' + i + ', \'NIEOBECNY\')">' + nieobecnyBtnText + '</button>';
        }

        var stopienBadge = '';
        if (m.stopien) {
          var stBg = '#27272a';
          var stColor = '#a1a1aa';
          if (m.stopien === 'Animator') { stBg = 'rgba(251,191,36,0.15)'; stColor = '#fbbf24'; }
          else if (m.stopien === 'Lektor') { stBg = 'rgba(99,102,241,0.15)'; stColor = '#a5b4fc'; }
          else if (m.stopien === 'Starszy ministrant') { stBg = 'rgba(16,185,129,0.15)'; stColor = '#34d399'; }
          else if (m.stopien === 'Kandydat') { stBg = 'rgba(239,68,68,0.15)'; stColor = '#f87171'; }
          stopienBadge = ' <span style="background:' + stBg + '; color:' + stColor + '; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; margin-left:4px; vertical-align:middle;">' + m.stopien + '</span>';
        }

        var karaBtnHtml = '';
        if (m.status === 'OBECNY') {
          var kPkt = parseInt(m.karaPunkty, 10) || 0;
          if (kPkt > 0) {
            karaBtnHtml = '<div style="margin-top:6px; display:flex; align-items:center; justify-content:space-between; background:rgba(239, 68, 68, 0.12); border:1px solid rgba(239, 68, 68, 0.35); border-radius:6px; padding:6px 10px; gap:8px;">' +
                            '<div style="font-size:12px; color:#fca5a5; font-weight:700; display:flex; align-items:center; gap:5px;">' +
                              '<span>⚠️ Punkty karne: <b style="color:#ef4444;">-' + kPkt + ' pkt</b></span>' +
                            '</div>' +
                            '<div style="display:flex; gap:6px; flex-shrink:0;">' +
                              '<button type="button" onclick="zakrystiaOtworzKare(' + i + ')" style="background:#27272a; border:1px solid #3f3f46; color:#fafafa; font-size:11px; padding:4px 8px; border-radius:4px; cursor:pointer;">Zmień</button>' +
                              '<button type="button" onclick="zakrystiaUsunKare(' + i + ')" style="background:#dc2626; border:none; color:#ffffff; font-size:11px; padding:4px 8px; border-radius:4px; cursor:pointer;" title="Usuń karę">✕ Usuń</button>' +
                            '</div>' +
                          '</div>';
          } else {
            karaBtnHtml = '<div style="margin-top:6px;">' +
                            '<button type="button" onclick="zakrystiaOtworzKare(' + i + ')" style="display:inline-flex; align-items:center; gap:5px; background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.22); color:#fca5a5; font-size:11px; font-weight:600; padding:4px 10px; border-radius:6px; cursor:pointer; transition:all 0.15s ease;">' +
                              '⚠️ Punkty karne (-2, -3, -5 pkt)' +
                            '</button>' +
                          '</div>';
          }
        }

        html += '<div class="' + cardClass + '" id="z-card-' + i + '">' +
                  '<div style="display:flex; justify-content:space-between; align-items:flex-start;">' +
                    '<div>' +
                      '<div style="font-size:16px; font-weight:700; color:#fafafa;">' + m.nazwisko + stopienBadge + '</div>' +
                      '<div style="font-size:12px; color:#a1a1aa; margin-top:1px;">' + (m.grupa || 'Ministrant') + '</div>' +
                      badgeHtml +
                    '</div>' +
                    '<span id="z-badge-pts-' + i + '" style="font-weight:bold; font-size:13px; color:' + badgeColor + ';">' +
                      badgeText +
                    '</span>' +
                  '</div>' +
                  '<div class="zakrystia-btn-group">' +
                    buttonsHtml +
                  '</div>' +
                  karaBtnHtml +
                '</div>';
      }

      kontener.innerHTML = html;
      aktualizujPodsumowanieZakrystia();
    }

    function zakrystiaUstawStatus(index, nowyStatus) {
      if (!zakrystiaStan || !zakrystiaStan.ministranci || !zakrystiaStan.ministranci[index]) return;
      var m = zakrystiaStan.ministranci[index];
      m.status = nowyStatus;
      if (nowyStatus !== 'OBECNY') {
        m.bylNaRozancu = false;
        m.tylkoRozaniec = false;
      }
      renderujTrybZakrystia();
    }



    function zakrystiaUsunDodatkowego(index) {
      if (!zakrystiaStan || !zakrystiaStan.ministranci || !zakrystiaStan.ministranci[index]) return;
      var m = zakrystiaStan.ministranci[index];
      var name = m.nazwisko;
      if (!confirm('Usunąć ' + name + ' z tej mszy?\n(Punkty zostaną cofnięte po kliknięciu "Zapisz")')) return;
      if (!zakrystiaStan.usunieci) zakrystiaStan.usunieci = [];
      zakrystiaStan.usunieci.push(m);
      zakrystiaStan.ministranci.splice(index, 1);
      renderujTrybZakrystia();
      pokazToast('Usunięto: ' + name + ' — kliknij ZAPISZ ZMIANY, aby zatwierdzić!');
    }

    function zakrystiaZaznaczWszystkichObecnych() {
      if (!zakrystiaStan || !zakrystiaStan.ministranci) return;
      for (var i = 0; i < zakrystiaStan.ministranci.length; i++) {
        var m = zakrystiaStan.ministranci[i];
        if (m.domyslnyStatus !== 'USPRAWIEDLIWIONY' && m.domyslnyStatus !== 'ODDANY') {
          m.status = 'OBECNY';
        }
      }
      renderujTrybZakrystia();
      pokazToast('Zaznaczono obecnych ministrantów');
    }

    function aktualizujPodsumowanieZakrystia() {
      var el = document.getElementById('zakrystia-podsumowanie-tekst');
      var btnZapisz = document.getElementById('btn-zapisz-zakrystia');
      var usunieciCount = (zakrystiaStan && zakrystiaStan.usunieci) ? zakrystiaStan.usunieci.length : 0;
      var juzZapisane = (zakrystiaStan && zakrystiaStan.juzZapisane);

      if (!zakrystiaStan || !zakrystiaStan.ministranci || zakrystiaStan.ministranci.length === 0) {
        if (el) el.innerText = '0 obecnych' + (usunieciCount > 0 ? ' (' + usunieciCount + ' usuniętych)' : '');
        if (btnZapisz) {
          if (juzZapisane || usunieciCount > 0) {
            btnZapisz.disabled = false;
            btnZapisz.style.opacity = '1';
            btnZapisz.style.cursor = 'pointer';
            btnZapisz.style.background = '#dc2626';
            btnZapisz.innerText = 'ZAPISZ ZMIANY (Wyczyść / 0 obecnych)';
          } else {
            btnZapisz.disabled = true;
            btnZapisz.innerText = 'Brak ministrantów do zapisania';
            btnZapisz.style.opacity = '0.6';
            btnZapisz.style.cursor = 'not-allowed';
            btnZapisz.style.background = '#10b981';
          }
        }
        return;
      }
      var ob = 0, nieob = 0, usp = 0, roz = 0;
      zakrystiaStan.ministranci.forEach(function(m) {
        if (m.status === 'OBECNY') ob++;
        else if (m.status === 'NIEOBECNY') nieob++;
        else if (m.status === 'USPRAWIEDLIWIONY') usp++;
      });
      if (el) el.innerText = ob + ' obecnych, ' + nieob + ' nieobecnych' + (usp > 0 ? ', ' + usp + ' uspraw.' : '');
      if (btnZapisz) {
        btnZapisz.disabled = false;
        btnZapisz.style.opacity = '1';
        btnZapisz.style.cursor = 'pointer';
        var sumaOsob = ob + nieob + usp;
        btnZapisz.innerText = 'ZAPISZ OBECNOŚĆ (' + sumaOsob + ' ministrantów' + (usunieciCount > 0 ? ' • ' + usunieciCount + ' usunięto' : '') + ')';
      }
    }

    function aktualizujGodzinyZakrystiiDlaDnia(d, wybranaGodz, optM, optR) {
      var selG = document.getElementById('sel-zakrystia-godzina');
      if (!selG) return;
      var m = (optM !== undefined && optM !== null) ? optM : ((zakrystiaStan && zakrystiaStan.miesiacIdx !== undefined) ? zakrystiaStan.miesiacIdx : (new Date()).getMonth());
      var r = optR || (zakrystiaStan && zakrystiaStan.rok) || (new Date()).getFullYear();
      var dt = new Date(r, m, d);
      var dow = dt.getDay();
      var optHtml = '';

      var hD = null;
      if (tabelaMiesiacaDane && tabelaMiesiacaDane.harmonogramDni && tabelaMiesiacaDane.harmonogramDni[d]) {
        hD = tabelaMiesiacaDane.harmonogramDni[d];
      } else if (daneKolejnegoMiesiaca && daneKolejnegoMiesiaca.harmonogramDni && daneKolejnegoMiesiaca.harmonogramDni[d]) {
        hD = daneKolejnegoMiesiaca.harmonogramDni[d];
      }

      if (hD && ((hD.msze && hD.msze.length > 0) || (hD.nabozenstwa && hD.nabozenstwa.length > 0))) {
        if (hD.msze && hD.msze.length > 0) {
          hD.msze.forEach(function(mItem) {
            var gC = cleanTime(mItem.godzina);
            var mTyp = mItem.typ || (dow === 0 ? 'msza_niedziela' : 'msza_tydzien');
            optHtml += '<option value="' + gC + '" data-rodzaj="' + mTyp + '" data-punkty="' + mItem.punkty + '" data-nazwa="' + mItem.nazwa + '">' + gC + ' (' + mItem.nazwa + ' - ' + mItem.punkty + ' pkt)</option>';
          });
        }
        if (hD.nabozenstwa && hD.nabozenstwa.length > 0) {
          hD.nabozenstwa.forEach(function(nItem) {
            var gC = cleanTime(nItem.godzina);
            if (optHtml.indexOf('value="' + gC + '"') === -1) {
              optHtml += '<option value="' + gC + '" data-rodzaj="nabozenstwo" data-punkty="' + nItem.punkty + '" data-nazwa="' + nItem.nazwa + '">' + gC + ' (' + nItem.nazwa + ' - ' + nItem.punkty + ' pkt)</option>';
            }
          });
        }
      } else {
        if (dow === 0) {
          optHtml += '<option value="08:30" data-rodzaj="msza_niedziela" data-punkty="3" data-nazwa="Msza św. niedzielna">08:30 (Msza św. niedzielna - 3 pkt)</option>';
          optHtml += '<option value="10:00" data-rodzaj="msza_niedziela" data-punkty="3" data-nazwa="Msza św. niedzielna">10:00 (Msza św. niedzielna - 3 pkt)</option>';
          optHtml += '<option value="11:30" data-rodzaj="msza_niedziela" data-punkty="3" data-nazwa="Msza św. niedzielna">11:30 (Msza św. niedzielna - 3 pkt)</option>';
        } else if (dow === 6) {
          if (d <= 7) {
            optHtml += '<option value="08:00" data-rodzaj="msza_roza" data-punkty="4" data-nazwa="Msza Róży Różańcowej">08:00 (Msza Róży Różańcowej - 4 pkt)</option>';
          }
          optHtml += '<option value="17:00" data-rodzaj="msza_niedziela" data-punkty="3" data-nazwa="Msza św. - Wigilia niedzielna">17:00 (Msza św. - Wigilia niedzielna - 3 pkt)</option>';
        } else if (dow === 4) {
          optHtml += '<option value="17:00" data-rodzaj="msza_szkolna" data-punkty="5" data-nazwa="Msza św. szkolna">17:00 (Msza św. szkolna - 5 pkt)</option>';
        } else {
          optHtml += '<option value="18:00" data-rodzaj="msza_tydzien" data-punkty="5" data-nazwa="Msza św.">18:00 (Msza św. - 5 pkt)</option>';
        }
      }

      // W październiku (m === 9) nabożeństwo różańcowe jest każdego dnia:
      if (m === 9) {
        if (dow === 4) {
          if (optHtml.indexOf('17:45') === -1) {
            optHtml += '<option value="17:45" data-rodzaj="nabozenstwo" data-punkty="2" data-nazwa="Nabożeństwo Różańcowe (po mszy szkolnej)">17:45 (Nabożeństwo Różańcowe (po mszy szkolnej) - 2 pkt)</option>';
          }
        } else if (dow === 0) {
          if (optHtml.indexOf('15:00') === -1) {
            optHtml += '<option value="15:00" data-rodzaj="nabozenstwo" data-punkty="3" data-nazwa="Nabożeństwo Różańcowe">15:00 (Nabożeństwo Różańcowe - 3 pkt)</option>';
          }
        } else if (dow === 6) {
          if (optHtml.indexOf('16:15') === -1) {
            optHtml += '<option value="16:15" data-rodzaj="nabozenstwo" data-punkty="2" data-nazwa="Nabożeństwo Różańcowe">16:15 (Nabożeństwo Różańcowe - 2 pkt)</option>';
          }
        } else {
          if (optHtml.indexOf('17:15') === -1) {
            optHtml += '<option value="17:15" data-rodzaj="nabozenstwo" data-punkty="2" data-nazwa="Nabożeństwo Różańcowe">17:15 (Nabożeństwo Różańcowe - 2 pkt)</option>';
          }
        }
      }

      var allLits = [];
      if (tabelaMiesiacaDane && tabelaMiesiacaDane.liturgieDodatkowe) {
        allLits = allLits.concat(tabelaMiesiacaDane.liturgieDodatkowe);
      }
      if (daneKolejnegoMiesiaca && daneKolejnegoMiesiaca.liturgieDodatkowe) {
        allLits = allLits.concat(daneKolejnegoMiesiaca.liturgieDodatkowe);
      }
      var matchingLits = allLits.filter(function(l) {
        var lm = (l.miesiacIdx !== undefined) ? l.miesiacIdx : m;
        return l.dzien === d && lm === m;
      });
      matchingLits.forEach(function(l) {
        var gClean = cleanTime(l.godzina);
        if (gClean && optHtml.indexOf('value="' + gClean + '"') === -1) {
          var isPog = (l.rodzaj || '').toLowerCase().indexOf('pogrzeb') !== -1;
          var lTyp = isPog ? 'pogrzeb' : 'nabozenstwo';
          var lPkt = l.punkty || (isPog ? 3 : 2);
          optHtml += '<option value="' + gClean + '" data-rodzaj="' + lTyp + '" data-punkty="' + lPkt + '" data-nazwa="' + l.rodzaj + '">' + gClean + ' (' + l.rodzaj + ' - ' + lPkt + ' pkt)</option>';
        }
      });

      selG.innerHTML = optHtml;
      if (wybranaGodz) {
        var gCleanW = cleanTime(wybranaGodz);
        var foundIdx = -1;
        for (var oi = 0; oi < selG.options.length; oi++) {
          if (cleanTime(selG.options[oi].value) === gCleanW) {
            foundIdx = oi;
            break;
          }
        }
        if (foundIdx !== -1) {
          selG.selectedIndex = foundIdx;
        } else if (selG.options.length > 0) {
          selG.selectedIndex = 0;
        }
      }
    }

    function otworzModalZmienMsze() {
      var selD = document.getElementById('sel-zakrystia-dzien');
      var selG = document.getElementById('sel-zakrystia-godzina');
      if (!selD || !selG) return;
      var curStan = zakrystiaStan || {};
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
      }

      selD.onchange = function() {
        var parts = this.value.split('|');
        var dVal = parseInt(parts[0], 10);
        var mVal = parts.length > 1 ? parseInt(parts[1], 10) : curM;
        var rVal = parts.length > 2 ? parseInt(parts[2], 10) : curR;
        aktualizujGodzinyZakrystiiDlaDnia(dVal, null, mVal, rVal);
      };

      var curParts = (selD.value || '').split('|');
      var selDNum = parseInt(curParts[0], 10) || curStan.dzien || 1;
      var selMNum = curParts.length > 1 ? parseInt(curParts[1], 10) : curM;
      var selRNum = curParts.length > 2 ? parseInt(curParts[2], 10) : curR;
      aktualizujGodzinyZakrystiiDlaDnia(selDNum, curStan.godzina, selMNum, selRNum);
      document.getElementById('modal-zmien-msze').style.display = 'flex';
    }

    function zamknijModalZmienMsze() {
      document.getElementById('modal-zmien-msze').style.display = 'none';
    }

    function zatwierdzZmianeMszyZakrystia() {
      var selVal = document.getElementById('sel-zakrystia-dzien').value;
      var parts = selVal.split('|');
      var d = parseInt(parts[0], 10);
      var m = parts.length > 1 ? parseInt(parts[1], 10) : ((zakrystiaStan && zakrystiaStan.miesiacIdx !== undefined) ? zakrystiaStan.miesiacIdx : (new Date()).getMonth());
      var r = parts.length > 2 ? parseInt(parts[2], 10) : ((zakrystiaStan && zakrystiaStan.rok) || (new Date()).getFullYear());
      var selGEl = document.getElementById('sel-zakrystia-godzina');
      var selOpt = selGEl ? selGEl.options[selGEl.selectedIndex] : null;
      var g = selOpt ? selOpt.value.split(' ')[0] : '18:00';
      var optRodzaj = selOpt ? selOpt.getAttribute('data-rodzaj') : null;
      var optPunkty = selOpt ? parseInt(selOpt.getAttribute('data-punkty'), 10) : null;
      var optNazwa = selOpt ? selOpt.getAttribute('data-nazwa') : null;
      var docKey = wyznaczKluczMiesiaca(new Date(r, m, 1));
      zamknijModalZmienMsze();
      otworzTrybZakrystia(d, g, docKey, optRodzaj, optPunkty, optNazwa);
    }

    // =============================================================
    // RĘCZNE PRZENIESIENIE DYŻURU WEEKENDOWEGO (ZAKRYSTIA)
    // Np. kościelny umawia się z ministrantem, że zamiast 11:30 służy o 10:00.
    // Zapis: zamianyNiedziele[] z typ:'RECZNA' — nadpisuje grupę i zamiany 1:1 na dany weekend.
    // =============================================================
    var przeniesienieDocData = null;
    var przeniesienieDocKey = null;

    function przeniesienieKlucze() {
      var st = zakrystiaStan || {};
      var r = st.rok || (new Date()).getFullYear();
      var m = (st.miesiacIdx !== undefined) ? st.miesiacIdx : (new Date()).getMonth();
      var key = wyznaczKluczMiesiaca(new Date(r, m, 1));
      var keys = [key];
      var alt = (typeof wyznaczWariantKluczaMiesiaca === 'function') ? wyznaczWariantKluczaMiesiaca(key) : null;
      if (alt && alt !== key) keys.push(alt);
      return { key: key, keys: keys, rok: r, miesiacIdx: m };
    }

    async function otworzModalPrzeniesDyzur() {
      var modal = document.getElementById('modal-przenies-dyzur');
      if (!modal || !dbFirestore) return;
      var k = przeniesienieKlucze();
      przeniesienieDocKey = k.key;
      modal.style.display = 'flex';
      document.getElementById('przenies-lista').innerHTML = '<div style="color:#a1a1aa; font-size:12px;">Ładowanie...</div>';
      try {
        var snap = await dbFirestore.collection('stan_grafiku').doc(k.key).get();
        if (!snap.exists && k.keys[1]) snap = await dbFirestore.collection('stan_grafiku').doc(k.keys[1]).get();
        przeniesienieDocData = snap.exists ? snap.data() : (tabelaMiesiacaDane || {});
      } catch (e) {
        przeniesienieDocData = tabelaMiesiacaDane || {};
      }
      var data = przeniesienieDocData;
      var rok = data.rok || k.rok;
      var mIdx = (data.miesiacIdx !== undefined) ? data.miesiacIdx : k.miesiacIdx;

      // Ministranci
      var selM = document.getElementById('przenies-ministrant');
      var nazwiska = (data.wiersze || []).map(function(w) { return w && w.nazwisko; }).filter(function(n) {
        if (!n) return false;
        var l = n.toLowerCase();
        return l.indexOf('kościelny') === -1 && l.indexOf('koscielny') === -1;
      }).sort(function(a, b) { return a.localeCompare(b, 'pl'); });
      selM.innerHTML = nazwiska.map(function(n) { return '<option value="' + n + '">' + n + '</option>'; }).join('');

      // Weekendy (niedziele miesiąca) — domyślnie najbliższy
      var selW = document.getElementById('przenies-weekend');
      var dni = new Date(rok, mIdx + 1, 0).getDate();
      var dzis = new Date();
      var html = '', domyslny = null;
      for (var d = 1; d <= dni; d++) {
        if (new Date(rok, mIdx, d).getDay() !== 0) continue;
        var sobLabel = d > 1 ? ('sob. ' + (d - 1) + ' / ') : '';
        html += '<option value="' + d + '">' + sobLabel + 'ndz. ' + d + ' ' + (polishMonthsGenitive[mIdx] || '') + '</option>';
        if (domyslny === null && new Date(rok, mIdx, d, 23, 59) >= dzis) domyslny = d;
      }
      selW.innerHTML = html;
      if (domyslny !== null) selW.value = String(domyslny);

      selM.onchange = przeniesieniePokazObecna;
      selW.onchange = przeniesieniePokazObecna;
      przeniesieniePokazObecna();
      przeniesienieRenderujListe();
    }

    function przeniesieniePokazObecna() {
      var info = document.getElementById('przenies-obecna');
      var data = przeniesienieDocData || {};
      var nazw = document.getElementById('przenies-ministrant').value;
      var dSun = parseInt(document.getElementById('przenies-weekend').value, 10);
      var w = (data.wiersze || []).find(function(x) { return czyToSamoNazwisko(x.nazwisko, nazw); });
      if (!w || !dSun) { info.innerText = ''; return; }
      var ef = wyznaczEfektywnaGodzineWeekendowaDlaMinistranta(w, dSun, 0, data);
      var g = ef.godzina === '17:00' ? 'sobota 17:00' : ('niedziela ' + ef.godzina);
      info.innerHTML = 'Obecnie w ten weekend: <b style="color:#fafafa;">' + g + '</b>' + (ef.zamiana ? ' <span style="color:#a1a1aa;">(' + (ef.opis || ('zamiana z ' + ef.partner)) + ')</span>' : '');
    }

    function przeniesienieRenderujListe() {
      var box = document.getElementById('przenies-lista');
      var lista = ((przeniesienieDocData || {}).zamianyNiedziele || []).filter(function(z) {
        return z && z.typ === 'RECZNA' && z.status !== 'ANULOWANA';
      });
      if (!lista.length) {
        box.innerHTML = '<div style="color:#71717a; font-size:12px;">Brak ręcznych przeniesień w tym miesiącu.</div>';
        return;
      }
      box.innerHTML = lista.map(function(z) {
        var g = z.godzina === '17:00' ? 'sob. ' + (z.dzien - 1) + ' 17:00' : 'ndz. ' + z.dzien + ' ' + z.godzina;
        return '<div style="display:flex; justify-content:space-between; align-items:center; gap:8px; padding:6px 0; border-bottom:1px solid #27272a; font-size:12px; color:#e4e4e7;">' +
                 '<span><b>' + z.ministrant + '</b> → ' + g + (z.godzinaPoprzednia ? ' <span style="color:#71717a;">(zamiast ' + z.godzinaPoprzednia + ')</span>' : '') + '</span>' +
                 '<button type="button" onclick="usunPrzeniesienieDyzuru(\'' + z.id + '\')" class="btn-secondary" style="width:auto; padding:3px 8px; margin:0; font-size:11px;">Usuń</button>' +
               '</div>';
      }).join('');
    }

    function zamknijModalPrzeniesDyzur() {
      var m = document.getElementById('modal-przenies-dyzur');
      if (m) m.style.display = 'none';
    }

    async function zapiszPrzeniesienieWszedzie(modyfikuj) {
      var k = przeniesienieKlucze();
      for (var i = 0; i < k.keys.length; i++) {
        var ref = dbFirestore.collection('stan_grafiku').doc(k.keys[i]);
        await dbFirestore.runTransaction(async function(tx) {
          var s = await tx.get(ref);
          if (!s.exists) return;
          var lista = modyfikuj((s.data().zamianyNiedziele || []).slice());
          tx.update(ref, { zamianyNiedziele: lista, zaktualizowano: firebase.firestore.FieldValue.serverTimestamp() });
        });
      }
    }

    async function zatwierdzPrzeniesienieDyzuru() {
      var data = przeniesienieDocData || {};
      var nazw = document.getElementById('przenies-ministrant').value;
      var dSun = parseInt(document.getElementById('przenies-weekend').value, 10);
      var nowaG = document.getElementById('przenies-godzina').value;
      var w = (data.wiersze || []).find(function(x) { return czyToSamoNazwisko(x.nazwisko, nazw); });
      if (!w || !dSun || !nowaG) { alert('Wybierz ministranta, weekend i godzinę.'); return; }
      var ef = wyznaczEfektywnaGodzineWeekendowaDlaMinistranta(w, dSun, 0, data);
      if (ef.godzina === nowaG) { alert(nazw + ' już ma dyżur o tej godzinie.'); return; }

      var wpis = {
        id: 'zr_' + dSun + '_' + Date.now(),
        typ: 'RECZNA',
        dzien: dSun,
        ministrant: w.nazwisko,
        godzinaPoprzednia: ef.godzina,
        godzina: nowaG,
        status: 'ZAAKCEPTOWANA',
        utworzonoPrzez: (globalUser && globalUser.nazwisko) || 'Zakrystia',
        utworzono: Date.now()
      };
      var btn = document.getElementById('btn-przenies-zapisz');
      btn.disabled = true;
      try {
        await zapiszPrzeniesienieWszedzie(function(lista) {
          // jedno aktywne przeniesienie na osobę i weekend
          lista = lista.filter(function(z) { return !(z && z.typ === 'RECZNA' && z.dzien === dSun && czyToSamoNazwisko(z.ministrant, w.nazwisko)); });
          lista.push(wpis);
          return lista;
        });
        data.zamianyNiedziele = ((data.zamianyNiedziele || []).filter(function(z) {
          return !(z && z.typ === 'RECZNA' && z.dzien === dSun && czyToSamoNazwisko(z.ministrant, w.nazwisko));
        })).concat([wpis]);
        if (tabelaMiesiacaDane && (tabelaMiesiacaDane.miesiacIdx === data.miesiacIdx)) tabelaMiesiacaDane.zamianyNiedziele = data.zamianyNiedziele;
        pokazToast('Przeniesiono: ' + w.nazwisko + ' → ' + (nowaG === '17:00' ? 'sobota 17:00' : 'niedziela ' + nowaG));
        przeniesieniePokazObecna();
        przeniesienieRenderujListe();
        if (typeof odswiezZakrystie === 'function') odswiezZakrystie();
      } catch (e) {
        alert('Błąd zapisu: ' + (e.message || e));
      }
      btn.disabled = false;
    }

    async function usunPrzeniesienieDyzuru(id) {
      if (!confirm('Usunąć to przeniesienie? Ministrant wróci do swojej poprzedniej godziny.')) return;
      try {
        await zapiszPrzeniesienieWszedzie(function(lista) { return lista.filter(function(z) { return !(z && z.id === id); }); });
        var data = przeniesienieDocData || {};
        data.zamianyNiedziele = (data.zamianyNiedziele || []).filter(function(z) { return !(z && z.id === id); });
        if (tabelaMiesiacaDane && (tabelaMiesiacaDane.miesiacIdx === data.miesiacIdx)) tabelaMiesiacaDane.zamianyNiedziele = data.zamianyNiedziele;
        przeniesieniePokazObecna();
        przeniesienieRenderujListe();
        if (typeof odswiezZakrystie === 'function') odswiezZakrystie();
      } catch (e) {
        alert('Błąd: ' + (e.message || e));
      }
    }
    window.otworzModalPrzeniesDyzur = otworzModalPrzeniesDyzur;
    window.zamknijModalPrzeniesDyzur = zamknijModalPrzeniesDyzur;
    window.zatwierdzPrzeniesienieDyzuru = zatwierdzPrzeniesienieDyzuru;
    window.usunPrzeniesienieDyzuru = usunPrzeniesienieDyzuru;

    function otworzModalDodajMinistranta() {
      var kontenerListy = document.getElementById('lista-dodatkowy-ministranci');
      var searchInput = document.getElementById('szukaj-dodatkowy-ministrant');
      var btnZatwierdz = document.getElementById('btn-zatwierdz-dodatkowych');
      var licznikEl = document.getElementById('dodatkowy-licznik-dostepnych');
      if (!kontenerListy) return;

      if (searchInput) searchInput.value = '';

      var obecniNazwiska = (zakrystiaStan && zakrystiaStan.ministranci ? zakrystiaStan.ministranci : []).map(function(m) {
        return (m.nazwisko || '').toLowerCase().trim();
      });

      var wRows = (tabelaMiesiacaDane && tabelaMiesiacaDane.wiersze) ? tabelaMiesiacaDane.wiersze : [];
      var wszyscy = (zakrystiaStan && zakrystiaStan.wszyscyMinistranciParafii && zakrystiaStan.wszyscyMinistranciParafii.length) 
        ? zakrystiaStan.wszyscyMinistranciParafii 
        : Object.keys(PROFIL_MINISTRANTOW_BAZA).map(function(k) {
            return k.split(' ').map(function(w){ return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
          });

      // Filtrujemy tylko tych, których nie ma jeszcze na liście
      var dostepni = [];
      wszyscy.forEach(function(name) {
        var nLow = name.toLowerCase().trim();
        if (nLow.indexOf('kościelny') !== -1 || nLow.indexOf('koscielny') !== -1 || nLow.indexOf('pokojsk') !== -1) return;
        var juzJest = obecniNazwiska.some(function(obN) { return czyToSamoNazwisko(obN, name); });
        if (!juzJest && dostepni.indexOf(name) === -1) {
          dostepni.push(name);
        }
      });

      // Sortuj hierarchicznie: Animatorzy -> Lektorzy -> Starsi -> Młodsi -> Kandydaci
      dostepni.sort(function(a, b) {
        var stA = wyznaczStopienMinistranta(a, wRows);
        var stB = wyznaczStopienMinistranta(b, wRows);
        if (stB.ranga !== stA.ranga) return stB.ranga - stA.ranga;
        return a.localeCompare(b, 'pl');
      });

      if (licznikEl) {
        licznikEl.innerText = 'Dostępni ministranci (' + dostepni.length + '):';
      }

      if (dostepni.length === 0) {
        kontenerListy.innerHTML = '<div style="text-align:center; padding:20px; color:#a1a1aa; font-size:13px;">Wszyscy ministranci parafii są już dopisani do tej mszy.</div>';
        if (btnZatwierdz) {
          btnZatwierdz.disabled = true;
          btnZatwierdz.style.opacity = '0.5';
          btnZatwierdz.innerText = 'Dodaj wybranych (0)';
        }
      } else {
        var html = '';
        dostepni.forEach(function(name) {
          var stInfo = wyznaczStopienMinistranta(name, wRows);
          var wRow = (wRows || []).find(function(r) { return czyToSamoNazwisko(r.nazwisko, name); });
          var gr = wyznaczGrupeParafialna(name, wRow ? wRow.grupa : '');
          var safeName = name.replace(/"/g, '&quot;');
          html += '<label class="dodatkowy-item-row" data-name="' + name.toLowerCase() + '" style="display:flex; align-items:center; gap:10px; padding:10px 12px; background:#27272a; border:1px solid #3f3f46; border-radius:8px; cursor:pointer; user-select:none; transition:all 0.15s ease;">' +
                    '<input type="checkbox" value="' + safeName + '" class="chk-dodatkowy-ministrant" onchange="zaktualizujLicznikWybranychDodatkowych()" style="width:18px; height:18px; cursor:pointer; accent-color:#3b82f6;">' +
                    '<div style="flex:1;">' +
                      '<div style="font-weight:700; color:#fafafa; font-size:13.5px;">' + name + '</div>' +
                      '<div style="font-size:11px; color:#a1a1aa; display:flex; gap:6px; align-items:center; margin-top:2px;">' +
                        '<span style="color:#60a5fa; font-weight:600;">' + stInfo.stopien + '</span>' +
                        '<span style="color:#52525b;">•</span>' +
                        '<span>' + gr + '</span>' +
                      '</div>' +
                    '</div>' +
                  '</label>';
        });
        kontenerListy.innerHTML = html;
        zaktualizujLicznikWybranychDodatkowych();
      }

      var opisEl = document.getElementById('modal-dodaj-ministranta-opis');
      if (opisEl && zakrystiaStan) {
        var pktDod = zakrystiaStan.recznieUstawionePunkty ? zakrystiaStan.punktyLiturgii : ((zakrystiaStan.rodzajLiturgii === 'msza_niedziela' || zakrystiaStan.dzienTygodnia === 'niedziela') ? 1 : 2);
        if (zakrystiaStan.rodzajLiturgii === 'nabozenstwo' || zakrystiaStan.czyLiturgiaDodatkowa || zakrystiaStan.rodzajLiturgii === 'pogrzeb') {
          pktDod = zakrystiaStan.punktyLiturgii || 2;
        }
        var litNazwa = zakrystiaStan.nazwaLiturgii || 'liturgii';
        opisEl.innerText = 'Zaznacz ministrantów, którzy przyszli dodatkowo na: ' + litNazwa + ' (otrzymają +' + pktDod + ' pkt).';
      }

      document.getElementById('modal-dodaj-ministranta').style.display = 'flex';
      if (searchInput) searchInput.focus();
    }

    function zamknijModalDodajMinistranta() {
      var modal = document.getElementById('modal-dodaj-ministranta');
      if (modal) modal.style.display = 'none';
    }

    function filtrujListeDodatkowychMinistrantow() {
      var q = (document.getElementById('szukaj-dodatkowy-ministrant') ? document.getElementById('szukaj-dodatkowy-ministrant').value : '').toLowerCase().trim();
      var rows = document.querySelectorAll('.dodatkowy-item-row');
      rows.forEach(function(row) {
        var name = row.getAttribute('data-name') || '';
        if (!q || name.indexOf(q) !== -1) {
          row.style.display = 'flex';
        } else {
          row.style.display = 'none';
        }
      });
    }

    function zaznaczWszystkichDodatkowych(stan) {
      var chks = document.querySelectorAll('.chk-dodatkowy-ministrant');
      chks.forEach(function(chk) {
        var row = chk.closest('.dodatkowy-item-row');
        if (row && row.style.display !== 'none') {
          chk.checked = !!stan;
        }
      });
      zaktualizujLicznikWybranychDodatkowych();
    }

    function zaktualizujLicznikWybranychDodatkowych() {
      var chks = document.querySelectorAll('.chk-dodatkowy-ministrant');
      var wybraneCount = 0;
      chks.forEach(function(chk) {
        var row = chk.closest('.dodatkowy-item-row');
        if (chk.checked) {
          wybraneCount++;
          if (row) {
            row.style.borderColor = '#3b82f6';
            row.style.background = 'rgba(59,130,246,0.12)';
          }
        } else {
          if (row) {
            row.style.borderColor = '#3f3f46';
            row.style.background = '#27272a';
          }
        }
      });

      var btnZatwierdz = document.getElementById('btn-zatwierdz-dodatkowych');
      if (btnZatwierdz) {
        if (wybraneCount > 0) {
          btnZatwierdz.disabled = false;
          btnZatwierdz.style.opacity = '1';
          btnZatwierdz.innerText = (wybraneCount === 1) ? 'Dodaj wybranego (1)' : ('Dodaj wybranych (' + wybraneCount + ')');
        } else {
          btnZatwierdz.disabled = true;
          btnZatwierdz.style.opacity = '0.5';
          btnZatwierdz.innerText = 'Dodaj wybranych (0)';
        }
      }
    }

    function zatwierdzDodanieMinistrantow() {
      var chks = document.querySelectorAll('.chk-dodatkowy-ministrant:checked');
      if (!chks || chks.length === 0) {
        alert('Zaznacz co najmniej jednego ministranta.');
        return;
      }

      if (!zakrystiaStan.ministranci) zakrystiaStan.ministranci = [];
      var wRows = (tabelaMiesiacaDane && tabelaMiesiacaDane.wiersze) ? tabelaMiesiacaDane.wiersze : [];

      var czyWeekendL = (zakrystiaStan.rodzajLiturgii === 'msza_niedziela' || zakrystiaStan.dzienTygodnia === 'niedziela' || (zakrystiaStan.dzienTygodnia === 'sobota' && cleanTime(zakrystiaStan.godzina) === '17:00'));
      var dowDod = (zakrystiaStan.dzienTygodnia === 'sobota') ? 6 : ((zakrystiaStan.dzienTygodnia === 'niedziela') ? 0 : (new Date(zakrystiaStan.rok || 2026, zakrystiaStan.miesiacIdx !== undefined ? zakrystiaStan.miesiacIdx : 9, zakrystiaStan.dzien || 1).getDay()));

      var dodaniNazwiska = [];
      chks.forEach(function(chk) {
        var name = chk.value;
        if (!name) return;
        var exists = zakrystiaStan.ministranci.some(function(m) { return czyToSamoNazwisko(m.nazwisko, name); });
        if (!exists) {
          var stInfoAdd = wyznaczStopienMinistranta(name, wRows);
          var pRow = wRows.find(function(w) { return czyToSamoNazwisko(w.nazwisko, name); });

          var isSwietoL = czyToDzienSwiateczny5Pkt(zakrystiaStan.dzien, zakrystiaStan.miesiacIdx, zakrystiaStan.rok, tabelaMiesiacaDane);
          var pktDlaDodatkowego = 2;
          var opisDodatkowy = '';
          if (zakrystiaStan.recznieUstawionePunkty) {
            pktDlaDodatkowego = zakrystiaStan.punktyLiturgii || 3;
            opisDodatkowy = 'Dodatkowa służba (+' + pktDlaDodatkowego + ' pkt)';
          } else if (isSwietoL) {
            var juzBylSwieto = czyMinistrantBylJuzNaInnejMszyWSwieto(pRow, zakrystiaStan.dzien - 1, zakrystiaStan.godzina);
            pktDlaDodatkowego = juzBylSwieto ? 2 : 5;
            opisDodatkowy = juzBylSwieto 
              ? 'Dodatkowa msza w święto (+2 pkt • służył już dzisiaj)' 
              : 'Msza w Uroczystość (+5 pkt)';
          } else if (zakrystiaStan.rodzajLiturgii === 'nabozenstwo' || zakrystiaStan.czyLiturgiaDodatkowa || zakrystiaStan.rodzajLiturgii === 'pogrzeb') {
            pktDlaDodatkowego = zakrystiaStan.punktyLiturgii || (zakrystiaStan.dzienTygodnia === 'niedziela' ? 3 : 2);
            opisDodatkowy = 'Dodatkowa służba (+' + pktDlaDodatkowego + ' pkt)';
          } else if (czyWeekendL) {
            var juzBylNaDyzurze = czyMinistrantBylNaSwoimDyzurzeWeekendowym(pRow, zakrystiaStan.dzien, dowDod, tabelaMiesiacaDane);
            pktDlaDodatkowego = juzBylNaDyzurze ? 2 : 1;
            opisDodatkowy = juzBylNaDyzurze ? 'Dodatkowa służba (+2 pkt)' : 'Dodatkowa msza (+1 pkt • po dyżurze +2 pkt)';
          } else {
            pktDlaDodatkowego = 2;
            opisDodatkowy = 'Dodatkowa służba (+2 pkt)';
          }

          zakrystiaStan.ministranci.push({
            nazwisko: name,
            normName: name.toLowerCase(),
            grupa: (pRow && pRow.grupa) ? pRow.grupa : 'Służy dodatkowo',
            stopien: stInfoAdd.stopien,
            stopienRanga: stInfoAdd.ranga,
            funkcja: null,
            strona: null,
            typ: 'DODATKOWY',
            zastepuje: null,
            status: 'OBECNY',
            domyslnyStatus: 'OBECNY',
            obecnyPkt: pktDlaDodatkowego,
            punkty: pktDlaDodatkowego,
            opisGieldy: opisDodatkowy,
            poprzedniaWartosc: null
          });
          dodaniNazwiska.push(name);
        }
      });

      zamknijModalDodajMinistranta();
      renderujTrybZakrystia();
      pokazToast('Dodano (' + dodaniNazwiska.length + '): ' + dodaniNazwiska.join(', '));
    }

    // Alias dla wstecznej kompatybilności:
    function zatwierdzDodanieMinistranta() {
      zatwierdzDodanieMinistrantow();
    }

    var aktywnyMinistrantKaryIdx = -1;

    function zakrystiaOtworzKare(idx) {
      if (!zakrystiaStan || !zakrystiaStan.ministranci || !zakrystiaStan.ministranci[idx]) return;
      aktywnyMinistrantKaryIdx = idx;
      var m = zakrystiaStan.ministranci[idx];

      var elNazw = document.getElementById('kara-ministrant-nazwisko');
      if (elNazw) elNazw.innerText = m.nazwisko;

      var curPkt = m.karaPunkty || 0;

      var inpPkt = document.getElementById('input-kara-punkty');
      if (inpPkt) inpPkt.value = curPkt > 0 ? curPkt : 2;

      wybierzKarePkt(curPkt > 0 ? curPkt : 2);

      var btnUsun = document.getElementById('btn-kara-usun');
      if (btnUsun) btnUsun.style.display = (curPkt > 0) ? 'inline-block' : 'none';

      var modal = document.getElementById('modal-kara-zakrystia');
      if (modal) modal.style.display = 'flex';
    }

    function zamknijModalKaryZakrystia() {
      var modal = document.getElementById('modal-kara-zakrystia');
      if (modal) modal.style.display = 'none';
      aktywnyMinistrantKaryIdx = -1;
    }

    function wybierzKarePkt(pkt) {
      var inp = document.getElementById('input-kara-punkty');
      if (inp) inp.value = pkt;
      var btns = document.querySelectorAll('.btn-kara-pkt');
      btns.forEach(function(b) {
        var p = parseInt(b.getAttribute('data-pkt'), 10);
        if (p === pkt) {
          b.style.background = '#dc2626';
          b.style.borderColor = '#ef4444';
          b.style.color = '#ffffff';
        } else {
          b.style.background = '#27272a';
          b.style.borderColor = '#3f3f46';
          b.style.color = '#fafafa';
        }
      });
    }

    function odznaczKarePktButtony() {
      var inp = document.getElementById('input-kara-punkty');
      var val = inp ? parseInt(inp.value, 10) : 0;
      var btns = document.querySelectorAll('.btn-kara-pkt');
      btns.forEach(function(b) {
        var p = parseInt(b.getAttribute('data-pkt'), 10);
        if (p === val) {
          b.style.background = '#dc2626';
          b.style.borderColor = '#ef4444';
          b.style.color = '#ffffff';
        } else {
          b.style.background = '#27272a';
          b.style.borderColor = '#3f3f46';
          b.style.color = '#fafafa';
        }
      });
    }

    function zatwierdzKareZakrystia() {
      if (aktywnyMinistrantKaryIdx === -1 || !zakrystiaStan || !zakrystiaStan.ministranci) return;
      var m = zakrystiaStan.ministranci[aktywnyMinistrantKaryIdx];
      if (!m) return;

      var inpPkt = document.getElementById('input-kara-punkty');
      var pkt = inpPkt ? parseInt(inpPkt.value, 10) : 0;
      if (isNaN(pkt) || pkt <= 0) {
        alert('Podaj prawidłową liczbę punktów karnych (np. 2, 3, 5...)');
        return;
      }

      m.karaPunkty = pkt;

      zamknijModalKaryZakrystia();
      renderujTrybZakrystia();
      pokazToast('⚠️ Wpisano karę: -' + pkt + ' pkt dla ' + m.nazwisko);
    }

    function zakrystiaUsunKare(idx) {
      if (!zakrystiaStan || !zakrystiaStan.ministranci || !zakrystiaStan.ministranci[idx]) return;
      var m = zakrystiaStan.ministranci[idx];
      m.karaPunkty = 0;
      renderujTrybZakrystia();
      pokazToast('Cofnięto punkty karne dla ' + m.nazwisko);
    }

    function zatwierdzUsuniecieKaryZModalu() {
      if (aktywnyMinistrantKaryIdx !== -1) {
        zakrystiaUsunKare(aktywnyMinistrantKaryIdx);
      }
      zamknijModalKaryZakrystia();
    }

    function normalizujNazwiskoScisle(s) {
      return String(s || '').toLowerCase()
        .replace(/ł/g, 'l').replace(/ą/g, 'a').replace(/ę/g, 'e').replace(/ś/g, 's')
        .replace(/ć/g, 'c').replace(/ż/g, 'z').replace(/ź/g, 'z').replace(/ń/g, 'n').replace(/ó/g, 'o')
        .replace(/\s+/g, ' ').trim();
    }

    // Ścisłe dopasowanie wiersza ministranta (pełne imię i nazwisko) - nigdy nie trafia w cudzy wiersz
    function znajdzWierszMinistranta(wiersze, nazwisko) {
      var szukane = normalizujNazwiskoScisle(nazwisko);
      if (!szukane || !Array.isArray(wiersze)) return null;
      var dokladny = wiersze.find(function(w) { return w && normalizujNazwiskoScisle(w.nazwisko) === szukane; });
      if (dokladny) return dokladny;
      var tM = szukane.split(' ');
      if (tM.length < 2) return null;
      var kandydaci = wiersze.filter(function(w) {
        var tW = normalizujNazwiskoScisle(w && w.nazwisko).split(' ');
        return tW.length >= 2 && tW[0] === tM[0] && tW[tW.length - 1] === tM[tM.length - 1];
      });
      return kandydaci.length === 1 ? kandydaci[0] : null;
    }

    // =============================================================
    // POWIADOMIENIA NA ŻYWO NA TELEGRAM Z ZAKRYSTII
    // =============================================================
    function wyslijAlertTelegramZakrystia(stan) {
      try {
        var botToken = '8928454251:AAERM9vwRwolBiXGhO4RoGgbuytobqE9X9g';
        var chatId = '1953233927';
        if (!stan || !stan.ministranci) return;

        var obecni = [];
        var nieobecni = [];
        var usprawiedliwieni = [];

        stan.ministranci.forEach(function(m) {
          var pts = (typeof m.punkty === 'number') ? m.punkty : (m.obecnyPkt || 0);
          var extra = '';
          if (m.typ === 'ZASTEPCA') extra = ' (zastępca)';
          else if (m.typ === 'DODATKOWY') extra = ' (dodatkowa)';
          if (m.karaPunkty) extra += ' [⚠️ -' + m.karaPunkty + ' kara]';

          if (m.tylkoRozaniec) {
            obecni.push('• ' + m.nazwisko + ' (+2 pkt, różaniec)');
          } else if (m.status === 'OBECNY') {
            obecni.push('• ' + m.nazwisko + ' (+' + pts + ' pkt' + extra + ')');
          } else if (m.status === 'NIEOBECNY') {
            nieobecni.push('• ' + m.nazwisko + ' (-5 pkt)');
          } else if (m.status === 'USPRAWIEDLIWIONY') {
            usprawiedliwieni.push('• ' + m.nazwisko + ' (0 pkt, uspraw.)');
          }
        });

        var lines = [
          '🔔 <b>Zakrystia: Zapisano obecność!</b>',
          '📅 <b>' + (stan.dataTekst || (stan.dzien + ' dzień')) + '</b> • godz. <b>' + (stan.godzina || '') + '</b>',
          '⛪ <i>' + (stan.nazwaLiturgii || 'Msza św.') + '</i>',
          '👤 Zapisujący: <b>' + ((globalUser && globalUser.nazwisko) ? globalUser.nazwisko : 'Kościelny') + '</b>',
          ''
        ];

        if (obecni.length > 0) {
          lines.push('🟢 <b>Obecni (' + obecni.length + '):</b>');
          lines.push(obecni.join('\n'));
          lines.push('');
        } else {
          lines.push('🟢 <b>Obecni:</b> brak\n');
        }

        if (nieobecni.length > 0) {
          lines.push('🔴 <b>Nieobecni (' + nieobecni.length + '):</b>');
          lines.push(nieobecni.join('\n'));
          lines.push('');
        }

        if (usprawiedliwieni.length > 0) {
          lines.push('🟡 <b>Usprawiedliwieni (' + usprawiedliwieni.length + '):</b>');
          lines.push(usprawiedliwieni.join('\n'));
          lines.push('');
        }

        var messageText = lines.join('\n').trim();

        fetch('https://api.telegram.org/bot' + botToken + '/sendMessage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: messageText,
            parse_mode: 'HTML'
          })
        }).then(function(res) {
          return res.json();
        }).then(function(data) {
          if (data && data.ok) {
            console.log('[Telegram] Alert z Zakrystii wysłany na żywo!');
          }
        }).catch(function(err) {
          console.warn('[Telegram] Błąd wysyłki alertu:', err);
        });
      } catch(e) {
        console.warn('[Telegram] Wyjątek podczas wysyłania alertu:', e);
      }
    }

    // =============================================================
    // KOLEJKA OFFLINE DLA ZAKRYSTII (ODPORNOŚĆ NA BRAK INTERNETU)
    // =============================================================
    var KLUCZ_KOLEJKI_OFFLINE = 'min_kolejka_offline_zakrystia';

    function pobierzKolejkeOfflineZakrystia() {
      try {
        var raw = localStorage.getItem(KLUCZ_KOLEJKI_OFFLINE);
        return raw ? JSON.parse(raw) : [];
      } catch(e) {
        return [];
      }
    }

    function zapiszKolejkeOfflineZakrystia(kolejka) {
      try {
        localStorage.setItem(KLUCZ_KOLEJKI_OFFLINE, JSON.stringify(kolejka || []));
      } catch(e) {}
      aktualizujWskaznikKolejkiOffline();
    }

    function dodajDoKolejkiOfflineZakrystia(wpis) {
      var kolejka = pobierzKolejkeOfflineZakrystia();
      var existingIdx = kolejka.findIndex(function(it) { return it.logId === wpis.logId; });
      if (existingIdx !== -1) {
        kolejka[existingIdx] = wpis;
      } else {
        kolejka.push(wpis);
      }
      zapiszKolejkeOfflineZakrystia(kolejka);
    }

    function usunZKolejkiOfflineZakrystia(logId) {
      var kolejka = pobierzKolejkeOfflineZakrystia().filter(function(it) { return it.logId !== logId; });
      zapiszKolejkeOfflineZakrystia(kolejka);
    }

    function aktualizujWskaznikKolejkiOffline() {
      var kolejka = pobierzKolejkeOfflineZakrystia();
      var badge = document.getElementById('zakrystia-offline-badge');
      if (badge) {
        if (kolejka.length > 0) {
          badge.style.display = 'inline-flex';
          badge.innerHTML = '🟡 ' + kolejka.length + ' wpis(y) offline (czekają na zasięg)';
        } else {
          badge.style.display = 'none';
        }
      }
    }

    async function przetworzKolejkeOfflineZakrystia() {
      var kolejka = pobierzKolejkeOfflineZakrystia();
      if (!kolejka.length || !dbFirestore) return;

      console.log('[Offline Queue] Sprawdzam ' + kolejka.length + ' oczekujących wpisów...');
      var nowaKolejka = [];

      for (var i = 0; i < kolejka.length; i++) {
        var item = kolejka[i];
        try {
          var promises = [];
          if (item.tabelaDoZapisu && item.targetDocKey) {
            promises.push(dbFirestore.collection('stan_grafiku').doc(item.targetDocKey).set(item.tabelaDoZapisu, { merge: true }));
            if (item.wariantKlucza && item.wariantKlucza !== item.targetDocKey) {
              promises.push(dbFirestore.collection('stan_grafiku').doc(item.wariantKlucza).set(item.tabelaDoZapisu, { merge: true }));
            }
          }
          if (item.obecnoscPayload && item.logId) {
            promises.push(dbFirestore.collection('obecnosc').doc(item.logId).set(item.obecnoscPayload));
          }
          await Promise.all(promises);
          console.log('[Offline Queue] Zsynchronizowano wpis z bazy:', item.logId);

          if (item.stanDoTelegramu) {
            wyslijAlertTelegramZakrystia(item.stanDoTelegramu);
          }
        } catch(err) {
          console.warn('[Offline Queue] Nie udało się wysłać wpisu ' + item.logId + ', pozostaje w kolejce:', err);
          nowaKolejka.push(item);
        }
      }

      zapiszKolejkeOfflineZakrystia(nowaKolejka);
      if (kolejka.length > 0 && nowaKolejka.length === 0) {
        pokazToast('✓ Wszystkie zaległe obecności z Zakrystii zostały pomyślnie zsynchronizowane z serwerem!');
      }
    }

    window.addEventListener('online', function() {
      console.log('[Sieć] Powrót połączenia internetowego, przetwarzam kolejkę offline...');
      przetworzKolejkeOfflineZakrystia();
    });
    setInterval(function() {
      if (navigator.onLine && pobierzKolejkeOfflineZakrystia().length > 0) {
        przetworzKolejkeOfflineZakrystia();
      }
    }, 25000);

    window.przetworzKolejkeOfflineZakrystia = przetworzKolejkeOfflineZakrystia;
    window.pobierzKolejkeOfflineZakrystia = pobierzKolejkeOfflineZakrystia;
    window.wyslijAlertTelegramZakrystia = wyslijAlertTelegramZakrystia;

    async function zakrystiaZapiszObecnosc() {
      if (!czyMaDostepDoZakrystii(globalUser ? globalUser.nazwisko : "")) {
        alert("Brak uprawnień do zapisywania obecności w zakrystii.");
        return;
      }
      var usunieciCount = (zakrystiaStan && zakrystiaStan.usunieci) ? zakrystiaStan.usunieci.length : 0;
      if (!zakrystiaStan || (!zakrystiaStan.ministranci && usunieciCount === 0)) {
        alert('Brak danych mszy do zapisania.');
        return;
      }
      if (zakrystiaStan.ministranci.length === 0 && usunieciCount === 0 && !zakrystiaStan.juzZapisane) {
        alert('Brak ministrantów do zapisania.');
        return;
      }

      var btn = document.getElementById('btn-zapisz-zakrystia');
      var spinner = document.getElementById('zakrystia-zapis-spinner');
      if (btn) {
        btn.disabled = true;
        btn.innerText = '⏳ ZAPISYWANIE... PROSZĘ CZEKAĆ';
        btn.style.opacity = '0.7';
        btn.style.cursor = 'wait';
      }
      if (spinner) spinner.style.display = 'inline';

      // 1. Zaktualizuj komórki w pamięci lokalnej z obsługą niezależnych slotów liturgii
      var colIdx = zakrystiaStan.dzien - 1;
      var dowNum = new Date(zakrystiaStan.rok || 2026, zakrystiaStan.miesiacIdx !== undefined ? zakrystiaStan.miesiacIdx : 9, zakrystiaStan.dzien || 1).getDay();
      var czySobota17 = (dowNum === 6 && cleanTime(zakrystiaStan.godzina) === '17:00');
      var czyNiedziela = (zakrystiaStan.rodzajLiturgii === 'msza_niedziela' || zakrystiaStan.dzienTygodnia === 'niedziela' || czySobota17);
      var czyDodatkowa = (zakrystiaStan.rodzajLiturgii === 'pogrzeb' || zakrystiaStan.rodzajLiturgii === 'nabozenstwo' || zakrystiaStan.rodzajLiturgii === 'msza_roza' || zakrystiaStan.czyLiturgiaDodatkowa);
      var gKey = (zakrystiaStan.godzina || 'msza').trim();

      var targetDocKey = (zakrystiaStan && zakrystiaStan.docKey) || pobierzAktywnyKluczMiesiaca();
      var isNextMonthZapis = (typeof czyToTenSamKluczMiesiaca === 'function') 
        ? !czyToTenSamKluczMiesiaca(targetDocKey, pobierzAktywnyKluczMiesiaca()) 
        : (targetDocKey !== pobierzAktywnyKluczMiesiaca());
      var tabelaDoModyfikacji = isNextMonthZapis ? (daneKolejnegoMiesiaca || tabelaMiesiacaDane) : tabelaMiesiacaDane;

      if (tabelaDoModyfikacji && tabelaDoModyfikacji.wiersze) {
        // Funkcja pomocnicza: oblicza sumaryczną wartość punktów komórki ze wszystkich niezależnych liturgii danego dnia
        function obliczSumeLiturgiiKomorki(cell) {
          if (!cell) return null;
          if (!cell.liturgie || typeof cell.liturgie !== 'object') {
            return (typeof cell.wartosc === 'number') ? cell.wartosc : null;
          }
          var klucze = Object.keys(cell.liturgie);
          if (klucze.length === 0) {
            if (cell.czyUsprawiedliwiony || cell.wartosc === 0 || cell.wartosc === '0' || (cell.maDyzur && (cell.wartosc === 0 || cell.wartosc === '0'))) {
              cell.czyUsprawiedliwiony = true;
              return 0;
            }
            return null;
          }
          var sumaDnia = 0;
          for (var ki = 0; ki < klucze.length; ki++) {
            var itemL = cell.liturgie[klucze[ki]];
            var valL = (typeof itemL === 'number') ? itemL : (itemL && typeof itemL.punkty === 'number' ? itemL.punkty : parseFloat(itemL));
            if (!isNaN(valL)) {
              sumaDnia += valL;
            }
          }
          return sumaDnia;
        }

        function wyliczPunktyMinistranta(m) {
          if (m.tylkoRozaniec) return 2;
          if (m.status === 'OBECNY') {
            var isSwietoL = czyToDzienSwiateczny5Pkt(zakrystiaStan.dzien, zakrystiaStan.miesiacIdx, zakrystiaStan.rok, tabelaDoModyfikacji);
            var wM = znajdzWierszMinistranta(tabelaDoModyfikacji.wiersze, m.nazwisko);
            var juzBylSwieto = isSwietoL ? czyMinistrantBylJuzNaInnejMszyWSwieto(wM, colIdx, gKey) : false;

            var dodajPkt = (typeof m.obecnyPkt === 'number') ? m.obecnyPkt : (zakrystiaStan.punktyLiturgii || 3);
            if (isSwietoL) {
              if (m.typ === 'ZASTEPCA') {
                dodajPkt = (typeof m.obecnyPkt === 'number') ? m.obecnyPkt : 4;
              } else if (juzBylSwieto) {
                dodajPkt = 2; // Druga lub kolejna msza w święto: ZAWSZE +2 pkt!
              } else {
                dodajPkt = 5; // Pierwsza msza w święto: ZAWSZE +5 pkt!
              }
            } else if (m.typ === 'ZASTEPCA') {
              dodajPkt = (typeof m.obecnyPkt === 'number') ? m.obecnyPkt : 4;
            } else if (m.typ === 'DODATKOWY') {
              if (zakrystiaStan.recznieUstawionePunkty) {
                dodajPkt = zakrystiaStan.punktyLiturgii || 3;
              } else if (typeof m.obecnyPkt === 'number') {
                dodajPkt = m.obecnyPkt;
              } else if (czyDodatkowa) {
                dodajPkt = zakrystiaStan.punktyLiturgii || 3;
              } else {
                var juzBylNaDyz = czyMinistrantBylNaSwoimDyzurzeWeekendowym(wM, zakrystiaStan.dzien, dowNum, tabelaDoModyfikacji);
                dodajPkt = czyNiedziela ? (juzBylNaDyz ? 2 : 1) : 2;
              }
            }
            if (m.bylNaRozancu) dodajPkt += 2;
            if (m.karaPunkty && m.karaPunkty > 0) dodajPkt -= m.karaPunkty;
            return dodajPkt;
          }
          if (m.status === 'NIEOBECNY') return czyDodatkowa ? 0 : -5;
          return 0; // USPRAWIEDLIWIONY lub ODDANY
        }

        // Najpierw usuń slot tej konkretnej liturgii dla osób usuniętych z obecności:
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
        });

        (zakrystiaStan.ministranci || []).forEach(function(m) {
          var wiersz = znajdzWierszMinistranta(tabelaDoModyfikacji.wiersze, m.nazwisko);
          if (!wiersz) {
            console.warn('Zakrystia: nie znaleziono wiersza w grafiku dla', m.nazwisko);
            return;
          }
          if (wiersz && wiersz.komorki && wiersz.komorki[colIdx]) {
            var cellObj = wiersz.komorki[colIdx];
            cellObj.liturgie = cellObj.liturgie || {};

            var isNabozenstwoOrDod = czyDodatkowa || (zakrystiaStan && zakrystiaStan.rodzajLiturgii === 'nabozenstwo') || m.typ === 'DODATKOWY';

            if (m.tylkoRozaniec) {
              var pktThis = wyliczPunktyMinistranta(m);
              m.punkty = pktThis;
              m.poprzedniePunktyZTejMszy = pktThis;
              cellObj.liturgie[gKey] = pktThis;
            } else if (m.status === 'OBECNY') {
              var dodajPkt = wyliczPunktyMinistranta(m);
              m.punkty = dodajPkt;
              m.poprzedniePunktyZTejMszy = dodajPkt;
              cellObj.liturgie[gKey] = dodajPkt;

              // Jeśli to był zastępca i jest obecny, przyznaj +1 pkt ministrantowi, którego zastępuje na tę mszę!
              if (m.typ === 'ZASTEPCA' && m.zastepuje) {
                var oddWiersz = znajdzWierszMinistranta(tabelaDoModyfikacji.wiersze, m.zastepuje);
                if (oddWiersz && oddWiersz.komorki && oddWiersz.komorki[colIdx]) {
                  var oddCell = oddWiersz.komorki[colIdx];
                  oddCell.liturgie = oddCell.liturgie || {};
                  oddCell.liturgie[gKey] = 1;
                  oddCell.wartosc = obliczSumeLiturgiiKomorki(oddCell);
                }
              }
            } else if (m.status === 'ODDANY') {
              m.punkty = 1;
              m.poprzedniePunktyZTejMszy = 1;
              cellObj.liturgie[gKey] = 1;
            } else if (m.status === 'USPRAWIEDLIWIONY') {
              m.punkty = 0;
              m.poprzedniePunktyZTejMszy = 0;
              cellObj.liturgie[gKey] = 0;
              if (zakrystiaStan.godzina === '17:00' && colIdx + 1 < wiersz.komorki.length) {
                if (wiersz.komorki[colIdx + 1] && (wiersz.komorki[colIdx + 1].wartosc === 0 || wiersz.komorki[colIdx + 1].wartosc === '0')) {
                  wiersz.komorki[colIdx + 1].wartosc = null;
                }
              }
            } else if (m.status === 'NIEOBECNY') {
              if (m.typ === 'ZASTEPCA') {
                delete cellObj.liturgie[gKey];
                m.punkty = 0;
                m.poprzedniePunktyZTejMszy = 0;
              } else if (isNabozenstwoOrDod) {
                delete cellObj.liturgie[gKey];
                m.punkty = 0;
                m.poprzedniePunktyZTejMszy = 0;
              } else {
                var karaThis = -5;
                m.punkty = karaThis;
                m.poprzedniePunktyZTejMszy = karaThis;
                cellObj.liturgie[gKey] = karaThis;
                if (zakrystiaStan.godzina === '17:00' && colIdx + 1 < wiersz.komorki.length) {
                  if (wiersz.komorki[colIdx + 1] && (wiersz.komorki[colIdx + 1].wartosc === 0 || wiersz.komorki[colIdx + 1].wartosc === '0')) {
                    wiersz.komorki[colIdx + 1].wartosc = null;
                  }
                }
              }
            }

            // OSTATECZNA WARTOŚĆ KOMÓRKI TO ZAWSZE DOKŁADNA SUMA WSZYSTKICH JEJ LITURGII!
            cellObj.wartosc = obliczSumeLiturgiiKomorki(cellObj);
          }
        });

        // AUTOMATYCZNA REKONCYLIACJA PUNKTÓW WEEKENDOWYCH:
        // Jeśli ministrant odsłużył swój dyżur (3 pkt), każda inna msza niedzielna w ten weekend za 1 pkt zamienia się w 2 pkt!
        // Jeśli nie był obecny na swoim dyżurze (nieobecny/usprawiedliwiony), inne msze mają 1 pkt.
        var isWeekendLiturgia = czyNiedziela;
        if (isWeekendLiturgia) {
          var satColIdx = (dowNum === 6) ? colIdx : (colIdx - 1);
          var sunColIdx = (dowNum === 6) ? (colIdx + 1) : colIdx;
          var weekendHours = ['07:00', '08:30', '10:00', '11:30', '17:00'];

          (zakrystiaStan.ministranci || []).forEach(function(m) {
            var wRow = znajdzWierszMinistranta(tabelaDoModyfikacji.wiersze, m.nazwisko);
            if (!wRow || !wRow.komorki) return;

            var efD = wyznaczEfektywnaGodzineWeekendowaDlaMinistranta(wRow, zakrystiaStan.dzien, dowNum, tabelaDoModyfikacji);
            var isCurrentMassHisDuty = (cleanTime(efD.godzina) === cleanTime(zakrystiaStan.godzina));
            if (!isCurrentMassHisDuty) return;

            var dutyServed = (m.status === 'OBECNY');
            var targetPtsForOther = dutyServed ? 2 : 1;

            var colsToCheck = [satColIdx, sunColIdx];
            for (var ci = 0; ci < colsToCheck.length; ci++) {
              var cIdx = colsToCheck[ci];
              if (cIdx >= 0 && cIdx < wRow.komorki.length) {
                var oCell = wRow.komorki[cIdx];
                if (oCell && oCell.liturgie) {
                  var changedCell = false;
                  weekendHours.forEach(function(wh) {
                    if (cIdx === colIdx && cleanTime(wh) === cleanTime(gKey)) return;
                    var curPts = oCell.liturgie[wh];
                    if (typeof curPts === 'number' && (curPts === 1 || curPts === 2) && curPts !== targetPtsForOther) {
                      oCell.liturgie[wh] = targetPtsForOther;
                      changedCell = true;

                      // Synchronizuj dokument obecności tamtej mszy w Firestore:
                      if (dbFirestore) {
                        var oDay = (cIdx === satColIdx) ? ((dowNum === 6) ? zakrystiaStan.dzien : (zakrystiaStan.dzien - 1)) : ((dowNum === 6) ? (zakrystiaStan.dzien + 1) : zakrystiaStan.dzien);
                        var logPref = (currentMonthIdx !== undefined && currentMonthIdx !== 8) ? ('M' + currentMonthIdx + '_') : '';
                        var oLId = logPref + ((oDay < 10 ? '0' : '') + oDay) + '_' + wh.replace(':', '');
                        dbFirestore.collection('obecnosc').doc(oLId).get().then(function(snapO) {
                          if (snapO.exists && snapO.data() && snapO.data().ministranci) {
                            var dOb = snapO.data();
                            var mInO = (dOb.ministranci || []).find(function(om) { return czyToSamoNazwisko(om.nazwisko, m.nazwisko); });
                            if (mInO) {
                              mInO.punkty = targetPtsForOther;
                              mInO.obecnyPkt = targetPtsForOther;
                              mInO.opisGieldy = (targetPtsForOther === 2) ? 'Dodatkowa służba (+2 pkt)' : 'Dodatkowa msza (+1 pkt)';
                              dbFirestore.collection('obecnosc').doc(oLId).update({ ministranci: dOb.ministranci });
                            }
                          }
                        }).catch(function(eO) { console.warn('Błąd auto-aktualizacji obecności:', eO); });
                      }
                    }
                  });
                  if (changedCell) {
                    oCell.wartosc = obliczSumeLiturgiiKomorki(oCell);
                  }
                }
              }
            }
          });
        }

        // Przeliczenie sum punktów w tabeli
        tabelaDoModyfikacji.wiersze.forEach(function(w) {
          if (w.komorki) {
            w.suma = w.komorki.reduce(function(acc, c) {
              var v = parseFloat(c.wartosc);
              return acc + (isNaN(v) ? 0 : v);
            }, 0);
            w.suma = Math.round(w.suma * 10) / 10;
          }
        });

        // BŁYSKAWICZNE PRZELICZENIE RANKINGU (synchronizacja w ułamku sekundy!)
        var rankingNowy = tabelaDoModyfikacji.wiersze
          .filter(function(w) {
            if (!w || !w.nazwisko) return false;
            var n = w.nazwisko.toLowerCase().trim();
            return n !== 'kościelny' && n !== 'koscielny' && n.indexOf('pokojsk') === -1;
          })
          .map(function(w) {
            var p = (w.suma !== undefined && w.suma !== null) ? w.suma : 0;
            return {
              nazwisko: w.nazwisko,
              punkty: p,
              suma: p,
              grupa: w.grupa
            };
          })
          .sort(function(a, b) {
            if (b.punkty !== a.punkty) return b.punkty - a.punkty;
            return a.nazwisko.localeCompare(b.nazwisko, 'pl');
          });
        var poz = 1;
        rankingNowy.forEach(function(r, idx) {
          if (idx > 0 && r.punkty < rankingNowy[idx - 1].punkty) poz = idx + 1;
          r.pozycja = poz;
          r.miejsce = poz;
        });
        tabelaDoModyfikacji.ranking = rankingNowy;
        tabelaDoModyfikacji.rankingMiesiac = rankingNowy;
        if (tabelaMiesiacaDane && tabelaMiesiacaDane !== tabelaDoModyfikacji) {
          tabelaMiesiacaDane.ranking = rankingNowy;
          tabelaMiesiacaDane.rankingMiesiac = rankingNowy;
        }

        // Dynamiczne przeliczenie rankingu rocznego w locie:
        if (tabelaMiesiacaDane.rankingRok && Array.isArray(tabelaMiesiacaDane.rankingRok)) {
          tabelaMiesiacaDane.rankingRok.forEach(function(r) {
            var rNorm = (r.nazwisko || '').toLowerCase().trim();
            var matchW = tabelaMiesiacaDane.wiersze.find(function(w) {
              var nw = (w.nazwisko || '').toLowerCase().trim();
              return nw === rNorm || nw.indexOf(rNorm) !== -1 || rNorm.indexOf(nw) !== -1;
            });
            var mPts = matchW ? (matchW.suma || 0) : 0;
            var curMName = tabelaMiesiacaDane.nazwaMiesiaca || "Październik";
            var curMIdx = (tabelaMiesiacaDane.miesiacIdx !== undefined) ? tabelaMiesiacaDane.miesiacIdx : (new Date()).getMonth();
            var curRok = tabelaMiesiacaDane.rok || (new Date()).getFullYear();
            var sumPrev = 0;
            var foundM = false;
            var matchRM = rankingNowy.find(function(rn) {
              return czyToSamoNazwisko(rn.nazwisko, r.nazwisko);
            });
            var rnMiejsce = (matchRM && (matchRM.pozycja || matchRM.miejsce)) ? (matchRM.pozycja || matchRM.miejsce) : undefined;
            if (r.punktyPoMiesiacach && Array.isArray(r.punktyPoMiesiacach)) {
              r.punktyPoMiesiacach.forEach(function(pm) {
                if (pm.miesiac === curMName || pm.miesiacIdx === curMIdx) {
                  pm.punkty = mPts;
                  if (rnMiejsce) pm.pozycja = rnMiejsce;
                  foundM = true;
                } else {
                  sumPrev += (pm.punkty || 0);
                }
              });
            }
            if (!foundM && r.punktyPoMiesiacach) {
              r.punktyPoMiesiacach.push({ miesiac: curMName, miesiacIdx: curMIdx, rok: curRok, punkty: mPts, pozycja: rnMiejsce });
            }
            r.punkty = Math.round((sumPrev + mPts) * 10) / 10;
            r.suma = r.punkty;
          });
          tabelaMiesiacaDane.rankingRok.sort(function(a, b) { return b.punkty - a.punkty; });
          var pozRok = 1;
          tabelaMiesiacaDane.rankingRok.forEach(function(r, idx) {
            if (idx > 0 && r.punkty < tabelaMiesiacaDane.rankingRok[idx - 1].punkty) pozRok = idx + 1;
            r.pozycja = pozRok;
            r.miejsce = pozRok;
          });
        }

        // Dynamiczne przeliczenie minusów (miesiąc i rok) w locie:
        var curMNameZ = tabelaMiesiacaDane.nazwaMiesiaca || "Październik";
        var curMIdxZ = (tabelaMiesiacaDane.miesiacIdx !== undefined) ? tabelaMiesiacaDane.miesiacIdx : (new Date()).getMonth();
        var curRokZ = tabelaMiesiacaDane.rok || (new Date()).getFullYear();
        var dniNazwyMinusZ = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];
        var polishMonthsGenMinusZ = [
          "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
          "lipca", "sierpnia", "września", "października", "listopada", "grudnia"
        ];
        var mGenMinusZ = polishMonthsGenMinusZ[curMIdxZ] || polishMonthsGenMinusZ[(new Date()).getMonth()];

        if (!tabelaMiesiacaDane.rankingMinusyRok) {
          tabelaMiesiacaDane.rankingMinusyRok = tabelaMiesiacaDane.rankingMinusy || [];
        }

        var minusyMiesiacMapZ = {};
        tabelaMiesiacaDane.wiersze.forEach(function(w) {
          if (!w || !w.nazwisko) return;
          var wNorm = w.nazwisko.toLowerCase().trim();
          var mList = [];
          (w.komorki || []).forEach(function(k, kIdx) {
            if (typeof k.wartosc === "number" && k.wartosc < 0) {
              var dtM = new Date(curRokZ, curMIdxZ, kIdx + 1);
              mList.push({
                dzien: kIdx + 1,
                miesiac: curMNameZ,
                miesiacGen: mGenMinusZ,
                miesiacIdx: curMIdxZ,
                rok: curRokZ,
                dzienTygodnia: dniNazwyMinusZ[dtM.getDay()],
                punkty: k.wartosc
              });
            }
          });
          if (mList.length > 0) {
            minusyMiesiacMapZ[wNorm] = { nazwisko: w.nazwisko, grupa: w.grupa, mins: mList };
          }
        });

        var nowyRMM = [];
        for (var nKey in minusyMiesiacMapZ) {
          var itemMM = minusyMiesiacMapZ[nKey];
          var sumMM = 0;
          itemMM.mins.forEach(function(x) { sumMM += x.punkty; });
          nowyRMM.push({
            nazwisko: itemMM.nazwisko,
            normName: nKey,
            minusy: sumMM,
            szczegolyMinusow: itemMM.mins,
            grupa: itemMM.grupa,
            pozycja: 1
          });
        }
        nowyRMM.sort(function(a, b) { return a.minusy - b.minusy; });
        var pMM = 1;
        nowyRMM.forEach(function(m, idx) {
          if (idx > 0 && m.minusy > nowyRMM[idx - 1].minusy) pMM = idx + 1;
          m.pozycja = pMM;
        });
        tabelaMiesiacaDane.rankingMinusyMiesiac = nowyRMM;

        tabelaMiesiacaDane.wiersze.forEach(function(w) {
          if (!w || !w.nazwisko) return;
          var wNorm = w.nazwisko.toLowerCase().trim();
          var rItem = tabelaMiesiacaDane.rankingMinusyRok.find(function(it) {
            return (it.normName || it.nazwisko || '').toLowerCase().trim() === wNorm;
          });
          if (!rItem) {
            rItem = { nazwisko: w.nazwisko, normName: wNorm, minusy: 0, szczegolyMinusow: [], grupa: w.grupa, pozycja: 1 };
            tabelaMiesiacaDane.rankingMinusyRok.push(rItem);
          }
          var starszeMinusy = (rItem.szczegolyMinusow || []).filter(function(sm) {
            return sm.miesiac !== curMNameZ && sm.miesiacIdx !== curMIdxZ;
          });
          var biezaceMinusy = (minusyMiesiacMapZ[wNorm] && minusyMiesiacMapZ[wNorm].mins) ? minusyMiesiacMapZ[wNorm].mins : [];
          rItem.szczegolyMinusow = starszeMinusy.concat(biezaceMinusy);
          var totalM = 0;
          rItem.szczegolyMinusow.forEach(function(sm) { totalM += (sm.punkty || 0); });
          rItem.minusy = totalM;
        });
        tabelaMiesiacaDane.rankingMinusyRok.sort(function(a, b) { return a.minusy - b.minusy; });
        var pMR = 1;
        tabelaMiesiacaDane.rankingMinusyRok.forEach(function(m, idx) {
          if (idx > 0 && m.minusy > tabelaMiesiacaDane.rankingMinusyRok[idx - 1].minusy) pMR = idx + 1;
          m.pozycja = pMR;
        });
        tabelaMiesiacaDane.rankingMinusy = tabelaMiesiacaDane.rankingMinusyRok;

        // Błyskawiczny zapis do lokalnej historii wpisów
        if (!tabelaMiesiacaDane.historiaWpisow) tabelaMiesiacaDane.historiaWpisow = [];
        var timeNow = new Date();
        var timeStr = (timeNow.getDate() < 10 ? '0' : '') + timeNow.getDate() + '.' +
          (timeNow.getMonth() + 1 < 10 ? '0' : '') + (timeNow.getMonth() + 1) + '.' +
          timeNow.getFullYear() + ' ' +
          (timeNow.getHours() < 10 ? '0' : '') + timeNow.getHours() + ':' +
          (timeNow.getMinutes() < 10 ? '0' : '') + timeNow.getMinutes();

        zakrystiaStan.ministranci.forEach(function(m) {
          var pts = wyliczPunktyMinistranta(m);
          var statusNazwa = m.tylkoRozaniec ? 'TYLKO RÓŻANIEC (+2)' : (m.bylNaRozancu ? (m.status + ' (+RÓŻANIEC)') : m.status);
          if (m.karaPunkty && m.karaPunkty > 0) {
            statusNazwa += ' (⚠️ Kara: -' + m.karaPunkty + ' pkt)';
          }
          var curMVal = (zakrystiaStan && zakrystiaStan.miesiacIdx !== undefined) ? zakrystiaStan.miesiacIdx : (new Date()).getMonth();
          var mNazwa = (polishMonthsGenitive && polishMonthsGenitive[curMVal]) || polishMonthsGenitive[(new Date()).getMonth()];
          tabelaMiesiacaDane.historiaWpisow.unshift({
            czas: timeStr,
            dzien: zakrystiaStan.dataTekst || (zakrystiaStan.dzien + ' ' + mNazwa),
            godzina: zakrystiaStan.godzina,
            liturgia: zakrystiaStan.nazwaLiturgii || 'Msza św.',
            nazwisko: m.nazwisko,
            status: statusNazwa,
            typ: m.typ,
            punkty: pts,
            zastepuje: m.zastepuje || '-',
            wpisal: (globalUser && globalUser.nazwisko) || 'Kościelny'
          });
        });
        if (tabelaMiesiacaDane.historiaWpisow.length > 100) {
          tabelaMiesiacaDane.historiaWpisow = tabelaMiesiacaDane.historiaWpisow.slice(0, 100);
        }

        try { localStorage.setItem('min_cached_tabela', JSON.stringify(tabelaMiesiacaDane)); } catch(e) {}

        // Natychmiastowe odświeżenie pulpitu dla aktualnie zalogowanego użytkownika
        if (globalUser && globalUser.nazwisko) {
          var stanNowy = generujStanZFirestore(globalUser.nazwisko, tabelaMiesiacaDane);
          if (stanNowy) renderujDane(stanNowy);
        }
      }

      zakrystiaStan.juzZapisane = true;
      var stanInfo = document.getElementById('zakrystia-stan-zapisania');
      if (stanInfo) stanInfo.style.display = 'block';

      // 2. Pewny zapis do Firestore z await (gwarancja że dane dotarły na serwer!)
      var targetDocKey = (zakrystiaStan && zakrystiaStan.docKey) || pobierzAktywnyKluczMiesiaca();
      var isNextMonthZapis = (typeof czyToTenSamKluczMiesiaca === 'function') 
        ? !czyToTenSamKluczMiesiaca(targetDocKey, pobierzAktywnyKluczMiesiaca()) 
        : (targetDocKey !== pobierzAktywnyKluczMiesiaca());
      var tabelaDoZapisu = isNextMonthZapis ? (daneKolejnegoMiesiaca || tabelaMiesiacaDane) : tabelaMiesiacaDane;
      var curMValZ = (zakrystiaStan && zakrystiaStan.miesiacIdx !== undefined) ? zakrystiaStan.miesiacIdx : (new Date()).getMonth();
      var curRY = (zakrystiaStan && zakrystiaStan.rok) || (new Date()).getFullYear();
      var logIdPrefix = (curMValZ !== 8 || curRY !== 2026) ? ('M' + curMValZ + '_') : '';
      var logId = logIdPrefix + (zakrystiaStan.dzien < 10 ? '0' : '') + zakrystiaStan.dzien + '_' + zakrystiaStan.godzina.replace(':', '');
      var firestoreSuccess = true;

      var wariantKlucza = wyznaczWariantKluczaMiesiaca(targetDocKey);
      var obecnoscPayload = {
        dzien: zakrystiaStan.dzien,
        miesiacIdx: zakrystiaStan.miesiacIdx,
        rok: zakrystiaStan.rok,
        docKey: targetDocKey,
        godzina: zakrystiaStan.godzina,
        dataTekst: zakrystiaStan.dataTekst,
        rodzajLiturgii: zakrystiaStan.rodzajLiturgii,
        punktyLiturgii: zakrystiaStan.punktyLiturgii,
        recznieUstawionePunkty: !!zakrystiaStan.recznieUstawionePunkty,
        nazwaLiturgii: zakrystiaStan.nazwaLiturgii,
        maRozaniec: !!zakrystiaStan.maRozaniec,
        zapisano: new Date().toISOString(),
        zapisanoPrzez: (globalUser && globalUser.nazwisko) ? globalUser.nazwisko : 'Kościelny',
        ministranci: zakrystiaStan.ministranci
      };

      var wpisDoKolejki = {
        id: 'off_' + logId + '_' + Date.now(),
        logId: logId,
        targetDocKey: targetDocKey,
        wariantKlucza: wariantKlucza,
        tabelaDoZapisu: tabelaDoZapisu,
        obecnoscPayload: obecnoscPayload,
        stanDoTelegramu: JSON.parse(JSON.stringify(zakrystiaStan)),
        utworzono: Date.now()
      };

      // 1. Zawsze natychmiast zapisujemy do kolejki offline w telefonie (100% gwarancja bezpieczeństwa)
      dodajDoKolejkiOfflineZakrystia(wpisDoKolejki);

      // 2. Jeśli mamy internet i Firestore, próbujemy zapisać na serwerze od razu:
      if (dbFirestore && navigator.onLine) {
        try {
          var promises = [];
          if (tabelaDoZapisu) {
            promises.push(dbFirestore.collection('stan_grafiku').doc(targetDocKey).set(tabelaDoZapisu, { merge: true }));
            if (wariantKlucza && wariantKlucza !== targetDocKey) {
              promises.push(dbFirestore.collection('stan_grafiku').doc(wariantKlucza).set(tabelaDoZapisu, { merge: true }));
            }
          }
          promises.push(dbFirestore.collection('obecnosc').doc(logId).set(obecnoscPayload));
          await Promise.all(promises);

          // Pomyślny zapis na serwerze: usuwamy z kolejki offline i wysyłamy alert Telegram na żywo!
          usunZKolejkiOfflineZakrystia(logId);
          wyslijAlertTelegramZakrystia(zakrystiaStan);
        } catch(errFs) {
          console.warn('Zapis do Firestore napotkał problem sieciowy (wpis zabezpieczony w kolejce offline):', errFs);
          firestoreSuccess = false;
        }
      } else {
        firestoreSuccess = false;
      }

      if (spinner) spinner.style.display = 'none';

      if (!firestoreSuccess) {
        if (btn) {
          btn.disabled = false;
          btn.innerText = '✓ ZAPISANO OFFLINE (' + zakrystiaStan.ministranci.length + ' ministrantów)';
          btn.style.opacity = '1';
          btn.style.cursor = 'pointer';
        }
        pokazToast('📡 Zapisano lokalnie w pamięci telefonu. Wyśle się automatycznie po odzyskaniu internetu.');
        pokazModalSukcesuZakrystii(zakrystiaStan.nazwaLiturgii + ' (' + zakrystiaStan.godzina + ')', zakrystiaStan.ministranci.length, true);
        return;
      }

      if (btn) {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
        btn.innerText = 'ZAPISANO (' + zakrystiaStan.ministranci.length + ' ministrantów)';
      }

      // Haptic feedback dla Kościelnego w telefonie
      try {
        if (window.navigator && window.navigator.vibrate) {
          window.navigator.vibrate([100, 50, 100]);
        }
      } catch(eVib) {}

      // Wielkie, nie do przeoczenia potwierdzenie sukcesu online
      pokazModalSukcesuZakrystii(zakrystiaStan.nazwaLiturgii + ' (' + zakrystiaStan.godzina + ')', zakrystiaStan.ministranci.length, false);
    }