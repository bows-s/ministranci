// =============================================================
    // STAN APLIKACJI I ZMIENNE
    // =============================================================
    var globalUser = { nazwisko: '', pin: '', stan: null };
    var listaUzytkownikowDomyslna = [
      { nazwisko: "Bartosz Rozik", maPin: false },
      { nazwisko: "Emil Czech", maPin: false },
      { nazwisko: "Franek Kik", maPin: false },
      { nazwisko: "Jakub Brytner", maPin: false },
      { nazwisko: "Jan Radliński", maPin: false },
      { nazwisko: "Ksawery Skrzypek", maPin: false },
      { nazwisko: "Maciej Erich", maPin: true },
      { nazwisko: "Maks Erich", maPin: true },
      { nazwisko: "Marcel Mazurkiewicz", maPin: false },
      { nazwisko: "Mateusz Pierścieński", maPin: false },
      { nazwisko: "Michał Danielczok", maPin: true },
      { nazwisko: "Michał Kupiec", maPin: false },
      { nazwisko: "Mikołaj Erich", maPin: true },
      { nazwisko: "Paweł Głaz", maPin: true },
      { nazwisko: "Rafał Danielczok", maPin: false },
      { nazwisko: "Wiktor Kowalski", maPin: false }
    ];

    var listaUzytkownikow = (function() {
      try {
        var c = localStorage.getItem('min_cached_users');
        if (c) {
          var p = JSON.parse(c);
          if (Array.isArray(p) && p.length > 0) return p;
        }
      } catch(e) {}
      return listaUzytkownikowDomyslna;
    })();

    var wybranyDzienTydzien = null;
    var wybranyDzienTydzienKey = null;
    var wybranaSluzbaTydzienObj = null;
    var aktywneDyzuryTydzienLista = [];

    var wybranyDzienNiedziela = null;
    var wybranyDzienNiedzielaKey = null;
    var wybranaSluzbaWeekendObj = null;
    var dostepneWeekendyLista = [];

    var aktualnyTekstWhatsApp = '';
    var mapaTekstowOfert = {};
    var pelneNazwyDni = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
    var deferredPrompt = null;

    var toastTimeout = null;
    function pokazToast(tresc, czasMs) {
      var t = document.getElementById("toast");
      if (!t) return;
      t.innerText = tresc;
      t.classList.add("show");
      if (toastTimeout) clearTimeout(toastTimeout);
      toastTimeout = setTimeout(function() {
        t.classList.remove("show");
      }, czasMs || 4000);
    }

    function pokazSpinner(tekst) {
      var sp = document.getElementById('global-spinner');
      var st = document.getElementById('spinner-text');
      if (!sp) return;
      if (st) st.innerText = tekst || 'Ładowanie...';
      sp.style.display = 'flex';
      void sp.offsetHeight; // reflow dla animacji
      sp.classList.add('widoczny');
    }

    function ukryjSpinner(natychmiast) {
      var sp = document.getElementById('global-spinner');
      if (!sp) return;
      sp.classList.remove('widoczny');
      if (natychmiast) {
        sp.style.display = 'none';
      } else {
        setTimeout(function() {
          if (!sp.classList.contains('widoczny')) {
            sp.style.display = 'none';
          }
        }, 260);
      }
    }

    var refreshStartTime = 0;
    var refreshTimer = null;

    function pokazMiniRefresh(widoczny) {
      var ind = document.getElementById('mini-refresh-indicator');
      if (ind) ind.style.display = 'none';
      var icons = document.querySelectorAll('.refresh-icon');

      if (widoczny) {
        if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null; }
        refreshStartTime = Date.now();
        icons.forEach(function(icon) {
          icon.classList.add('spinning');
        });
      } else {
        var elapsed = Date.now() - refreshStartTime;
        var minDuration = 800; // gwarancja co najmniej 800ms płynnego obrotu
        var remaining = Math.max(0, minDuration - elapsed);

        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = setTimeout(function() {
          icons.forEach(function(icon) {
            icon.classList.remove('spinning');
          });
          refreshTimer = null;
        }, remaining);
      }
    }

    function pobierzDzienTygodnia(rok, miesiacIdx, dzien) {
      var dt = new Date(rok, miesiacIdx, dzien);
      return pelneNazwyDni[dt.getDay()];
    }

    function formatujDateDnia(d, stan, optRok, optMiesiacIdx, optNazwaMiesiaca) {
      if (!d && d !== 0) return '';
      var r = optRok || (stan && stan.rok) || (new Date()).getFullYear();
      var m = (optMiesiacIdx !== undefined && optMiesiacIdx !== null) ? optMiesiacIdx : ((stan && stan.miesiacIdx !== undefined) ? stan.miesiacIdx : (new Date()).getMonth());
      var mNazwa = optNazwaMiesiaca || polishMonthsGenitive[m] || (stan && stan.nazwaMiesiaca) || '';
      var dzienTyg = pobierzDzienTygodnia(r, m, d);
      return d + ' ' + mNazwa + (dzienTyg ? ' (' + dzienTyg + ')' : '');
    }

    function pobierzGodzineDlaDniaTygodnia(rok, miesiacIdx, dzien) {
      if (dzien) {
        var hD = null;
        if (typeof tabelaMiesiacaDane !== 'undefined' && tabelaMiesiacaDane && tabelaMiesiacaDane.harmonogramDni) {
          hD = tabelaMiesiacaDane.harmonogramDni[dzien] || tabelaMiesiacaDane.harmonogramDni['' + dzien];
        }
        if (!hD && typeof daneKolejnegoMiesiaca !== 'undefined' && daneKolejnegoMiesiaca && daneKolejnegoMiesiaca.harmonogramDni) {
          hD = daneKolejnegoMiesiaca.harmonogramDni[dzien] || daneKolejnegoMiesiaca.harmonogramDni['' + dzien];
        }
        if (hD && hD.msze && hD.msze.length > 0) {
          var mItem = hD.msze[0];
          var gC = (typeof cleanTime === 'function') ? cleanTime(mItem.godzina || '') : (mItem.godzina || '');
          if (gC) {
            if (mItem.nazwa && mItem.nazwa.toLowerCase().indexOf('szkol') !== -1) {
              return gC + ' (Msza szkolna)';
            }
            return gC;
          }
        }
      }
      var dt = new Date(rok, miesiacIdx, dzien);
      var dayOfWeek = dt.getDay();
      if (dayOfWeek === 1) return "18:00";
      if (dayOfWeek === 2) return "18:00";
      if (dayOfWeek === 3) return (miesiacIdx === 9) ? "18:00" : "08:00";
      if (dayOfWeek === 4) return "17:00 (Msza szkolna)";
      if (dayOfWeek === 5) return "18:00";
      return "18:00";
    }

    function pobierzGodzineDlaDniaTygodniaModalu(d, optTargetData) {
      var targetData = optTargetData || ((typeof tabelaMiesiacaDane !== 'undefined' && tabelaMiesiacaDane) ? tabelaMiesiacaDane : ((typeof daneKolejnegoMiesiaca !== 'undefined' && daneKolejnegoMiesiaca) ? daneKolejnegoMiesiaca : null));
      var rok = (targetData && targetData.rok) || (new Date()).getFullYear();
      var mIdx = (targetData && targetData.miesiacIdx !== undefined) ? targetData.miesiacIdx : (new Date()).getMonth();

      if (d === 4) return 'godz. 17:00 - msza szkolna';
      if (d === 1 || d === 2 || d === 5) return 'godz. 18:00';

      if (d === 3) {
        // Środa: sprawdź gazetkę (harmonogramDni)
        if (targetData && targetData.harmonogramDni) {
          for (var dayKey in targetData.harmonogramDni) {
            var dayNum = parseInt(dayKey, 10);
            if (!isNaN(dayNum)) {
              var dt = new Date(rok, mIdx, dayNum);
              if (dt.getDay() === 3) {
                var hD = targetData.harmonogramDni[dayKey];
                if (hD && hD.msze && hD.msze.length > 0) {
                  return 'godz. ' + hD.msze[0].godzina;
                }
              }
            }
          }
        }
        var isPazdziernik = (mIdx === 9 || (targetData && (targetData.nazwaMiesiaca === 'Październik' || targetData.sheetName === 'Październik')));
        return isPazdziernik ? 'godz. 18:00' : 'godz. 08:00';
      }

      return 'godz. 18:00';
    }

    function wyznaczGodzinyDniTygodnia(optTargetData) {
      return [
        '',
        pobierzGodzineDlaDniaTygodniaModalu(1, optTargetData),
        pobierzGodzineDlaDniaTygodniaModalu(2, optTargetData),
        pobierzGodzineDlaDniaTygodniaModalu(3, optTargetData),
        pobierzGodzineDlaDniaTygodniaModalu(4, optTargetData),
        pobierzGodzineDlaDniaTygodniaModalu(5, optTargetData)
      ];
    }

    function czyKtosMaDyzurWTymDniu(dzien, optRok, optMiesiacIdx, optDocKey) {
      if (!dzien) return false;
      var targetData = null;
      if (optDocKey) {
        if (typeof tabelaMiesiacaDane !== 'undefined' && tabelaMiesiacaDane && (tabelaMiesiacaDane.docId === optDocKey || wyznaczKluczMiesiaca(new Date(tabelaMiesiacaDane.rok, tabelaMiesiacaDane.miesiacIdx, 1)) === optDocKey)) {
          targetData = tabelaMiesiacaDane;
        } else if (typeof daneKolejnegoMiesiaca !== 'undefined' && daneKolejnegoMiesiaca && (daneKolejnegoMiesiaca.docId === optDocKey || wyznaczKluczMiesiaca(new Date(daneKolejnegoMiesiaca.rok, daneKolejnegoMiesiaca.miesiacIdx, 1)) === optDocKey)) {
          targetData = daneKolejnegoMiesiaca;
        }
      }
      if (!targetData && optRok !== undefined && optMiesiacIdx !== undefined) {
        if (typeof tabelaMiesiacaDane !== 'undefined' && tabelaMiesiacaDane && tabelaMiesiacaDane.rok === optRok && tabelaMiesiacaDane.miesiacIdx === optMiesiacIdx) {
          targetData = tabelaMiesiacaDane;
        } else if (typeof daneKolejnegoMiesiaca !== 'undefined' && daneKolejnegoMiesiaca && daneKolejnegoMiesiaca.rok === optRok && daneKolejnegoMiesiaca.miesiacIdx === optMiesiacIdx) {
          targetData = daneKolejnegoMiesiaca;
        }
      }
      if (!targetData) {
        targetData = (typeof tabelaMiesiacaDane !== 'undefined' && tabelaMiesiacaDane) ? tabelaMiesiacaDane : ((typeof daneKolejnegoMiesiaca !== 'undefined' && daneKolejnegoMiesiaca) ? daneKolejnegoMiesiaca : null);
      }
      if (!targetData || !targetData.wiersze || !targetData.wiersze.length) {
        return false;
      }
      var colIdx = dzien - 1;
      return targetData.wiersze.some(function(w) {
        return w.komorki && w.komorki[colIdx] && !!w.komorki[colIdx].maDyzur;
      });
    }

    function czyUzytkownikMaDyzurWTymDniu(dzien, optRok, optMiesiacIdx, optDocKey) {
      if (!dzien) return false;
      var myName = (typeof globalUser !== 'undefined' && globalUser && globalUser.nazwisko) ? globalUser.nazwisko.trim() : (localStorage.getItem('min_name') || '');
      if (!myName) return false;
      var targetData = null;
      if (optDocKey) {
        if (typeof tabelaMiesiacaDane !== 'undefined' && tabelaMiesiacaDane && (tabelaMiesiacaDane.docId === optDocKey || wyznaczKluczMiesiaca(new Date(tabelaMiesiacaDane.rok, tabelaMiesiacaDane.miesiacIdx, 1)) === optDocKey)) {
          targetData = tabelaMiesiacaDane;
        } else if (typeof daneKolejnegoMiesiaca !== 'undefined' && daneKolejnegoMiesiaca && (daneKolejnegoMiesiaca.docId === optDocKey || wyznaczKluczMiesiaca(new Date(daneKolejnegoMiesiaca.rok, daneKolejnegoMiesiaca.miesiacIdx, 1)) === optDocKey)) {
          targetData = daneKolejnegoMiesiaca;
        }
      }
      if (!targetData && optRok !== undefined && optMiesiacIdx !== undefined) {
        if (typeof tabelaMiesiacaDane !== 'undefined' && tabelaMiesiacaDane && tabelaMiesiacaDane.rok === optRok && tabelaMiesiacaDane.miesiacIdx === optMiesiacIdx) {
          targetData = tabelaMiesiacaDane;
        } else if (typeof daneKolejnegoMiesiaca !== 'undefined' && daneKolejnegoMiesiaca && daneKolejnegoMiesiaca.rok === optRok && daneKolejnegoMiesiaca.miesiacIdx === optMiesiacIdx) {
          targetData = daneKolejnegoMiesiaca;
        }
      }
      if (!targetData) {
        targetData = (typeof tabelaMiesiacaDane !== 'undefined' && tabelaMiesiacaDane) ? tabelaMiesiacaDane : ((typeof daneKolejnegoMiesiaca !== 'undefined' && daneKolejnegoMiesiaca) ? daneKolejnegoMiesiaca : null);
      }
      if (!targetData || !targetData.wiersze || !targetData.wiersze.length) {
        return false;
      }
      var myRow = targetData.wiersze.find(function(w) { return czyToSamoNazwisko(w.nazwisko, myName); });
      if (!myRow || !myRow.komorki) return false;
      var colIdx = dzien - 1;
      return !!(myRow.komorki[colIdx] && myRow.komorki[colIdx].maDyzur);
    }

    function czyDzienTygodniaMaDyzury(d, optTargetData) {
      // Dni od poniedziałku do piątku (1..5: Poniedziałek, Wtorek, Środa, Czwartek, Piątek)
      // to zawsze pełnoprawne dni powszednie, w których w parafii jest msza św. i można mieć wyznaczony stały dzień służby.
      if (d >= 1 && d <= 5) return true;

      var targetData = optTargetData || ((typeof tabelaMiesiacaDane !== 'undefined' && tabelaMiesiacaDane) ? tabelaMiesiacaDane : ((typeof daneKolejnegoMiesiaca !== 'undefined' && daneKolejnegoMiesiaca) ? daneKolejnegoMiesiaca : null));
      if (!targetData || !targetData.wiersze || !targetData.wiersze.length) return false;
      
      // 1. Sprawdź czy ktokolwiek ma stalyDzienTygodnia === d
      var hasStaly = targetData.wiersze.some(function(w) {
        return w.stalyDzienTygodnia === d;
      });
      if (hasStaly) return true;

      // 2. Sprawdź czy jakikolwiek dzień w miesiącu o tym dniu tygodnia ma przypisany dyżur w komórkach
      var rok = targetData.rok || (new Date()).getFullYear();
      var mIdx = targetData.miesiacIdx !== undefined ? targetData.miesiacIdx : (new Date()).getMonth();
      var daysInMonth = new Date(rok, mIdx + 1, 0).getDate();
      for (var dayNum = 1; dayNum <= daysInMonth; dayNum++) {
        var dt = new Date(rok, mIdx, dayNum);
        if (dt.getDay() === d) {
          if (czyKtosMaDyzurWTymDniu(dayNum, rok, mIdx, targetData.docId)) {
            return true;
          }
        }
      }
      return false;
    }

    function czyToTenSamKluczMiesiaca(k1, k2) {
      if (!k1 || !k2) return false;
      if (k1 === k2) return true;
      var clean = function(s) {
        return String(s || '').toLowerCase()
          .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e').replace(/ł/g, 'l')
          .replace(/ń/g, 'n').replace(/ó/g, 'o').replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z')
          .trim();
      };
      return clean(k1) === clean(k2);
    }
    window.czyToTenSamKluczMiesiaca = czyToTenSamKluczMiesiaca;
