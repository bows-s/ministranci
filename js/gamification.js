// =============================================================
    // SYSTEM GRYWALIZACJI (POZIOMY XP, ODZNAKI, PASSA) I PROFILE
    // =============================================================
    var RANGI_GAMIFIKACJI = [
      { lvl: 1, nazwa: "Młodzik", opis: "Dziecko szkolone w klanie, przed próbami na Padawana.", icon: "1", minXp: 0, maxXp: 75, kolor: "#94a3b8", bg: "#f1f5f9" },
      { lvl: 2, nazwa: "Padawan", opis: "Szkolony bezpośrednio pod okiem Rycerza lub Mistrza.", icon: "2", minXp: 76, maxXp: 200, kolor: "#10b981", bg: "#ecfdf5" },
      { lvl: 3, nazwa: "Starszy Padawan", opis: "Uczeń tuż przed Próbami Jedi (często dowodzący oddziałami w Wojnach Klonów).", icon: "3", minXp: 201, maxXp: 400, kolor: "#0284c7", bg: "#e0f2fe" },
      { lvl: 4, nazwa: "Rycerz Jedi", opis: "Pełnoprawny członek Zakonu po przejściu prób.", icon: "4", minXp: 401, maxXp: 700, kolor: "#8b5cf6", bg: "#f3e8ff" },
      { lvl: 5, nazwa: "Mistrz Jedi", opis: "Uznany Rycerz, który wyszkolił przynajmniej jednego Padawana lub wykazał się wybitnym zrozumieniem Mocy.", icon: "5", minXp: 701, maxXp: 1100, kolor: "#f97316", bg: "#fff7ed" },
      { lvl: 6, nazwa: "Członek Wysokiej Rady", opis: "Jeden z 12 Mistrzów zasiadających w Radzie Jedi i decydujących o Zakonie.", icon: "6", minXp: 1101, maxXp: 1600, kolor: "#ef4444", bg: "#fef2f2" },
      { lvl: 7, nazwa: "Mistrz Zakonu", opis: "Wybierany lider Rady, odpowiedzialny za bieżące dowodzenie Zakonem (np. Mace Windu).", icon: "7", minXp: 1601, maxXp: 2300, kolor: "#d97706", bg: "#fef3c7" },
      { lvl: 8, nazwa: "Wielki Mistrz", opis: "Najwyższy rangą, najbardziej szanowany i najmądrzejszy z całego Zakonu (np. Yoda).", icon: "★", minXp: 2301, maxXp: 99999, kolor: "#eab308", bg: "#fefce8" }
    ];

    function wyznaczRangeGamifikacji(xp) {
      var xpVal = Math.max(0, parseInt(xp, 10) || 0);
      for (var i = RANGI_GAMIFIKACJI.length - 1; i >= 0; i--) {
        var r = RANGI_GAMIFIKACJI[i];
        if (xpVal >= r.minXp) {
          var nastepna = (i < RANGI_GAMIFIKACJI.length - 1) ? RANGI_GAMIFIKACJI[i + 1] : null;
          var zakresPoczatku = r.minXp;
          var zakresKonca = nastepna ? nastepna.minXp : (r.minXp + 1000);
          var wPoziomie = xpVal - zakresPoczatku;
          var span = Math.max(1, zakresKonca - zakresPoczatku);
          var procent = nastepna ? Math.min(100, Math.max(0, Math.round((wPoziomie / span) * 100))) : 100;
          var brakuje = nastepna ? Math.max(0, nastepna.minXp - xpVal) : 0;
          return {
            ranga: r,
            lvl: r.lvl,
            nazwa: r.nazwa,
            opis: r.opis || "",
            icon: r.icon,
            kolor: r.kolor,
            bg: r.bg,
            xp: xpVal,
            procent: procent,
            brakujeDoNast: brakuje,
            nastepnaNazwa: nastepna ? nastepna.nazwa : "Maksymalny poziom",
            zakresKonca: nastepna ? nastepna.minXp : r.maxXp
          };
        }
      }
      return {
        ranga: RANGI_GAMIFIKACJI[0],
        lvl: 1,
        nazwa: "Młodzik",
        opis: RANGI_GAMIFIKACJI[0].opis || "",
        icon: "1",
        kolor: "#94a3b8",
        bg: "#f1f5f9",
        xp: xpVal,
        procent: 0,
        brakujeDoNast: 76 - xpVal,
        nastepnaNazwa: "Padawan",
        zakresKonca: 75
      };
    }

    // Obliczanie profilu grywalizacji dla dowolnego ministranta
        function formatTygodnieSlownie(n) {
      if (n === 1) return 'tydzień';
      var mod10 = n % 10;
      var mod100 = n % 100;
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
        return 'tygodnie';
      }
      return 'tygodni';
    }

    function obliczGamifikacjeMinistranta(nazwisko) {
      var nClean = (nazwisko || "").trim();
      var stan = (globalUser && globalUser.stan) || (typeof tabelaMiesiacaDane !== 'undefined' ? tabelaMiesiacaDane : null) || {};
      
      // 1. Doświadczenie bazowe (suma punktów z całego roku / historii: 1 punkt = 1 XP)
      var listRok = (stan.rankingRok && stan.rankingRok.length) ? stan.rankingRok : ((tabelaMiesiacaDane && tabelaMiesiacaDane.rankingRok) || []);
      var itemRok = listRok.find(function(it) { return it && it.nazwisko && czyToSamoNazwisko(it.nazwisko, nClean); });
      var bazaXp = (itemRok && itemRok.punkty !== undefined) ? Math.max(0, itemRok.punkty) : 0;

      // 2. Punkty w bieżącym miesiącu
      var listMiesiac = (stan.rankingMiesiac && stan.rankingMiesiac.length) ? stan.rankingMiesiac : ((tabelaMiesiacaDane && tabelaMiesiacaDane.rankingMiesiac) || []);
      var itemMiesiac = listMiesiac.find(function(it) { return it && it.nazwisko && czyToSamoNazwisko(it.nazwisko, nClean); });
      var punktyMiesiac = (itemMiesiac && itemMiesiac.punkty !== undefined) ? itemMiesiac.punkty : 0;

      // 2b. Punkty minusowe od początku roku
      var listMinusRok = (stan.rankingMinusyRok && stan.rankingMinusyRok.length) ? stan.rankingMinusyRok : ((tabelaMiesiacaDane && tabelaMiesiacaDane.rankingMinusyRok) || stan.rankingMinusy || []);
      var itemMinusRok = listMinusRok.find(function(it) { return it && it.nazwisko && czyToSamoNazwisko(it.nazwisko, nClean); });
      var minusyRok = (itemMinusRok && itemMinusRok.minusy !== undefined) ? itemMinusRok.minusy : 0;

      // 3. Wiersz obecności z tabeli miesiąca bieżącego
      var wiersze = (stan.wiersze && stan.wiersze.length) ? stan.wiersze : ((tabelaMiesiacaDane && tabelaMiesiacaDane.wiersze) || []);
      var userRow = wiersze.find(function(w) { return w && w.nazwisko && czyToSamoNazwisko(w.nazwisko, nClean); });

      var stopienLit = (typeof wyznaczStopienMinistranta === 'function') 
        ? wyznaczStopienMinistranta(nClean, wiersze) 
        : { stopien: "Ministrant", ranga: 2 };
      var userGrupa = (userRow && userRow.grupa) ? userRow.grupa : wyznaczGrupeParafialna(nClean, "");

      var now = new Date();
      var currentDay = now.getDate();
      var currentMonthIdx = (stan.miesiacIdx !== undefined) ? stan.miesiacIdx : now.getMonth();
      var currentYear = stan.rok || now.getFullYear();

      // Obliczenia bieżącego miesiąca
      var totalMinusyBiezacy = 0;
      var obsluzoneSluzbyBiezacy = 0;
      var wyznaczoneSluzbyPrzeszle = 0;
      var wyznaczoneSluzbyPrzyszle = 0;
      var opuszczoneWyznaczone = 0;
      var usprawiedliwioneWyznaczone = 0;

      var niedzieleWyznaczonePrzeszle = 0;
      var niedzieleWyznaczonePrzyszle = 0;
      var niedzieleObsluzone = 0;
      var niedzieleOpuszczone = 0;
      var niedzieleUsprawiedliwione = 0;

      var tygodnieSluzb = [
        { start: 1, end: 7, obecny: 0, minus: 0, dyzury: 0 },
        { start: 8, end: 14, obecny: 0, minus: 0, dyzury: 0 },
        { start: 15, end: 21, obecny: 0, minus: 0, dyzury: 0 },
        { start: 22, end: 28, obecny: 0, minus: 0, dyzury: 0 },
        { start: 29, end: 31, obecny: 0, minus: 0, dyzury: 0 }
      ];

      if (userRow && userRow.komorki) {
        userRow.komorki.forEach(function(k) {
          var d = k.dzien;
          var dt = new Date(currentYear, currentMonthIdx, d);
          var isPast = (d <= currentDay);
          var isSunday = (dt.getDay() === 0) || (dt.getDay() === 6 && k.maDyzur);

          var wVal = k.wartosc;
          var isPresent = (typeof wVal === "number" && wVal > 0);
          var isAbsent = (typeof wVal === "number" && wVal < 0);
          var isExcused = (wVal === 0 || wVal === "0");

          if (isPresent) {
            obsluzoneSluzbyBiezacy++;
            if (isSunday) niedzieleObsluzone++;
          }
          if (isAbsent) {
            totalMinusyBiezacy++;
            if (isSunday) niedzieleOpuszczone++;
          }
          if (isExcused) {
            if (isSunday) niedzieleUsprawiedliwione++;
          }

          if (k.maDyzur) {
            if (isPast) {
              wyznaczoneSluzbyPrzeszle++;
              if (isSunday) niedzieleWyznaczonePrzeszle++;
              if (isAbsent) opuszczoneWyznaczone++;
              if (isExcused) usprawiedliwioneWyznaczone++;
            } else {
              wyznaczoneSluzbyPrzyszle++;
              if (isSunday) niedzieleWyznaczonePrzyszle++;
            }
          }

          for (var t = 0; t < tygodnieSluzb.length; t++) {
            if (d >= tygodnieSluzb[t].start && d <= tygodnieSluzb[t].end) {
              if (k.maDyzur) tygodnieSluzb[t].dyzury++;
              if (isPresent) tygodnieSluzb[t].obecny++;
              if (isAbsent) tygodnieSluzb[t].minus++;
              break;
            }
          }
        });
      }

      // Czy miesiąc faktycznie się zakończył
      var czyKoniecMiesiaca = (currentDay >= 28);

      // Odznaka 1: Żelazna Tarcza (Czyste konto: 0 nieusprawiedliwionych minusów; usprawiedliwienia są w pełni dozwolone!)
      var b1Failed = (totalMinusyBiezacy > 0);
      var b1Unlocked = czyKoniecMiesiaca && !b1Failed && (obsluzoneSluzbyBiezacy >= 2);
      var b1StatusText = b1Failed ? "Zablokowana" : (b1Unlocked ? "Zdobyta" : "W toku");
      var b1Desc = "Czyste konto: 0 nieusprawiedliwionych minusów (usprawiedliwienia dozwolone).";

      // Odznaka 2: Niezawodny (100% fizycznej obecności na wyznaczonych dyżurach; brak jakichkolwiek opuszczeń i brak usprawiedliwień)
      var b2HasMinus = (opuszczoneWyznaczone > 0) || (totalMinusyBiezacy > 0);
      var b2HasExcused = (usprawiedliwioneWyznaczone > 0);
      var b2Failed = b2HasMinus || b2HasExcused;
      var b2Unlocked = czyKoniecMiesiaca && !b2Failed && (wyznaczoneSluzbyPrzyszle === 0) && (wyznaczoneSluzbyPrzeszle >= 2);
      var b2StatusText = "W toku";
      if (b2HasMinus) b2StatusText = "Zablokowana";
      else if (b2HasExcused) b2StatusText = "Niepełna (absencja)";
      else if (b2Unlocked) b2StatusText = "Zdobyta";
      var b2Desc = "100% fizycznej obecności na wszystkich swoich dyżurach (brak absencji).";

      // Odznaka 3: Niedzielny Rycerz (100% obecności na niedzielach; brak absencji)
      var b3HasMinus = (niedzieleOpuszczone > 0);
      var b3HasExcused = (niedzieleUsprawiedliwione > 0);
      var b3Failed = b3HasMinus || b3HasExcused;
      var b3Unlocked = czyKoniecMiesiaca && !b3Failed && (niedzieleWyznaczonePrzyszle === 0) && (niedzieleObsluzone >= 1);
      var b3StatusText = "W toku";
      if (b3HasMinus) b3StatusText = "Zablokowana";
      else if (b3HasExcused) b3StatusText = "Niepełna (absencja)";
      else if (b3Unlocked) b3StatusText = "Zdobyta";
      var b3Desc = "Obecność na mszach niedzielnych bez nieusprawiedliwionych opuszczeń.";

      // Odznaka 4: Ratownik Służby (Tylko przejęcie dyżuru z giełdy jako zastępca - max 1 raz w miesiącu)
      var zamianyList = (stan.zamianyZastepstwa && stan.zamianyZastepstwa.length) ? stan.zamianyZastepstwa : ((tabelaMiesiacaDane && tabelaMiesiacaDane.zamianyZastepstwa) || []);
      var przejeciaDyzuru = zamianyList.filter(function(z) { 
        return z && czyToSamoNazwisko(z.przejmujacy, nClean) && (z.status === 'PRZEJETE' || z.status === 'ZREALIZOWANE'); 
      });
      var b4Unlocked = (przejeciaDyzuru.length > 0);
      var b4StatusText = b4Unlocked ? "Zdobyta" : "W toku";
      var b4Desc = "Przejęcie dyżuru od innego ministranta z giełdy wolnych służb.";

      // Odznaka 5: Mistrz Wymiany (Tylko oddający, którego dyżur został przejęty przez kogoś - max 1 raz w miesiącu)
      var oddaneZrealizowane = zamianyList.filter(function(z) {
        return z && czyToSamoNazwisko(z.oddajacy, nClean) && (z.status === 'PRZEJETE' || z.status === 'ZREALIZOWANE');
      });
      var b5Unlocked = (oddaneZrealizowane.length > 0);
      var b5StatusText = b5Unlocked ? "Zdobyta" : "W toku";
      var b5Desc = "Oddanie dyżuru na giełdę ze skutecznym znalezieniem zastępcy.";
      var ratownikCountRoczny = b4Unlocked ? 1 : 0;
      var wymianaCountRoczny = b5Unlocked ? 1 : 0;

      var odznakiZdobyteBiezacy = (b1Unlocked ? 1 : 0) + (b2Unlocked ? 1 : 0) + (b3Unlocked ? 1 : 0) + (b4Unlocked ? 1 : 0) + (b5Unlocked ? 1 : 0);
      // =========================================================
      // 4. HISTORIA ODZNAK I BONUSÓW XP OD STYCZNIA 2026
      // =========================================================
      var minusyByMonth = {};
      var listMinusy = (stan.rankingMinusy && stan.rankingMinusy.length) ? stan.rankingMinusy : ((tabelaMiesiacaDane && tabelaMiesiacaDane.rankingMinusy) || []);
      var userMinusRecord = listMinusy.find(function(m) { return m && m.nazwisko && czyToSamoNazwisko(m.nazwisko, nClean); });
      if (userMinusRecord && userMinusRecord.szczegolyMinusow) {
        userMinusRecord.szczegolyMinusow.forEach(function(sm) {
          if (sm && sm.miesiac) {
            var pts = parseInt(sm.punkty, 10);
            if (isNaN(pts)) pts = 0;
            minusyByMonth[sm.miesiac] = (minusyByMonth[sm.miesiac] || 0) + pts;
          }
        });
      }

      var tarczaCount = 0;
      var niezawodnyCount = 0;
      var rycerzCount = 0;
      var zlotoCount = 0;
      var podiumCount = 0;

      var punktyPoMiesiacach = (itemRok && itemRok.punktyPoMiesiacach) ? itemRok.punktyPoMiesiacach : [];
      var biezacyMiesiacNazwa = stan.nazwaMiesiaca || (typeof pobierzAktywnaNazweMiesiaca === 'function' ? pobierzAktywnaNazweMiesiaca() : "Październik");

      punktyPoMiesiacach.forEach(function(pm) {
        if (!pm || pm.punkty === undefined || pm.punkty === null) return;
        var czyBiezacy = (pm.miesiac === biezacyMiesiacNazwa || (pm.miesiacIdx !== undefined && pm.miesiacIdx === currentMonthIdx));
        if (czyBiezacy) {
          if (b1Unlocked) tarczaCount++;
          if (b2Unlocked) niezawodnyCount++;
          if (b3Unlocked) rycerzCount++;
          var biezacaPoz = pm.pozycja;
          var curRankM = (stan.rankingMiesiac || (tabelaMiesiacaDane && tabelaMiesiacaDane.rankingMiesiac) || []);
          if (curRankM && curRankM.length > 0) {
            var rmFind = curRankM.find(function(r) { return czyToSamoNazwisko(r.nazwisko, nazwisko); });
            if (rmFind && (rmFind.pozycja || rmFind.miejsce)) biezacaPoz = rmFind.pozycja || rmFind.miejsce;
          }
          if (biezacaPoz === 1) zlotoCount++;
          else if (biezacaPoz === 2 || biezacaPoz === 3) podiumCount++;
          return;
        }

        // Poprzednie miesiące (od stycznia):
        var minWDanymMiesiacu = minusyByMonth[pm.miesiac] || 0;
        var czyCzysteKonto = (minWDanymMiesiacu === 0 && pm.punkty >= 2);
        var czyPodiumMies = (pm.pozycja === 2 || pm.pozycja === 3);
        var czyZwyciezcaMies = (pm.pozycja === 1);

        if (czyCzysteKonto) {
          tarczaCount++;
          niezawodnyCount++;
          rycerzCount++;
        } else if (minWDanymMiesiacu > -10 && pm.punkty > 10) {
          rycerzCount++;
        }

        if (czyZwyciezcaMies) {
          zlotoCount++;
        } else if (czyPodiumMies) {
          podiumCount++;
        }
      });

      var odznakiZdobyteCalyRok = tarczaCount + niezawodnyCount + rycerzCount + zlotoCount + podiumCount + ratownikCountRoczny + wymianaCountRoczny;
      var bonusXp = (tarczaCount * 10) + (niezawodnyCount * 10) + (rycerzCount * 10) + (zlotoCount * 25) + (podiumCount * 15) + (ratownikCountRoczny * 15) + (wymianaCountRoczny * 10);
      var calkowiteXp = bazaXp + bonusXp;

      // 5. Passa (płomień ciągłej wiernej służby liczony wstecz od stycznia 2026 do dzisiaj)
      var listaWszystkichMiesiecy = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
      var passaLicznik = 0;
      var wZagrozeniu = false;
      var broken = false;

      // Sprawdzenie ogólnej aktywności ministranta w służbie
      var prevMonthIdx = (currentMonthIdx > 0) ? (currentMonthIdx - 1) : 11;
      var nazwaPoprzedniegoMiesiaca = (prevMonthIdx >= 0 && prevMonthIdx < listaWszystkichMiesiecy.length) ? listaWszystkichMiesiecy[prevMonthIdx] : "";
      var pmPrev = punktyPoMiesiacach.find(function(p) { return p && (p.miesiac === nazwaPoprzedniegoMiesiaca || (p.miesiacIdx !== undefined && p.miesiacIdx === prevMonthIdx)); });
      var activeInPrevMonth = (pmPrev && pmPrev.punkty !== undefined && pmPrev.punkty > 0);
      var isCurrentlyActive = (obsluzoneSluzbyBiezacy > 0) || activeInPrevMonth;

      if (!isCurrentlyActive) {
        passaLicznik = 0;
      } else {
        // A. Analiza bieżącego miesiąca (od aktualnego tygodnia wstecz)
        var curWeekIdx = 0;
        for (var tw = 0; tw < tygodnieSluzb.length; tw++) {
          if (currentDay >= tygodnieSluzb[tw].start && currentDay <= tygodnieSluzb[tw].end) {
            curWeekIdx = tw;
            break;
          }
          if (currentDay > tygodnieSluzb[tw].end) {
            curWeekIdx = tw;
          }
        }

        for (var wIdx = curWeekIdx; wIdx >= 0; wIdx--) {
          var tygM = tygodnieSluzb[wIdx];
          if (tygM.minus > 0) {
            if (wIdx === curWeekIdx) {
              wZagrozeniu = true;
            }
            broken = true;
            break;
          }
          passaLicznik++;
        }

        // B. Jeśli passy nie przerwał żaden minus w bieżącym miesiącu, cofamy się przez poprzednie miesiące (od sierpnia do stycznia)
        if (!broken && currentMonthIdx > 0) {
          for (var m = currentMonthIdx - 1; m >= 0; m--) {
            var mNazwa = listaWszystkichMiesiecy[m];
            var pmHist = punktyPoMiesiacach.find(function(p) { 
              return p && (p.miesiac === mNazwa || (p.miesiacIdx !== undefined && p.miesiacIdx === m)); 
            });

            // Jeśli ministrant w tym miesiącu w ogóle nie służył (nie dołączył jeszcze lub długa przerwa), passa zatrzymuje się na początku jego służby
            if (!pmHist || pmHist.punkty === undefined || pmHist.punkty === null || pmHist.punkty <= 0) {
              break;
            }

            var minsInM = [];
            if (userMinusRecord && userMinusRecord.szczegolyMinusow) {
              userMinusRecord.szczegolyMinusow.forEach(function(sm) {
                if (sm && (sm.miesiac === mNazwa || (sm.miesiacIdx !== undefined && sm.miesiacIdx === m))) {
                  minsInM.push(sm);
                }
              });
            }

            if (minsInM.length === 0) {
              // Czysty miesiąc bez żadnego minusa: +4 tygodnie wiernej służby
              passaLicznik += 4;
            } else {
              // Miesiąc miał minus(y) - wyznaczamy najpóźniejszy dzień minusa w tym miesiącu
              var maxDzienMinusa = 0;
              minsInM.forEach(function(sm) {
                var dVal = (sm && typeof sm.dzien === 'number') ? sm.dzien : 1;
                if (dVal > maxDzienMinusa) maxDzienMinusa = dVal;
              });

              var tygMinusa = (maxDzienMinusa <= 7) ? 1 : ((maxDzienMinusa <= 14) ? 2 : ((maxDzienMinusa <= 21) ? 3 : 4));
              var czysteTygodniePoMinusie = Math.max(0, 4 - tygMinusa);
              passaLicznik += czysteTygodniePoMinusie;
              break; // minus przerywa dalsze cofanie się w czasie
            }
          }
        }
      }

      var rangaInfo = wyznaczRangeGamifikacji(calkowiteXp);

      // Zapis do Firestore w tle dla trwałej persystencji
      if (typeof dbFirestore !== 'undefined' && dbFirestore && nClean && (b1Unlocked || b2Unlocked || b3Unlocked || bonusXp > 0)) {
        try {
          var mDocId = stan.nazwaMiesiaca ? (stan.nazwaMiesiaca + '_' + currentYear) : pobierzAktywnyKluczMiesiaca();
          dbFirestore.collection('gamifikacja').doc(nClean).set({
            nazwisko: nClean,
            ostatniaAktualizacja: firebase.firestore.FieldValue.serverTimestamp(),
            odznaki: {
              zelaznaTarcza: b1Unlocked,
              niezawodny: b2Unlocked,
              niedzielnyRycerz: b3Unlocked
            },
            roczneOdznaki: {
              tarczaCount: tarczaCount,
              niezawodnyCount: niezawodnyCount,
              rycerzCount: rycerzCount,
              zlotoCount: zlotoCount,
              podiumCount: podiumCount,
              odznakiZdobyteCalyRok: odznakiZdobyteCalyRok,
              bonusXp: bonusXp
            },
            miesiac: mDocId,
            passa: passaLicznik,
            xp: calkowiteXp
          }, { merge: true }).catch(function() {});
        } catch(eG) {}
      }

      return {
        nazwisko: nClean,
        stopien: stopienLit.stopien,
        grupa: userGrupa,
        ranga: rangaInfo,
        calkowiteXp: calkowiteXp,
        bazaXp: bazaXp,
        bonusXp: bonusXp,
        bonusOdznakiXp: bonusXp,
        punktyMiesiac: punktyMiesiac,
        minusyRok: minusyRok,
        passa: passaLicznik,
        wZagrozeniu: wZagrozeniu,
        odznakiZdobyteBiezacy: odznakiZdobyteBiezacy,
        odznakiZdobyteCalyRok: odznakiZdobyteCalyRok,
        rocznePodsumowanie: {
          tarczaCount: tarczaCount,
          niezawodnyCount: niezawodnyCount,
          rycerzCount: rycerzCount,
          zlotoCount: zlotoCount,
          podiumCount: podiumCount,
          przejeciaCount: ratownikCountRoczny,
          wymianyCount: wymianaCountRoczny
        },
        odznaki: {
          zelaznaTarcza: { odblokowana: b1Unlocked, failed: b1Failed, statusText: b1StatusText, desc: b1Desc },
          niezawodny: { odblokowana: b2Unlocked, failed: b2Failed, statusText: b2StatusText, desc: b2Desc },
          niedzielnyRycerz: { odblokowana: b3Unlocked, failed: b3Failed, statusText: b3StatusText, desc: b3Desc },
          przejecieDyzuru: { odblokowana: b4Unlocked, failed: false, statusText: b4StatusText, desc: b4Desc },
          udanaWymiana: { odblokowana: b5Unlocked, failed: false, statusText: b5StatusText, desc: b5Desc }
        }
      };
    }

    var aktualnyProfilNazwisko = "";

    function otworzProfilMinistranta(nazwisko) {
      if (!nazwisko) return;
      aktualnyProfilNazwisko = nazwisko;
      var g = null;
      try {
        g = obliczGamifikacjeMinistranta(nazwisko);
      } catch(e) {
        console.warn('Błąd obliczania profilu gamifikacji:', e);
      }
      if (!g) {
        g = {
          nazwisko: nazwisko,
          stopien: "Ministrant",
          grupa: (typeof wyznaczGrupeParafialna === 'function') ? wyznaczGrupeParafialna(nazwisko, "") : "I GRUPA (CZERWONA)",
          ranga: wyznaczRangeGamifikacji(0),
          calkowiteXp: 0,
          bazaXp: 0,
          punktyMiesiac: 0,
          passa: 1,
          wZagrozeniu: false,
          odznakiZdobyte: 0,
          odznaki: {
            zelaznaTarcza: { odblokowana: false, failed: false, statusText: "W toku", desc: "Czyste konto: 0 nieusprawiedliwionych minusów." },
            niezawodny: { odblokowana: false, failed: false, statusText: "W toku", desc: "100% obecności na wszystkich swoich wyznaczonych dyżurach." },
            niedzielnyRycerz: { odblokowana: false, failed: false, statusText: "W toku", desc: "100% obecności na swoich mszach niedzielnych." }
          }
        };
      }

      var currentLogged = (globalUser && globalUser.nazwisko || "").trim().toLowerCase();
      var isMe = currentLogged && (g.nazwisko.toLowerCase().indexOf(currentLogged) !== -1 || currentLogged.indexOf(g.nazwisko.toLowerCase()) !== -1);

      // 1. Nagłówek
      var elNazw = document.getElementById('profil-nazwisko');
      var elTagTy = document.getElementById('profil-tag-ty');
      var elAvatarBox = document.getElementById('profil-avatar-box');
      var elStopien = document.getElementById('profil-stopien-badge');
      var elGrupa = document.getElementById('profil-grupa-badge');

      if (elNazw) elNazw.innerText = g.nazwisko;
      if (elTagTy) elTagTy.style.display = isMe ? 'inline-block' : 'none';
      if (elAvatarBox) {
        elAvatarBox.innerText = g.ranga.icon;
        elAvatarBox.style.borderColor = g.ranga.kolor;
      }
      if (elStopien) elStopien.innerText = g.stopien;
      if (elGrupa) elGrupa.innerText = g.grupa;

      // 2. Karta Rangi i XP
      var elRangaIkona = document.getElementById('profil-ranga-ikona');
      var elRangaNazwa = document.getElementById('profil-ranga-nazwa');
      var elPoziomNr = document.getElementById('profil-poziom-numer');
      var elXpSuma = document.getElementById('profil-xp-suma');
      var elXpBar = document.getElementById('profil-xp-bar');
      var elXpProgres = document.getElementById('profil-xp-progres-tekst');
      var elXpDoNast = document.getElementById('profil-xp-do-nastepnego');

      if (elRangaIkona) elRangaIkona.innerText = g.ranga.icon;
      if (elRangaNazwa) {
        elRangaNazwa.innerText = g.ranga.nazwa;
        elRangaNazwa.style.color = g.ranga.kolor;
      }
      var elRangaOpis = document.getElementById('profil-ranga-opis');
      if (elRangaOpis) {
        elRangaOpis.innerText = g.ranga.opis || '';
      }
      if (elPoziomNr) {
        elPoziomNr.innerText = 'Lvl ' + g.ranga.lvl;
        elPoziomNr.style.background = g.ranga.bg;
        elPoziomNr.style.color = g.ranga.kolor;
      }
      if (elXpSuma) elXpSuma.innerText = g.calkowiteXp + ' XP';
      if (elXpBar) {
        elXpBar.style.width = g.ranga.procent + '%';
        elXpBar.style.background = '#06b6d4'; elXpBar.style.boxShadow = '0 0 10px rgba(6,182,212,0.6)';
      }
      if (elXpProgres) elXpProgres.innerText = g.calkowiteXp + ' / ' + g.ranga.zakresKonca + ' XP (' + g.ranga.procent + '%)';
      if (elXpDoNast) {
        if (g.ranga.brakujeDoNast > 0) {
          elXpDoNast.innerText = 'Brakuje ' + g.ranga.brakujeDoNast + ' XP do rangi ' + g.ranga.nastepnaNazwa;
        } else {
          elXpDoNast.innerText = 'Gratulacje! Najwyższy stopień w Zakonie Jedi';
        }
      }

      // 3. Passa
      var elPassaLicznik = document.getElementById('profil-passa-licznik');
      var elPassaTytul = document.getElementById('profil-passa-tytul');
      var elPassaOpis = document.getElementById('profil-passa-opis');
      var elPassaIkona = document.getElementById('profil-passa-ikona');
      var elPassaKarta = document.getElementById('profil-passa-karta');

      if (elPassaLicznik) elPassaLicznik.innerText = g.passa + ' tyg.';
      if (elPassaTytul) {
        if (g.wZagrozeniu) {
          elPassaTytul.innerText = 'Passa zagrożona!';
        } else if (g.passa === 0) {
          elPassaTytul.innerText = 'Brak aktywnej passy';
        } else {
          elPassaTytul.innerText = 'Passa: ' + g.passa + ' ' + formatTygodnieSlownie(g.passa) + ' z rzędu';
        }
      }
      if (elPassaOpis) {
        if (g.wZagrozeniu) {
          elPassaOpis.innerText = 'Bądź obecny na najbliższej służbie, aby ocalić płomień!';
        } else if (g.passa === 0) {
          elPassaOpis.innerText = 'Bądź regularnie obecny na służbach, aby rozpalić płomień passy!';
        } else if (g.passa >= 10) {
          elPassaOpis.innerText = 'Wzorowa wierność ołtarzowi! Już ' + g.passa + ' ' + formatTygodnieSlownie(g.passa) + ' bez nieusprawiedliwionego minusa.';
        } else {
          elPassaOpis.innerText = 'Regularna służba bez nieusprawiedliwionych minusów.';
        }
      }
      if (elPassaIkona) {
        if (g.wZagrozeniu) elPassaIkona.innerText = '!';
        else if (g.passa >= 10) elPassaIkona.innerText = '★';
        else if (g.passa > 0) elPassaIkona.innerText = '▲';
        else elPassaIkona.innerText = '—';
      }
      if (elPassaKarta) {
        if (g.wZagrozeniu) {
          elPassaKarta.style.background = 'rgba(239, 68, 68, 0.1)';
          elPassaKarta.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        } else if (g.passa >= 10) {
          elPassaKarta.style.background = 'rgba(251,191,36,0.08)'; elPassaKarta.style.borderColor='rgba(251,191,36,0.3)';
          elPassaKarta.style.borderColor = '#fde68a';
        } else if (g.passa === 0) {
          elPassaKarta.style.background = '#18181b'; elPassaKarta.style.borderColor='#27272a';
          elPassaKarta.style.borderColor = '#e4e4e7';
        } else {
          elPassaKarta.style.background = '#18181b'; elPassaKarta.style.borderColor='#27272a';
          elPassaKarta.style.borderColor = '#fed7aa';
        }
      }

      // 4. Roczny dorobek odznak i osiągnięć (od stycznia 2026)
      var elRocznyBonus = document.getElementById('profil-roczny-bonus-xp');
      var elRocznaLista = document.getElementById('profil-roczne-odznaki-lista');
      if (elRocznyBonus) {
        elRocznyBonus.innerText = '+' + (g.bonusXp || 0) + ' XP z odznak';
      }
      if (elRocznaLista) {
        var rp = g.rocznePodsumowanie || {};
        var badgesHtml = '';
        if (rp.tarczaCount > 0) {
          badgesHtml += '<div style="background:rgba(30,41,59,0.4); border:1px solid rgba(148,163,184,0.45); border-radius:6px; padding:4px 8px; font-size:11px; font-weight:600; color:#cbd5e1; display:inline-flex; align-items:center; gap:6px;">Tarcza Beskaru <span style="background:#0f172a; color:#f8fafc; border:1px solid rgba(148,163,184,0.3); border-radius:9999px; padding:0 6px; font-size:10px; font-weight:700;">x' + rp.tarczaCount + '</span></div>';
        }
        if (rp.niezawodnyCount > 0) {
          badgesHtml += '<div style="background:rgba(6,78,59,0.35); border:1px solid rgba(16,185,129,0.45); border-radius:6px; padding:4px 8px; font-size:11px; font-weight:600; color:#6ee7b7; display:inline-flex; align-items:center; gap:6px;">Strażnik Świątyni <span style="background:#064e3b; color:#a7f3d0; border:1px solid rgba(16,185,129,0.3); border-radius:9999px; padding:0 6px; font-size:10px; font-weight:700;">x' + rp.niezawodnyCount + '</span></div>';
        }
        if (rp.rycerzCount > 0) {
          badgesHtml += '<div style="background:rgba(76,29,149,0.35); border:1px solid rgba(139,92,246,0.45); border-radius:6px; padding:4px 8px; font-size:11px; font-weight:600; color:#c4b5fd; display:inline-flex; align-items:center; gap:6px;">Rycerz Jedi <span style="background:#4c1d95; color:#ddd6fe; border:1px solid rgba(139,92,246,0.3); border-radius:9999px; padding:0 6px; font-size:10px; font-weight:700;">x' + rp.rycerzCount + '</span></div>';
        }
        if (rp.zlotoCount > 0) {
          badgesHtml += '<div style="background:rgba(120,53,15,0.35); border:1px solid rgba(245,158,11,0.5); border-radius:6px; padding:4px 8px; font-size:11px; font-weight:600; color:#fcd34d; display:inline-flex; align-items:center; gap:6px;">Mistrz Miesiąca <span style="background:#78350f; color:#fef08a; border:1px solid rgba(245,158,11,0.4); border-radius:9999px; padding:0 6px; font-size:10px; font-weight:700;">x' + rp.zlotoCount + '</span></div>';
        }
        if (rp.podiumCount > 0) {
          badgesHtml += '<div style="background:rgba(88,28,135,0.35); border:1px solid rgba(168,85,247,0.5); border-radius:6px; padding:4px 8px; font-size:11px; font-weight:600; color:#e9d5ff; display:inline-flex; align-items:center; gap:6px;">Na Podium <span style="background:#581c87; color:#f5d0fe; border:1px solid rgba(168,85,247,0.4); border-radius:9999px; padding:0 6px; font-size:10px; font-weight:700;">x' + rp.podiumCount + '</span></div>';
        }
        if (rp.przejeciaCount > 0) {
          badgesHtml += '<div style="background:rgba(30,58,138,0.35); border:1px solid rgba(59,130,246,0.45); border-radius:6px; padding:4px 8px; font-size:11px; font-weight:600; color:#93c5fd; display:inline-flex; align-items:center; gap:6px;">Wsparcie Eskadry <span style="background:#1e3a8a; color:#bfdbfe; border:1px solid rgba(59,130,246,0.3); border-radius:9999px; padding:0 6px; font-size:10px; font-weight:700;">x' + rp.przejeciaCount + '</span></div>';
        }
        if (rp.wymianyCount > 0) {
          badgesHtml += '<div style="background:rgba(131,24,67,0.35); border:1px solid rgba(236,72,153,0.45); border-radius:6px; padding:4px 8px; font-size:11px; font-weight:600; color:#f472b6; display:inline-flex; align-items:center; gap:6px;">Łowca Nagród <span style="background:#831843; color:#fbcfe8; border:1px solid rgba(236,72,153,0.3); border-radius:9999px; padding:0 6px; font-size:10px; font-weight:700;">x' + rp.wymianyCount + '</span></div>';
        }
        if (!badgesHtml) {
          badgesHtml = '<span style="font-size:11px; color:#71717a; font-style:italic;">Brak odznak w tym sezonie — służ regularnie, aby je zdobyć!</span>';
        }
        elRocznaLista.innerHTML = badgesHtml + '<div style="width:100%; font-size:10px; color:#71717a; margin-top:8px; padding-top:6px; border-top:1px dashed #e4e4e7;">Wartości XP: misje miesięczne +10 XP • przejęcie dyżuru +15 XP • podium +15 XP • mistrz miesiąca +25 XP</div>';
      }

      // Licznik bieżącego miesiąca
      var elOdznakiLicznik = document.getElementById('profil-odznaki-zdobyte-licznik');
      if (elOdznakiLicznik) elOdznakiLicznik.innerText = (g.odznakiZdobyteBiezacy || 0) + ' / 5';

      function ustawKafelekOdznaki(prefixId, badgeData) {
        var cardEl = document.getElementById('badge-card-' + prefixId);
        var statusEl = document.getElementById('badge-status-' + prefixId);
        var descEl = document.getElementById('badge-desc-' + prefixId);

        if (cardEl) {
          cardEl.className = 'badge-showcase-item' + (badgeData.odblokowana ? ' unlocked' : (badgeData.failed ? ' failed' : ' in-progress'));
        }
        if (statusEl) {
          statusEl.innerText = badgeData.statusText;
          if (badgeData.odblokowana) {
            statusEl.style.background = 'rgba(16, 185, 129, 0.15)';
            statusEl.style.color = '#34d399';
            statusEl.style.borderColor = 'rgba(16, 185, 129, 0.35)';
          } else if (badgeData.failed) {
            if (badgeData.statusText && badgeData.statusText.indexOf('absencja') !== -1) {
              statusEl.style.background = 'rgba(245, 158, 11, 0.15)';
              statusEl.style.color = '#fbbf24';
              statusEl.style.borderColor = 'rgba(245, 158, 11, 0.35)';
            } else {
              statusEl.style.background = 'rgba(239, 68, 68, 0.15)';
              statusEl.style.color = '#f87171';
              statusEl.style.borderColor = 'rgba(239, 68, 68, 0.35)';
            }
          } else {
            // W toku (aktywna, do zdobycia) - żywy, świecący błękit
            statusEl.style.background = 'rgba(6, 182, 212, 0.12)';
            statusEl.style.color = '#38bdf8';
            statusEl.style.borderColor = 'rgba(6, 182, 212, 0.35)';
          }
        }
        if (descEl) {
          descEl.innerText = badgeData.desc;
        }
      }

      ustawKafelekOdznaki('zelazna-tarcza', g.odznaki.zelaznaTarcza);
      ustawKafelekOdznaki('niezawodny', g.odznaki.niezawodny);
      ustawKafelekOdznaki('niedzielny-rycerz', g.odznaki.niedzielnyRycerz);
      if (g.odznaki.przejecieDyzuru) ustawKafelekOdznaki('przejecie-dyzuru', g.odznaki.przejecieDyzuru);
      if (g.odznaki.udanaWymiana) ustawKafelekOdznaki('udana-wymiana', g.odznaki.udanaWymiana);

      // 5. Statystyki punktów i XP
      var elStatMies = document.getElementById('profil-stat-miesiac');
      var elStatRok = document.getElementById('profil-stat-rok');
      var elStatBonus = document.getElementById('profil-stat-bonus-xp');
      var elStatTotal = document.getElementById('profil-stat-total-xp');

      if (elStatMies) elStatMies.innerText = (g.punktyMiesiac > 0 ? '+' : '') + g.punktyMiesiac + ' pkt';
      if (elStatRok) elStatRok.innerText = (g.bazaXp > 0 ? '+' : '') + g.bazaXp + ' XP';
      if (elStatBonus) elStatBonus.innerText = '+' + (g.bonusXp || 0) + ' XP';
      if (elStatTotal) elStatTotal.innerText = g.calkowiteXp + ' XP';

      var elStatMinus = document.getElementById('profil-stat-minus-rok');
      var elStatMinusOpis = document.getElementById('profil-stat-minus-opis');
      if (elStatMinus) {
        var uMinus = (g.minusyRok !== undefined) ? g.minusyRok : 0;
        if (uMinus < 0) {
          elStatMinus.innerText = uMinus + ' pkt';
          elStatMinus.style.color = '#f87171';
          if (elStatMinusOpis) elStatMinusOpis.innerText = 'Nieobecności i minusy od początku roku';
        } else {
          elStatMinus.innerText = '0 pkt';
          elStatMinus.style.color = '#34d399';
          if (elStatMinusOpis) elStatMinusOpis.innerText = 'Czyste konto w całym roku!';
        }
      }

      // 6. Przycisk historii miesięcy
      var btnHist = document.getElementById('btn-profil-historia-roku');
      if (btnHist) {
        btnHist.onclick = function() {
          zamknijProfilMinistranta();
          pokazSzczegolyPunktowRoku(g.nazwisko);
        };
      }

      var modal = document.getElementById('modal-profil-ministranta');
      if (modal) modal.style.display = 'flex';
    }

    function otworzMojProfil() {
      var nazw = (globalUser && globalUser.nazwisko) ? globalUser.nazwisko : (localStorage.getItem('min_name') || '');
      if (nazw) {
        otworzProfilMinistranta(nazw);
      } else {
        pokazToast('Zaloguj się, aby zobaczyć swój profil.');
      }
    }

    function zamknijProfilMinistranta() {
      var modal = document.getElementById('modal-profil-ministranta');
      if (modal) modal.style.display = 'none';
    }

    function zaktualizujGamifikacjePulpitu(nazwisko) {
      if (!nazwisko) return;
      var g = obliczGamifikacjeMinistranta(nazwisko);
      if (!g) return;

      var rIcon = document.getElementById('dashboard-rank-icon');
      var rName = document.getElementById('dashboard-rank-name');
      var rLvl = document.getElementById('dashboard-rank-lvl');
      var rSub = document.getElementById('dashboard-rank-sub');
      var fVal = document.getElementById('dashboard-flame-val');
      var xpText = document.getElementById('dashboard-xp-text');
      var xpProc = document.getElementById('dashboard-xp-procent');
      var xpBar = document.getElementById('dashboard-xp-bar');

      if (rIcon) {
        rIcon.innerText = g.ranga.icon;
        rIcon.style.borderColor = g.ranga.kolor;
      }
      if (rName) {
        rName.innerText = g.ranga.nazwa;
        rName.style.color = '#f8fafc';
      }
      if (rLvl) {
        rLvl.innerText = 'Lvl ' + g.ranga.lvl;
        rLvl.style.background = g.ranga.kolor;
      }
      if (rSub) {
        if (g.ranga.brakujeDoNast > 0) {
          rSub.innerText = g.calkowiteXp + ' XP • Brakuje ' + g.ranga.brakujeDoNast + ' XP do ' + g.ranga.nastepnaNazwa;
        } else {
          rSub.innerText = g.calkowiteXp + ' XP • Maksymalny poziom';
        }
      }
      if (fVal) {
        var flameIcon = '';
        fVal.innerText = g.passa + " tyg.";
        fVal.style.color = g.wZagrozeniu ? '#f87171' : (g.passa >= 10 ? '#facc15' : (g.passa > 0 ? '#fb923c' : '#94a3b8'));
      }
      if (xpText) xpText.innerText = g.calkowiteXp + ' / ' + g.ranga.zakresKonca + ' XP';
      if (xpProc) xpProc.innerText = g.ranga.procent + '%';
      if (xpBar) {
        xpBar.style.width = g.ranga.procent + '%';
        xpBar.style.background = '#06b6d4'; xpBar.style.boxShadow = '0 0 10px rgba(6,182,212,0.6)';
      }
    }