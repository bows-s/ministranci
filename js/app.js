// =============================================================
    // INICJALIZACJA — uruchamia się NATYCHMIAST gdy skrypt jest parsowany.
    // Wszystkie elementy DOM są powyżej tego skryptu w HTML, więc są dostępne.
    // Lista ministrantów jest już w HTML (0 ms czekania)!
    // =============================================================
    var APP_VERSION = '1.6.7';

    function sprawdzWersjeAplikacji() {
      try {
        var savedVer = localStorage.getItem('min_app_ver');
        if (savedVer && savedVer !== APP_VERSION) {
          console.log('Nowa wersja aplikacji:', APP_VERSION);
          localStorage.setItem('min_app_ver', APP_VERSION);
          for (var i = localStorage.length - 1; i >= 0; i--) {
            var k = localStorage.key(i);
            if (k && (k.indexOf('min_cached_') === 0 || k.indexOf('min_staly_') === 0)) {
              localStorage.removeItem(k);
            }
          }
          if ('caches' in window) {
            caches.keys().then(function(names) {
              names.forEach(function(n) { caches.delete(n); });
            });
          }
        } else if (!savedVer) {
          localStorage.setItem('min_app_ver', APP_VERSION);
        }
      } catch(e) {}
    }

    function pokazWidok(widok) {
      if (widok === "zakrystia" && !czyMaDostepDoZakrystii(globalUser ? globalUser.nazwisko : "")) {
        pokazToast("Brak uprawnień. Tryb Zakrystia jest dostępny tylko dla Kościelnego i animatorów.");
        widok = "pulpit";
      }
      var pPulpit = document.getElementById('widok-pulpit');
      var pGielda = document.getElementById('widok-gielda');
      var pZakrystia = document.getElementById('widok-tryb-zakrystia');
      var pTabela = document.getElementById('widok-tabela-miesiaca');
      var btnPulpit = document.getElementById('btn-top-pulpit');

      if (pPulpit) pPulpit.style.display = (widok === 'pulpit' ? 'block' : 'none');
      if (pGielda) pGielda.style.display = (widok === 'gielda' ? 'block' : 'none');
      if (pZakrystia) pZakrystia.style.display = (widok === 'zakrystia' ? 'block' : 'none');
      if (pTabela) pTabela.style.display = (widok === 'tabela' ? 'block' : 'none');

      if (btnPulpit) {
        btnPulpit.style.display = (widok === 'gielda' ? 'inline-block' : 'none');
      }
      var btnTabela = document.getElementById('btn-top-tabela');
      if (btnTabela) {
        btnTabela.style.display = (widok === 'tabela' ? 'none' : 'inline-block');
      }
      var btnRefresh = document.getElementById('btn-top-refresh');
      if (btnRefresh) {
        btnRefresh.style.display = (widok === 'pulpit' || widok === 'gielda' ? 'inline-flex' : 'none');
      }
      if (widok === 'pulpit') {
        sprawdzUprawnieniaZakrystii();
      }
    }

    function zamknijWszystkieWidokiDoPulpitu() {
      document.getElementById('auth-panel').style.display = 'none';
      document.getElementById('app-panel').style.display = 'block';
      pokazWidok('pulpit');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    (function startApp() {
      sprawdzIOS();
      sprawdzWersjeAplikacji();

      // Automatyczna inwalidacja cache przy przełomie miesiąca kalendarzowego
      try {
        var realCalMonth = wyznaczKluczMiesiaca(new Date());
        var lastActiveMonth = localStorage.getItem('min_active_month');
        if (lastActiveMonth && lastActiveMonth !== realCalMonth) {
          console.log('Automatyczna zmiana miesiąca w kalendarzu:', lastActiveMonth, '->', realCalMonth);
          localStorage.removeItem('min_cached_data');
          localStorage.removeItem('min_cached_tabela');
          localStorage.setItem('min_active_month', realCalMonth);
          aktywnyKluczMiesiacaGlobal = realCalMonth;
          wybranyMiesiacTabeli = realCalMonth;
        }
      } catch(eMonth) {}

      zaktualizujSelectMiesiacaTabeli(pobierzAktywnyKluczMiesiaca());

      var pathname = (window.location.pathname || '').toLowerCase();
      var search   = (window.location.search || '').toLowerCase();
      var hash     = (window.location.hash || '').toLowerCase();
      var isZakrystiaRoute = (pathname.indexOf('zakrystia') !== -1 ||
                              search.indexOf('zakrystia') !== -1 ||
                              hash.indexOf('zakrystia') !== -1 ||
                              pathname.indexOf('koscielny') !== -1);

      // ========================================================
      // DEDYKOWANY TRYB ZAKRYSTIA (URL: /zakrystia lub ?zakrystia)
      // ========================================================
      if (isZakrystiaRoute) {
        document.title = 'Zakrystia - Parafia pw. św. Józefa';
        globalUser.nazwisko = 'Kościelny';
        globalUser.pin = '0000';

        document.getElementById('auth-panel').style.display = 'none';
        document.getElementById('app-panel').style.display = 'block';

        // Ukryj pasek ministranta (pulpit, wyloguj itp.)
        var userBar = document.getElementById('user-top-bar');
        if (userBar) userBar.style.display = 'none';

        // Ukryj powrót do pulpitu, pokaż przycisk odświeżenia
        var btnWroc = document.getElementById('btn-zakrystia-wroc');
        if (btnWroc) btnWroc.style.display = 'none';
        var btnOds = document.getElementById('btn-zakrystia-odswiez');
        if (btnOds) btnOds.style.display = 'inline-flex';

        // Otwórz bezpośrednio widok Zakrystii
        pokazWidok('zakrystia');
        ukryjSpinner();
        wczytajDaneDlaZakrystii();
        return;
      }

      var sName = localStorage.getItem('min_name') || '';
      var sPin  = localStorage.getItem('min_pin')  || '';

      // 1. Natychmiastowe załadowanie listy ministrantów z cache (0 ms)
      try {
        var cachedUsers = localStorage.getItem('min_cached_users');
        if (cachedUsers) {
          listaUzytkownikow = JSON.parse(cachedUsers);
          wypelnijSelectUzytkownikow(sName);
        }
      } catch(e) {}

      // 2. Jeśli użytkownik jest już zalogowany:
      if (sName) {
        globalUser.nazwisko = sName;
        globalUser.pin      = sPin;
        document.getElementById('auth-panel').style.display = 'none';
        document.getElementById('app-panel').style.display  = 'block';
        document.getElementById('user-display').innerText   = sName;
        pokazWidok('pulpit');
        sprawdzUprawnieniaZakrystii();
        pokazMiniRefresh(true);

        // Jeśli to Kościelny, od razu otwórz Tryb Zakrystia (oraz dokończ pełną inicjalizację w tle!)
        if (sName.toLowerCase().indexOf('kościelny') !== -1 || sName.toLowerCase().indexOf('koscielny') !== -1) {
          ukryjSpinner();
          otworzTrybZakrystia();
        }

        // Natychmiastowy render pulpitu z cache (0 ms!)
        var cachedData = null;
        try {
          var raw = localStorage.getItem('min_cached_data');
          if (raw) cachedData = JSON.parse(raw);
        } catch(e) {}
        if (cachedData) {
          renderujDane(cachedData);
          ukryjSpinner();
        }

        // Błyskawiczny render z cached tabeli (0 ms!)
        try {
          var rawTbl = localStorage.getItem('min_cached_tabela');
          if (rawTbl) {
            tabelaMiesiacaDane = JSON.parse(rawTbl);
            var stanCached = generujStanZFirestore(sName, tabelaMiesiacaDane);
            if (stanCached) renderujDane(stanCached);
            ukryjSpinner();
          }
        } catch(e) {}
      } else {
        // Niezalogowany: natychmiast ukryj spinner (0 ms!)
        ukryjSpinner();
      }

      // 3. Błyskawiczne pobranie i odświeżenie z Firestore Warszawa (15 ms!)
      if (dbFirestore) {
        // Użytkownicy z PINami
        dbFirestore.collection('konfiguracja').doc('uzytkownicy').get().then(function(doc) {
          if (doc.exists && doc.data() && doc.data().lista) {
            listaUzytkownikow = doc.data().lista;
            try { localStorage.setItem('min_cached_users', JSON.stringify(listaUzytkownikow)); } catch(e) {}
            var curSel = document.getElementById('auth-select-user');
            if (curSel && !curSel.value) {
              wypelnijSelectUzytkownikow(sName);
            }
          }
        }).catch(function(e) { console.warn('Firestore uzytkownicy:', e); });

        // Stałe dni służby i daty ostatnich zmian
        dbFirestore.collection('konfiguracja').doc('stale_dni').get().then(function(doc) {
          if (doc.exists && doc.data()) {
            var sDni = doc.data();
            for (var uName in sDni) {
              if (sDni[uName] && sDni[uName].ostatniaZmiana) {
                try {
                  localStorage.setItem('min_ostatnia_zmiana_dnia_' + encodeURIComponent(uName), sDni[uName].ostatniaZmiana);
                  if (sDni[uName].stalyDzien) {
                    localStorage.setItem('min_staly_dzien_' + encodeURIComponent(uName), String(sDni[uName].stalyDzien));
                  }
                } catch(e) {}
              }
            }
          }
        }).catch(function(e) { console.warn('Firestore stale_dni:', e); });

        // Metadane aktywnego miesiąca z konfiguracji Firestore
        dbFirestore.collection('konfiguracja').doc('ogolna').get().then(function(gDoc) {
          if (gDoc.exists && gDoc.data() && gDoc.data().aktywnyMiesiac) {
            var cfgMiesiac = gDoc.data().aktywnyMiesiac;
            if (cfgMiesiac && cfgMiesiac !== 'auto') {
              if (cfgMiesiac !== aktywnyKluczMiesiacaGlobal) {
                console.log('Synchronizacja aktywnego miesiąca z konfiguracji:', cfgMiesiac);
                aktywnyKluczMiesiacaGlobal = cfgMiesiac;
                wybranyMiesiacTabeli = cfgMiesiac;
                try {
                  localStorage.setItem('min_active_month', cfgMiesiac);
                  localStorage.removeItem('min_cached_data');
                  localStorage.removeItem('min_cached_tabela');
                } catch(e) {}
                odswiezDane();
              }
            } else if (cfgMiesiac === 'auto') {
              var realCalMonth = wyznaczKluczMiesiaca(new Date());
              if (aktywnyKluczMiesiacaGlobal !== realCalMonth) {
                aktywnyKluczMiesiacaGlobal = realCalMonth;
                wybranyMiesiacTabeli = realCalMonth;
                try {
                  localStorage.setItem('min_active_month', realCalMonth);
                  localStorage.removeItem('min_cached_data');
                  localStorage.removeItem('min_cached_tabela');
                } catch(e) {}
                odswiezDane();
              }
            }
          }
        }).catch(function() {});

        // Stan grafiku (Błyskawiczny odczyt z Firestore Warszawa 15 ms!)
        var mDocId = pobierzAktywnyKluczMiesiaca();
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
        }).catch(function(e) {
          ukryjSpinner();
          pokazMiniRefresh(false);
          console.warn('Firestore stan load:', e);
        });

        uruchomNasluchiwanieFirestore();
        wczytajKolejnyMiesiacJesliKoniecMiesiaca();
      } else {
        ukryjSpinner();
        pokazMiniRefresh(false);
      }

      sprawdzStanPowiadomien();
      sprawdzURLParametry();
    })();

// =============================================================
    // RENDEROWANIE DANYCH GRAFIKU I GIEŁDY
    // =============================================================
    function renderKafalekDyzuru(dataHtml, opisHtml, opts) {
      opts = opts || {};
      var style = '';
      if (opts.border) style += 'border-left: 3px solid ' + opts.border + ';';
      if (opts.bg) style += ' background:' + opts.bg + ';';
      var opisStyle = 'color:' + (opts.opisCol || 'var(--text-muted)') + ';' + (opts.bold ? ' font-weight:500;' : '');
      return '<div class="dyzur-pulpit-item"' + (style ? ' style="' + style.trim() + '"' : '') + '>' +
               '<div class="dyzur-pulpit-info">' +
                 '<div class="dyzur-pulpit-data">' + dataHtml + '</div>' +
                 '<div class="dyzur-pulpit-opis" style="' + opisStyle + '">' + opisHtml + '</div>' +
               '</div>' +
               (opts.actionBtn || '') +
             '</div>';
    }

    function renderOddanyDyzurStatus(pelnaData, oddane, extraTekst, dzien) {
      if (!oddane) return '';
      if (oddane.status === 'OCZEKUJE') {
        var opis = extraTekst ? ('Wystawiono na giełdę • ' + extraTekst + ' • Masz 0 pkt (brak minusa)') : 'Wystawiono na giełdę (wolny dyżur) • Masz 0 pkt (brak minusa)';
        return renderKafalekDyzuru(pelnaData, opis, {
          border: '#f59e0b', bg: '#18181b', opisCol: '#fbbf24',
          actionBtn: '<button class="btn-cancel" style="width:auto; padding:6px 12px; margin:0; font-size:12px;" onclick="anulujMojeZastepstwo(\'' + oddane.id + '\', ' + dzien + ')">Wycofaj</button>'
        });
      } else if (oddane.status === 'PRZEJETE') {
        return renderKafalekDyzuru(pelnaData, 'Zastępca: <b>' + oddane.przejmujacy + '</b> • Otrzymasz +1 pkt po mszy!', {
          border: '#10b981', bg: '#18181b', opisCol: '#34d399', bold: true
        });
      } else if (oddane.status === 'ZREALIZOWANE') {
        return renderKafalekDyzuru(pelnaData, 'Zastąpiony przez: <b>' + oddane.przejmujacy + '</b> (+1 pkt dopisany)', {
          border: '#6b7280', bg: '#18181b', opisCol: '#a1a1aa'
        });
      } else if (oddane.status === 'NIESTAWIONY') {
        return renderKafalekDyzuru(pelnaData, 'Zastępca (' + oddane.przejmujacy + ') nie stawił się na mszy • Masz 0 pkt (brak minusa)', {
          border: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)', opisCol: '#f87171'
        });
      }
      return '';
    }

    function renderDyzuryKolejnegoMiesiaca(dyzuryKolejnegoMiesiaca, limit) {
      if (!dyzuryKolejnegoMiesiaca || dyzuryKolejnegoMiesiaca.length === 0) return '';
      var html = '<div style="margin-top:10px; margin-bottom:8px; padding:8px 12px; background:#18181b; border:1px solid #27272a; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">' +
                   '<span style="font-size:12px; font-weight:600; color:#e4e4e7; text-transform:uppercase; letter-spacing:0.04em;">Nadchodzące służby (' + (dyzuryKolejnegoMiesiaca[0].nazwaMiesiacaGen || 'nowy miesiąc') + ')</span>' +
                   '<span style="font-size:11px; color:#71717a;">Grafik na nowy miesiąc</span>' +
                 '</div>';
      var badgeNext = ' <span style="font-size:10px; font-weight:700; color:#93c5fd; background:rgba(59,130,246,0.15); border:1px solid rgba(59,130,246,0.3); padding:2px 6px; border-radius:4px; margin-left:4px; text-transform:uppercase;">Nowy miesiąc</span>';
      dyzuryKolejnegoMiesiaca.slice(0, limit || 5).forEach(function(item) {
        var nazwaDniaTyg = item.dzienTygodnia || pobierzDzienTygodnia(item.rok, item.miesiacIdx, item.dzien);
        var pelnaDataNext = item.dzien + ' ' + item.nazwaMiesiacaGen + (nazwaDniaTyg ? ' (' + nazwaDniaTyg + ')' : '');
        var pktNext = (item.typ === 'Msza niedzielna') ? '3 pkt' : '5 pkt';
        var isWkndNext = (item.typ === 'Msza niedzielna');
        var typStrNext = isWkndNext ? 'Weekend' : 'Tydzień';

        if (item.oddane) {
          if (item.oddane.status === 'OCZEKUJE') {
            html += renderKafalekDyzuru(pelnaDataNext + badgeNext, 'Wystawiono na giełdę wolnych • Czeka na zastępcę (+1 pkt dla Ciebie)', {
              border: '#fbbf24', bg: '#18181b', opisCol: '#fbbf24', bold: true,
              actionBtn: '<button class="btn-cancel" style="width:auto; padding:6px 12px; margin:0; font-size:12px;" onclick="anulujMojeZastepstwo(\'' + item.oddane.id + '\', ' + item.dzien + ', \'' + (item.docKey || '') + '\')">Wycofaj z giełdy</button>'
            });
          } else if (item.oddane.status === 'PRZEJETE') {
            html += renderKafalekDyzuru(pelnaDataNext + badgeNext, 'Przejęte przez: <b>' + item.oddane.przejmujacy + '</b> • Otrzymasz +1 pkt po mszy', {
              border: '#34d399', bg: '#18181b', opisCol: '#34d399', bold: true
            });
          }
        } else if (item.czyUsprawiedliwiony) {
          html += renderKafalekDyzuru(pelnaDataNext + badgeNext, 'Zgłoszono nieobecność • Usprawiedliwiony (0 pkt, brak minusa)', {
            border: '#f59e0b', bg: '#18181b', opisCol: '#fbbf24', bold: true,
            actionBtn: '<button class="btn-cancel" style="width:auto; padding:6px 12px; margin:0; font-size:12px;" onclick="anulujUsprawiedliwienieNiedziela(' + item.dzien + ', \'' + (item.docKey || '') + '\')">Wycofaj zgłoszenie</button>'
          });
        } else {
          html += renderKafalekDyzuru(pelnaDataNext, 'Godz. ' + item.godzina + ' • ' + pktNext, {
            actionBtn: '<div style="display:flex; align-items:center; gap:8px;"><button class="btn-oddaj-dyzur" onclick="otworzModalOddajDyzur(' + item.dzien + ', \'' + typStrNext + '\', \'' + item.godzina + '\', ' + item.rok + ', ' + item.miesiacIdx + ')">Nie mogę przyjść</button></div>'
          });
        }
      });
      return html;
    }

    function renderujDane(res) {
      globalUser.stan = res;
      mapaTekstowOfert = {};
      try { localStorage.setItem('min_cached_data', JSON.stringify(res)); } catch(e) {}

      // 1. Aktualizacja punktów w Dashboardzie
      var pMiesiac = res.punktyMiesiac !== undefined ? res.punktyMiesiac : 0;
      var pRok = res.punktyOdPoczatkuRoku !== undefined ? res.punktyOdPoczatkuRoku : 0;
      var pMinus = res.punktyMinusoweSuma !== undefined ? res.punktyMinusoweSuma : 0;

      document.getElementById('val-punkty-miesiac').innerText = (pMiesiac > 0 ? '+' : '') + pMiesiac;
      document.getElementById('val-punkty-rok').innerText = (pRok > 0 ? '+' : '') + pRok;
      document.getElementById('val-punkty-minus').innerText = pMinus;
      document.getElementById('label-miesiac-punkty').innerText = (res.nazwaMiesiaca ? 'Miesiąc (' + res.nazwaMiesiaca + ')' : 'Ten miesiąc');
      if (res.rok) {
        document.getElementById('punkty-sezon-label').innerText = 'Sezon ' + res.rok;
      }

      // Odznaki pozycji w rankingu
      ustawOdznakeRankingu('badge-rank-miesiac', res.pozycjaMiesiac);
      ustawOdznakeRankingu('badge-rank-rok', res.pozycjaRok);
      ustawOdznakeMinusow('badge-rank-minus', res.punktyMinusoweSuma, res.pozycjaMinusy);

      // Sprawdź czy ministrantowi przysługuje nieodebrana nagroda za TOP 3
      try {
        if (res.nazwisko) sprawdzNagrodyDlaMinistranta(res.nazwisko);
      } catch(eN) { console.warn('sprawdzNagrody error:', eN); }

      // Aktualizacja koloru szat liturgicznych na pulpicie
      try {
        renderujKarteLiturgii(new Date());
      } catch(eLit) { console.warn('renderujKarteLiturgii error:', eLit); }

      // Aktualizacja karty grywalizacji i poziomu na pulpicie
      try {
        if (res.nazwisko || (globalUser && globalUser.nazwisko)) {
          zaktualizujGamifikacjePulpitu(res.nazwisko || globalUser.nazwisko);
        }
      } catch(eG) { console.warn('zaktualizujGamifikacje error:', eG); }

      // Jeśli modal rankingu jest otwarty, odśwież widok
      var modalR = document.getElementById('modal-ranking');
      if (modalR && modalR.style.display === 'flex') {
        przelaczTabRankingu(aktywnyTabRankingu);
      }

      if (!globalUser.stan) globalUser.stan = {};
      globalUser.stan.szczegolyMinusow = res.szczegolyMinusow || [];

      // Jeśli modal minusów jest otwarty, odśwież widok
      var modalM = document.getElementById('modal-minusy');
      if (modalM && modalM.style.display === 'flex') {
        otworzModalMinusy();
      }

      // 2. Najbliższa służba
      var ns = res.najblizszaSluzba;
      if (ns && ns.jest) {
        document.getElementById('sluzba-termin').innerText = ns.tekst;
        document.getElementById('sluzba-detale').innerText = ns.typ + (ns.godzina && ns.godzina !== 'Dyżur stały' ? ' • Godz. ' + ns.godzina : '') + (ns.kolejnyMiesiac ? ' (nowy miesiąc)' : '');
      } else {
        document.getElementById('sluzba-termin').innerText = 'Brak zaplanowanych służb';
        document.getElementById('sluzba-detale').innerText = (ns && ns.tekst) ? ns.tekst : 'Nie masz zaplanowanych dyżurów w tym miesiącu.';
      }

      // 3. Liczba ofert na giełdzie (te same filtry co w listach giełdy — liczymy tylko to, co faktycznie widać)
      var myNameCnt = (globalUser && globalUser.nazwisko) ? globalUser.nazwisko.trim() : '';
      function czyOfertaAktywna(o) {
        return o && o.status !== 'ANULOWANA' && o.status !== 'ZAAKCEPTOWANA' && o.status !== 'PRZEKSZTALCONA_NA_WOLNY' && (!o.status || o.status.indexOf('WYGASLA') === -1);
      }
      var cntGt = (res.gieldaTydzien || []).filter(function(o) {
        if (!czyOfertaAktywna(o)) return false;
        var dO = o.dzienOddawany !== undefined ? o.dzienOddawany : o.dzien;
        if (dO < res.dzisDzien) return false;
        var gO = o.godzina || pobierzGodzineDlaDniaTygodnia(res.rok, res.miesiacIdx, dO);
        return !czyTydzienMszaPrzeterminowana(dO, gO, res.rok, res.miesiacIdx);
      }).length;
      var cntGn = (res.gieldaNiedziele || []).filter(function(o) {
        if (!czyOfertaAktywna(o)) return false;
        if (o.dzien < res.dzisDzien) return false;
        return !czyWeekendMszaPrzeterminowana(o.dzien, o.godzinaOddawana || o.godzina || '10:00', res.rok, res.miesiacIdx);
      }).length;
      var wolneDlaMnie = (res.wolneZastepstwa || []).filter(function(z) {
        if (!z || !z.dzien || z.czyMoje) return false;
        if (myNameCnt && czyToSamoNazwisko(z.oddajacy, myNameCnt)) return false;
        if (z.typ && z.typ !== 'Tydzień') return false;
        if (z.status && z.status !== 'OCZEKUJE') return false;
        if (z.dzien < res.dzisDzien) return false;
        return !czyLiturgiaJuzMinela(z.dzien, cleanTime(z.godzina) || '18:00', null, res.rok, res.miesiacIdx);
      });
      var totalOferty = cntGt + cntGn + wolneDlaMnie.length;
      var bOferty = document.getElementById('badge-oferty');
      if (bOferty) {
        if (totalOferty > 0) {
          bOferty.innerText = totalOferty + (totalOferty === 1 ? ' aktywna oferta' : (totalOferty >= 2 && totalOferty <= 4 ? ' aktywne oferty' : ' aktywnych ofert'));
          bOferty.style.display = 'inline-block';
          bOferty.style.background = 'var(--primary)';
        } else {
          bOferty.innerText = '0 aktywnych ofert';
          bOferty.style.display = 'inline-block';
          bOferty.style.background = '#78909c';
        }
      }

      // 3b. Baner dodatkowych służb (Pogrzeby / Nabożeństwa +3 pkt) z opcją zapisu
      var boxL = document.getElementById('liturgie-dodatkowe-kontener');
      if (boxL) {
        // ZAWSZE priorytet dla Firestore (tabelaMiesiacaDane.liturgieDodatkowe)
        var curLits = (tabelaMiesiacaDane && tabelaMiesiacaDane.liturgieDodatkowe && tabelaMiesiacaDane.liturgieDodatkowe.length) 
          ? tabelaMiesiacaDane.liturgieDodatkowe 
          : (res.liturgieDodatkowe || []);

        var baseLits = curLits.slice();
        if (res.liturgieDodatkowe && res.liturgieDodatkowe.length && baseLits !== res.liturgieDodatkowe) {
          res.liturgieDodatkowe.forEach(function(rl) {
            var existing = baseLits.find(function(bl) { return bl.id === rl.id; });
            if (!existing) baseLits.push(rl);
          });
        }
        // Dołącz liturgie kolejnego miesiąca (np. październikowe pogrzeby)
        if (daneKolejnegoMiesiaca && daneKolejnegoMiesiaca.liturgieDodatkowe) {
          daneKolejnegoMiesiaca.liturgieDodatkowe.forEach(function(nl) {
            var existing = baseLits.find(function(bl) { return bl.id === nl.id; });
            if (!existing) baseLits.push(nl);
          });
        }

        // ZAWSZE wyczyść godziny i upewnij się, że nie ma 19:24 / 20:24
        baseLits.forEach(function(l) {
          var ch = cleanTime(l.godzina);
          if (!ch || ch.indexOf('24') !== -1 || ch === '19:24' || ch === '20:24') {
            ch = (Number(l.dzien) === 14) ? '10:00' : '11:00';
          }
          l.godzina = ch;
          if (!l.zgloszeni) l.zgloszeni = [];
        });

        var aktywneLiturgie = baseLits.filter(function(l) {
          return !czyLiturgiaJuzMinela(l.dzien, l.godzina, null, l.rok, l.miesiacIdx);
        }).sort(function(a, b) {
          var curYDef = (new Date()).getFullYear();
          var curMDef = (new Date()).getMonth();
          var ta = new Date(a.rok || curYDef, (a.miesiacIdx !== undefined) ? a.miesiacIdx : curMDef, a.dzien).getTime();
          var tb = new Date(b.rok || curYDef, (b.miesiacIdx !== undefined) ? b.miesiacIdx : curMDef, b.dzien).getTime();
          if (ta !== tb) return ta - tb;
          return (a.godzina || '').localeCompare(b.godzina || '');
        });

        if (aktywneLiturgie.length > 0) {
          var myName = (globalUser && globalUser.nazwisko) ? globalUser.nazwisko.trim().toLowerCase() : '';
          var htmlL = '';
          aktywneLiturgie.forEach(function(l) {
            var zgloszeni = l.zgloszeni || [];
            var isSigned = zgloszeni.some(function(z) {
              var zn = z.toLowerCase().trim();
              return zn === myName || zn.indexOf(myName) !== -1 || myName.indexOf(zn) !== -1;
            });

            var zgloszeniTekst = zgloszeni.length > 0 ? zgloszeni.join(', ') : 'Brak (bądź pierwszy!)';
            var ikona = '';
            var dispH = cleanTime(l.godzina) || l.godzina;
            if (!dispH || dispH.indexOf('24') !== -1 || dispH === '19:24' || dispH === '20:24') {
              dispH = (Number(l.dzien) === 14) ? '10:00' : '11:00';
            }

            htmlL += '<div class="card" style="border:1px solid rgba(99,102,241,0.3); background:#18181b; margin-bottom:12px; padding:14px; box-shadow:0 4px 14px rgba(0,0,0,0.3);">' +
                       '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">' +
                         '<div>' +
                           '<span style="background:rgba(99,102,241,0.15); color:#a5b4fc; border:1px solid rgba(99,102,241,0.3); font-size:10px; font-weight:800; letter-spacing:0.5px; padding:3px 8px; border-radius:12px; display:inline-block; margin-bottom:4px; text-transform:uppercase;">' +
                             'SŁUŻBA DODATKOWA • +' + (l.punkty || 3) + ' PKT' +
                           '</span>' +
                           '<h3 style="margin:2px 0 4px 0; font-size:16px; color:#fafafa;">' +
                             ikona + ' ' + l.rodzaj + ' — ' + l.dataTekst + ' • Godz. ' + dispH +
                           '</h3>' +
                           '<div style="font-size:12px; color:#a1a1aa; margin-top:3px;">' +
                             'Zgłoszeni chętni (<b>' + zgloszeni.length + '</b>): <span style="color:#fafafa; font-weight:500;">' + zgloszeniTekst + '</span>' +
                           '</div>' +
                         '</div>' +
                       '</div>' +
                       '<div style="margin-top:10px; display:flex; gap:8px;">' +
                         (isSigned ?
                           '<button type="button" class="btn-cancel" style="width:100%; padding:9px; font-size:13px; font-weight:700; background:rgba(239,68,68,0.15); color:#f87171; border:1px solid rgba(239,68,68,0.3);" onclick="przelaczZgloszenieLiturgia(\'' + l.id + '\')">Jesteś zgłoszony (Kliknij, aby zrezygnować)</button>' :
                           '<button type="button" class="btn-action" style="width:100%; padding:9px; font-size:13px; font-weight:700; background:#6366f1; color:#ffffff; border:none; box-shadow:0 2px 8px rgba(99,102,241,0.3);" onclick="przelaczZgloszenieLiturgia(\'' + l.id + '\')">Zgłaszam się (Będę • +' + (l.punkty || 3) + ' pkt)</button>') +
                       '</div>' +
                     '</div>';
          });
          boxL.innerHTML = htmlL;
          boxL.style.display = 'block';
        } else {
          boxL.innerHTML = '';
          boxL.style.display = 'none';
        }
      }

      // 4. Lista Twoich dyżurów z opcją zgłoszenia nieobecności ("Nie mogę przyjść")
      var listaMoichDyzurowDiv = document.getElementById('lista-moich-dyzurow-pulpit');
      if (listaMoichDyzurowDiv) {
        var mojeDyzuryDoWyswietlenia = [];
        var nowCheck = new Date();
        var isHistoricalMonth = (res.rok < nowCheck.getFullYear() || (res.rok === nowCheck.getFullYear() && res.miesiacIdx < nowCheck.getMonth()));

        if (!isHistoricalMonth) {
          // Przejęte zastępstwa (+4 pkt)
          if (res.mojePrzejeteZastepstwa) {
            for (var dayKey in res.mojePrzejeteZastepstwa) {
              var dNum = parseInt(dayKey, 10);
              var dtEnd = new Date(res.rok, res.miesiacIdx, dNum, 23, 59, 59).getTime();
              if (dtEnd >= nowCheck.getTime()) {
                mojeDyzuryDoWyswietlenia.push({
                  dzien: dNum,
                  typ: 'przejete',
                  dane: res.mojePrzejeteZastepstwa[dayKey]
                });
              }
            }
          }

          var myNamePulpit = (globalUser && globalUser.nazwisko) ? globalUser.nazwisko.trim() : (localStorage.getItem('min_name') || '');

          // Moje stałe dyżury w tygodniu roboczym
          if (res.mojeDyzuryTydzien) {
            res.mojeDyzuryTydzien.forEach(function(d) {
              var dtEnd = new Date(res.rok, res.miesiacIdx, d, 23, 59, 59).getTime();
              if (dtEnd >= nowCheck.getTime()) {
                var oddaneInfo = (res.mojeOddaneZastepstwa && res.mojeOddaneZastepstwa[d]) ? res.mojeOddaneZastepstwa[d] : null;
                var ofeTydz = (res.gieldaTydzien || []).find(function(o) {
                  var dOdd = o.dzienOddawany !== undefined ? o.dzienOddawany : o.dzien;
                  return dOdd === d && czyToSamoNazwisko(o.wystawiajacy, myNamePulpit) && o.status !== 'ANULOWANA' && o.status !== 'ZAAKCEPTOWANA';
                });
                mojeDyzuryDoWyswietlenia.push({
                  dzien: d,
                  typ: 'tydzien',
                  oddane: oddaneInfo,
                  ofertaGielda: ofeTydz || null
                });
              }
            });
          }

          // Moje dyżury weekendowe (tylko w niedziele, w których ministrant rzeczywiście ma służbę!)
          if (res.godzinyWeekendy && Object.keys(res.godzinyWeekendy).length > 0) {
            for (var dayKey in res.godzinyWeekendy) {
              var dayNum = parseInt(dayKey, 10);
              var infoW = res.godzinyWeekendy[dayKey];
              var gStr = cleanTime(infoW.godzina || res.mojaGodzinaNiedziela || '10:00');
              var isSatVigil = (gStr === '17:00');
              var displayDay = isSatVigil ? (dayNum - 1) : dayNum;
              var dtEnd = new Date(res.rok, res.miesiacIdx, displayDay, 23, 59, 59).getTime();
              if (dtEnd >= nowCheck.getTime()) {
                var oddaneInfoW = (res.mojeOddaneZastepstwa && (res.mojeOddaneZastepstwa[displayDay] || res.mojeOddaneZastepstwa[dayNum])) ? (res.mojeOddaneZastepstwa[displayDay] || res.mojeOddaneZastepstwa[dayNum]) : null;
                var ofeWknd = (res.gieldaNiedziele || []).find(function(o) {
                  return (o.dzien === dayNum || o.dzien === displayDay) && czyToSamoNazwisko(o.wystawiajacy, myNamePulpit) && o.status !== 'ANULOWANA' && o.status !== 'ZAAKCEPTOWANA';
                });
                mojeDyzuryDoWyswietlenia.push({
                  dzien: displayDay,
                  dzienNiedzieli: dayNum,
                  typ: 'weekend',
                  godzina: gStr,
                  czyZamienione: !!infoW.czyZamienione,
                  czyUsprawiedliwiony: !!infoW.czyUsprawiedliwiony || !!oddaneInfoW,
                  oddane: oddaneInfoW,
                  ofertaGielda: ofeWknd || null
                });
              }
            }
          } else if (res.mojaGodzinaNiedziela) {
            var gFallback = cleanTime(res.mojaGodzinaNiedziela);
            var isSatFallback = (gFallback === '17:00');
            for (var day = 1; day <= res.daysInMonth; day++) {
              var dt = new Date(res.rok, res.miesiacIdx, day);
              if (dt.getDay() === 0) {
                var displayDayFb = isSatFallback ? (day - 1) : day;
                var dtEndFb = new Date(res.rok, res.miesiacIdx, displayDayFb, 23, 59, 59).getTime();
                if (dtEndFb >= nowCheck.getTime()) {
                  var ofeWkndFallback = (res.gieldaNiedziele || []).find(function(o) {
                    return (o.dzien === day || o.dzien === displayDayFb) && czyToSamoNazwisko(o.wystawiajacy, myNamePulpit) && o.status !== 'ANULOWANA' && o.status !== 'ZAAKCEPTOWANA';
                  });
                  mojeDyzuryDoWyswietlenia.push({
                    dzien: displayDayFb,
                    dzienNiedzieli: day,
                    typ: 'weekend',
                    godzina: gFallback,
                    czyZamienione: false,
                    czyUsprawiedliwiony: false,
                    ofertaGielda: ofeWkndFallback || null
                  });
                }
              }
            }
          }
        }


        mojeDyzuryDoWyswietlenia.sort(function(a, b) { return a.dzien - b.dzien; });

        if (mojeDyzuryDoWyswietlenia.length === 0) {
          var brakMsg = '<div style="color:var(--text-muted); font-size:13px; text-align:center; padding:10px 0;">Brak dalszych służb w tym miesiącu.</div>';
          listaMoichDyzurowDiv.innerHTML = brakMsg + (res.dyzuryKolejnegoMiesiaca && res.dyzuryKolejnegoMiesiaca.length > 0 ? renderDyzuryKolejnegoMiesiaca(res.dyzuryKolejnegoMiesiaca, 5) : '');
        } else {
          var MAX_DYZURY = 5;
          var htmlDyzury = '';
          var dyzuryBiezace = mojeDyzuryDoWyswietlenia.slice(0, MAX_DYZURY);
          dyzuryBiezace.forEach(function(item) {
            var nazwaDniaTyg = pobierzDzienTygodnia(res.rok, res.miesiacIdx, item.dzien);
            var pelnaData = item.dzien + ' ' + res.nazwaMiesiaca + ' (' + nazwaDniaTyg + ')';

            if (item.typ === 'przejete') {
              var statusTekstPrzej = 'Zastępstwo za: <b>' + item.dane.oddajacy + '</b> • Za obecność otrzymasz +4 pkt';
              var borderColPrzej = '#10b981';
              if (item.dane.status === 'ZREALIZOWANE') {
                statusTekstPrzej = 'Zastępstwo zrealizowane (+4 pkt dopisane)';
                borderColPrzej = '#6b7280';
              } else if (item.dane.status === 'NIESTAWIONY') {
                statusTekstPrzej = 'Nieobecność na podjętym dyżurze (-5 pkt)';
                borderColPrzej = '#ef4444';
              }
              var btnPrzej = (item.dane.status === 'PRZEJETE' && !czyMszaJuzSieRozpoczela(item.dzien, cleanTime(item.dane.godzina) || '18:00', res.rok, res.miesiacIdx))
                ? '<button class="btn-cancel" style="width:auto; padding:6px 12px; margin:0; font-size:12px;" onclick="wycofajPrzyjeteZastepstwo(\'' + item.dane.id + '\', ' + item.dzien + ', \'' + pobierzAktywnyKluczMiesiaca() + '\')">Wycofaj się z zastępstwa</button>'
                : '';
              htmlDyzury += renderKafalekDyzuru(pelnaData + ' <span class="badge-plus4">+4 PKT</span>', statusTekstPrzej, {
                border: borderColPrzej,
                opisCol: borderColPrzej === '#ef4444' ? '#f87171' : '#34d399',
                bold: true,
                actionBtn: btnPrzej
              });
            } else if (item.typ === 'tydzien') {
              var godzWTyg = pobierzGodzineDlaDniaTygodnia(res.rok, res.miesiacIdx, item.dzien);
              if (item.ofertaGielda) {
                var isExpiredT = czyTydzienMszaPrzeterminowana(item.dzien, godzWTyg, res.rok, res.miesiacIdx);
                if (isExpiredT || item.ofertaGielda.status === 'WYGASLA_USPRAWIEDLIWIONA' || item.ofertaGielda.status === 'PRZEKSZTALCONA_NA_WOLNY') {
                  htmlDyzury += renderKafalekDyzuru(pelnaData, 'Wygasła oferta wymiany (brak chętnego) • Usprawiedliwiony (0 pkt, brak minusa)', {
                    border: '#f59e0b', bg: '#18181b', opisCol: '#fbbf24', bold: true
                  });
                } else {
                  htmlDyzury += renderKafalekDyzuru(pelnaData, 'Wystawiono na giełdę (wymiana 1:1) • Godz. ' + godzWTyg + ' • Oczekuje na chętnego', {
                    border: '#f59e0b', bg: '#18181b', opisCol: '#fbbf24', bold: true,
                    actionBtn: '<button class="btn-cancel" style="width:auto; padding:6px 12px; margin:0; font-size:12px;" onclick="anulujTydzien(\'' + item.ofertaGielda.id + '\')">Wycofaj z giełdy</button>'
                  });
                }
              } else if (item.oddane) {
                htmlDyzury += renderOddanyDyzurStatus(pelnaData, item.oddane, null, item.dzien);
              } else {
                var isPastTydz = czyTydzienMszaPrzeterminowana(item.dzien, godzWTyg, res.rok, res.miesiacIdx);
                htmlDyzury += renderKafalekDyzuru(pelnaData, 'Godz. ' + godzWTyg + ' • 5 pkt', {
                  actionBtn: !isPastTydz ? '<button class="btn-oddaj-dyzur" onclick="otworzModalOddajDyzur(' + item.dzien + ', \'Tydzień\', \'' + godzWTyg + '\', ' + res.rok + ', ' + res.miesiacIdx + ')">Nie mogę przyjść</button>' : ''
                });
              }
            } else if (item.typ === 'weekend') {
              var godzinaTekst = item.godzina ? 'Godz. ' + item.godzina : 'Weekend';
              var subTekst = item.czyZamienione ? ' (po zamianie)' : '';
              if (item.ofertaGielda) {
                var gOdd = item.ofertaGielda.godzinaOddawana || item.godzina || '10:00';
                var isExpiredW = czyWeekendMszaPrzeterminowana(item.dzien, gOdd, res.rok, res.miesiacIdx);
                if (isExpiredW || item.ofertaGielda.status === 'WYGASLA_USPRAWIEDLIWIONA') {
                  htmlDyzury += renderKafalekDyzuru(pelnaData, 'Wygasła oferta wymiany (brak chętnego) • Usprawiedliwiony (0 pkt, brak minusa)', {
                    border: '#f59e0b', bg: '#18181b', opisCol: '#fbbf24', bold: true
                  });
                } else {
                  htmlDyzury += renderKafalekDyzuru(pelnaData, 'Wystawiono na giełdę (wymiana 1:1) • Godz. ' + gOdd + ' • Oczekuje na chętnego', {
                    border: '#f59e0b', bg: '#18181b', opisCol: '#fbbf24', bold: true,
                    actionBtn: '<button class="btn-cancel" style="width:auto; padding:6px 12px; margin:0; font-size:12px;" onclick="anulujNiedziele(\'' + item.ofertaGielda.id + '\')">Wycofaj z giełdy</button>'
                  });
                }
              } else if (item.oddane) {
                htmlDyzury += renderOddanyDyzurStatus(pelnaData, item.oddane, godzinaTekst, item.dzien);
              } else if (item.czyUsprawiedliwiony) {
                htmlDyzury += renderKafalekDyzuru(pelnaData, 'Zgłoszono nieobecność • Usprawiedliwiony (0 pkt, brak minusa)', {
                  border: '#f59e0b', bg: '#18181b', opisCol: '#fbbf24', bold: true,
                  actionBtn: '<button class="btn-cancel" style="width:auto; padding:6px 12px; margin:0; font-size:12px;" onclick="anulujUsprawiedliwienieNiedziela(' + (item.dzienNiedzieli || item.dzien) + ')">Wycofaj zgłoszenie</button>'
                });
              } else {
                var isPastWknd = czyWeekendMszaPrzeterminowana(item.dzien, item.godzina || '', res.rok, res.miesiacIdx);
                htmlDyzury += renderKafalekDyzuru(pelnaData, godzinaTekst + subTekst + ' • 3 pkt', {
                  actionBtn: !isPastWknd ? '<button class="btn-oddaj-dyzur" onclick="otworzModalOddajDyzur(' + (item.dzienNiedzieli || item.dzien) + ', \'Weekend\', \'' + (item.godzina || '') + '\', ' + res.rok + ', ' + res.miesiacIdx + ')">Nie mogę przyjść</button>' : ''
                });
              }
            }
          });
          if (res.dyzuryKolejnegoMiesiaca && res.dyzuryKolejnegoMiesiaca.length > 0 && dyzuryBiezace.length < MAX_DYZURY) {
            htmlDyzury += renderDyzuryKolejnegoMiesiaca(res.dyzuryKolejnegoMiesiaca, MAX_DYZURY - dyzuryBiezace.length);
          }
          listaMoichDyzurowDiv.innerHTML = htmlDyzury;
        }
      }

      // Kafelki służb w tygodniu
      var boxDni = document.getElementById('kafelki-moje-dni');
      boxDni.innerHTML = '';
      aktywneDyzuryTydzienLista = [];

      // 1. Bieżący miesiąc
      (res.mojeDyzuryTydzien || []).forEach(function(d) {
        if (d < res.dzisDzien) return;
        if (res.mojeOddaneZastepstwa && res.mojeOddaneZastepstwa[d]) return;
        var czyJuzNaGieldzie = (res.gieldaTydzien || []).some(function(o) {
          var dOdd = o.dzienOddawany !== undefined ? o.dzienOddawany : o.dzien;
          return dOdd === d && czyToSamoNazwisko(o.wystawiajacy, myNamePulpit) && o.status !== 'ANULOWANA' && o.status !== 'ZAAKCEPTOWANA';
        });
        if (czyJuzNaGieldzie) return;
        var czyWystawioneWolne = (res.wolneZastepstwa || []).some(function(z) {
          return z.dzien === d && (z.typ === 'Tydzień' || !z.typ) && z.czyMoje;
        });
        if (czyWystawioneWolne) return;
        var godzWTyg = pobierzGodzineDlaDniaTygodnia(res.rok, res.miesiacIdx, d);
        if (czyTydzienMszaPrzeterminowana(d, godzWTyg, res.rok, res.miesiacIdx)) return;

        aktywneDyzuryTydzienLista.push({
          key: 'cur_' + d,
          dzien: d,
          rok: res.rok,
          miesiacIdx: res.miesiacIdx,
          nazwaMiesiaca: res.nazwaMiesiaca,
          godzina: godzWTyg,
          dzienTygodnia: pobierzDzienTygodnia(res.rok, res.miesiacIdx, d),
          kolejnyMiesiac: false,
          docKey: pobierzAktywnyKluczMiesiaca()
        });
      });

      // 2. Kolejny miesiąc (np. Październik)
      if (res.dyzuryKolejnegoMiesiaca && res.dyzuryKolejnegoMiesiaca.length > 0) {
        var nextGt = (daneKolejnegoMiesiaca && daneKolejnegoMiesiaca.gieldaTydzien) || [];
        var nextWz = (daneKolejnegoMiesiaca && daneKolejnegoMiesiaca.wolneZastepstwa) || [];
        var nextKey = wyznaczKluczMiesiaca(new Date(res.dyzuryKolejnegoMiesiaca[0].rok, res.dyzuryKolejnegoMiesiaca[0].miesiacIdx, 1));

        res.dyzuryKolejnegoMiesiaca.forEach(function(item) {
          if (item.typ !== 'Służba w tygodniu') return;
          var d = item.dzien;
          var czyJuzNaGieldzie = nextGt.some(function(o) {
            var dOdd = o.dzienOddawany !== undefined ? o.dzienOddawany : o.dzien;
            return dOdd === d && czyToSamoNazwisko(o.wystawiajacy, myNamePulpit) && o.status !== 'ANULOWANA' && o.status !== 'ZAAKCEPTOWANA';
          });
          if (czyJuzNaGieldzie) return;
          var czyWystawioneWolne = nextWz.some(function(z) {
            return z.dzien === d && (z.typ === 'Tydzień' || !z.typ) && czyToSamoNazwisko(z.oddajacy, myNamePulpit);
          });
          if (czyWystawioneWolne) return;

          aktywneDyzuryTydzienLista.push({
            key: 'next_' + d,
            dzien: d,
            rok: item.rok,
            miesiacIdx: item.miesiacIdx,
            nazwaMiesiaca: item.nazwaMiesiacaGen,
            godzina: item.godzina,
            dzienTygodnia: item.dzienTygodnia,
            kolejnyMiesiac: true,
            docKey: nextKey
          });
        });
      }

      if (aktywneDyzuryTydzienLista.length === 0) {
        boxDni.innerHTML = '<span style="color:#a1a1aa; font-size:13px;">Brak dostępnych służb w tygodniu do wystawienia na giełdę (wszystkie nadchodzące służby zostały już wystawione, usprawiedliwione lub minął czas na ich zamianę).</span>';
        document.getElementById('btn-wystaw-tydzien').disabled = true;
        wybranyDzienTydzienKey = null;
        wybranyDzienTydzien = null;
        wybranaSluzbaTydzienObj = null;
        generujOpcjeTygodnia();
      } else {
        document.getElementById('btn-wystaw-tydzien').disabled = false;
        var existingSelectedT = aktywneDyzuryTydzienLista.find(function(x) { return x.key === wybranyDzienTydzienKey; });
        if (!existingSelectedT) {
          wybranyDzienTydzienKey = aktywneDyzuryTydzienLista[0].key;
          wybranyDzienTydzien = aktywneDyzuryTydzienLista[0].dzien;
          wybranaSluzbaTydzienObj = aktywneDyzuryTydzienLista[0];
        } else {
          wybranaSluzbaTydzienObj = existingSelectedT;
          wybranyDzienTydzien = existingSelectedT.dzien;
        }

        aktywneDyzuryTydzienLista.forEach(function(dObj) {
          var tile = document.createElement('div');
          tile.className = 'tile-choice' + (dObj.key === wybranyDzienTydzienKey ? ' selected' : '');
          tile.setAttribute('data-key', dObj.key);
          tile.onclick = function() { wybierzDzienTygodniaKafelek(dObj.key); };
          
          var badgeNext = dObj.kolejnyMiesiac 
            ? '<span style="font-size:10px; font-weight:700; color:#93c5fd; background:rgba(59,130,246,0.15); border:1px solid rgba(59,130,246,0.3); padding:2px 6px; border-radius:4px; margin-left:6px; vertical-align:middle; text-transform:uppercase;">Nowy miesiąc</span>' 
            : '';

          tile.innerHTML = '<span class="tile-main">' + dObj.dzien + ' ' + dObj.nazwaMiesiaca + badgeNext + '</span>' +
                           '<span class="tile-sub">' + dObj.dzienTygodnia + ' • ' + dObj.godzina + '</span>';
          boxDni.appendChild(tile);
        });
        generujOpcjeTygodnia();
      }

      // Kafelki weekendowe
      var boxWeekendy = document.getElementById('kafelki-weekendy');
      boxWeekendy.innerHTML = '';
      dostepneWeekendyLista = [];

      // 1. Bieżący miesiąc
      for (var day = 1; day <= res.daysInMonth; day++) {
        var dt = new Date(res.rok, res.miesiacIdx, day);
        if (dt.getDay() === 0 && day >= res.dzisDzien) {
          var infoWCheck = res.godzinyWeekendy && res.godzinyWeekendy[day];
          var maDyzurNiedziela = (infoWCheck && !infoWCheck.czyUsprawiedliwiony) || (!res.godzinyWeekendy && res.mojaGodzinaNiedziela);
          if (!maDyzurNiedziela) continue;
          if (res.mojeOddaneZastepstwa && res.mojeOddaneZastepstwa[day]) continue;

          var czyJuzNaGieldzieWknd = (res.gieldaNiedziele || []).some(function(o) {
            return o.dzien === day && czyToSamoNazwisko(o.wystawiajacy, myNamePulpit) && o.status !== 'ANULOWANA' && o.status !== 'ZAAKCEPTOWANA';
          });
          if (czyJuzNaGieldzieWknd) continue;

          var gWkndCheck = infoWCheck ? infoWCheck.godzina : (res.mojaGodzinaNiedziela || '10:00');
          if (czyWeekendMszaPrzeterminowana(day, gWkndCheck, res.rok, res.miesiacIdx)) continue;

          dostepneWeekendyLista.push({
            key: 'cur_wknd_' + day,
            dzien: day,
            actualDay: day,
            rok: res.rok,
            miesiacIdx: res.miesiacIdx,
            nazwaMiesiaca: res.nazwaMiesiaca,
            godzina: gWkndCheck,
            kolejnyMiesiac: false,
            dopisek: (infoWCheck && infoWCheck.czyZamienione) ? ' (po zamianie)' : '',
            docKey: pobierzAktywnyKluczMiesiaca()
          });
        }
      }

      // 2. Kolejny miesiąc (np. Październik)
      if (res.dyzuryKolejnegoMiesiaca && res.dyzuryKolejnegoMiesiaca.length > 0) {
        var nextGn = (daneKolejnegoMiesiaca && daneKolejnegoMiesiaca.gieldaNiedziele) || [];
        var nextKeyW = wyznaczKluczMiesiaca(new Date(res.dyzuryKolejnegoMiesiaca[0].rok, res.dyzuryKolejnegoMiesiaca[0].miesiacIdx, 1));

        res.dyzuryKolejnegoMiesiaca.forEach(function(item) {
          if (item.typ !== 'Msza niedzielna') return;
          var dSun = item.dzienTabeli || item.dzien;
          var czyJuzNaGieldzieW = nextGn.some(function(o) {
            return o.dzien === dSun && czyToSamoNazwisko(o.wystawiajacy, myNamePulpit) && o.status !== 'ANULOWANA' && o.status !== 'ZAAKCEPTOWANA';
          });
          if (czyJuzNaGieldzieW) return;

          dostepneWeekendyLista.push({
            key: 'next_wknd_' + dSun,
            dzien: dSun,
            actualDay: item.dzien,
            rok: item.rok,
            miesiacIdx: item.miesiacIdx,
            nazwaMiesiaca: item.nazwaMiesiacaGen,
            godzina: item.godzina,
            kolejnyMiesiac: true,
            dopisek: '',
            docKey: nextKeyW
          });
        });
      }

      if (dostepneWeekendyLista.length === 0) {
        boxWeekendy.innerHTML = '<span style="color:#a1a1aa; font-size:13px;">Brak dostępnych służb weekendowych do wystawienia na giełdę (wszystkie nadchodzące służby zostały już wystawione, usprawiedliwione lub minął czas na ich zamianę).</span>';
        document.getElementById('btn-wystaw-niedziele').disabled = true;
        wybranyDzienNiedzielaKey = null;
        wybranyDzienNiedziela = null;
        wybranaSluzbaWeekendObj = null;
        aktualizujGodzineWeekendu();
      } else {
        document.getElementById('btn-wystaw-niedziele').disabled = false;
        var existingSelectedW = dostepneWeekendyLista.find(function(x) { return x.key === wybranyDzienNiedzielaKey; });
        if (!existingSelectedW) {
          wybranyDzienNiedzielaKey = dostepneWeekendyLista[0].key;
          wybranyDzienNiedziela = dostepneWeekendyLista[0].dzien;
          wybranaSluzbaWeekendObj = dostepneWeekendyLista[0];
        } else {
          wybranaSluzbaWeekendObj = existingSelectedW;
          wybranyDzienNiedziela = existingSelectedW.dzien;
        }

        dostepneWeekendyLista.forEach(function(wObj) {
          var tileW = document.createElement('div');
          tileW.className = 'tile-choice' + (wObj.key === wybranyDzienNiedzielaKey ? ' selected' : '');
          tileW.setAttribute('data-key', wObj.key);
          tileW.onclick = function() { wybierzWeekendKafelek(wObj.key); };

          var badgeNextW = wObj.kolejnyMiesiac 
            ? '<span style="font-size:10px; font-weight:700; color:#93c5fd; background:rgba(59,130,246,0.15); border:1px solid rgba(59,130,246,0.3); padding:2px 6px; border-radius:4px; margin-left:6px; vertical-align:middle; text-transform:uppercase;">Nowy miesiąc</span>' 
            : '';

          var mainText = (wObj.godzina === '17:00')
            ? ('Sobota ' + (wObj.dzien - 1) + ' ' + wObj.nazwaMiesiaca + ' (wigilijna)')
            : ('Niedziela ' + wObj.dzien + ' ' + wObj.nazwaMiesiaca);
          var subText = (wObj.godzina === '17:00')
            ? ('Godzina: <b>17:00</b>' + (wObj.dopisek || ''))
            : ('Z sobotą ' + (wObj.dzien - 1) + ' | Godzina: <b>' + wObj.godzina + '</b>' + (wObj.dopisek || ''));
          tileW.innerHTML = '<span class="tile-main">' + mainText + badgeNextW + '</span>' +
                            '<span class="tile-sub">' + subText + '</span>';
          boxWeekendy.appendChild(tileW);
        });
        aktualizujGodzineWeekendu();
      }

      // Zunifikowana giełda wymian 1:1 (bieżący i kolejny miesiąc)
      var divWszystkie = document.getElementById('lista-gielda-wszystkie');
      var cntWszystkie = document.getElementById('cnt-filter-wszystkie');
      var cntTydz = document.getElementById('cnt-filter-tydzien');
      var cntWknd = document.getElementById('cnt-filter-weekend');
      var badgeW11 = document.getElementById('badge-wymiany-11-count');

      var curGt = (res.gieldaTydzien || []).filter(function(o) {
        if (!o || o.status === 'ANULOWANA' || o.status === 'ZAAKCEPTOWANA' || o.status === 'PRZEKSZTALCONA_NA_WOLNY' || (o.status && o.status.indexOf('WYGASLA') !== -1)) return false;
        var dO = o.dzienOddawany !== undefined ? o.dzienOddawany : o.dzien;
        if (dO < res.dzisDzien) return false;
        var gO = o.godzina || pobierzGodzineDlaDniaTygodnia(res.rok, res.miesiacIdx, dO);
        if (czyTydzienMszaPrzeterminowana(dO, gO, res.rok, res.miesiacIdx)) return false;
        return true;
      });
      var nextGt = (daneKolejnegoMiesiaca && daneKolejnegoMiesiaca.gieldaTydzien || []).filter(function(o) {
        return o && o.status !== 'ANULOWANA' && o.status !== 'ZAAKCEPTOWANA' && o.status !== 'PRZEKSZTALCONA_NA_WOLNY' && (!o.status || o.status.indexOf('WYGASLA') === -1);
      });
      var curGn = (res.gieldaNiedziele || []).filter(function(o) {
        if (!o || o.status === 'ANULOWANA' || o.status === 'ZAAKCEPTOWANA' || (o.status && o.status.indexOf('WYGASLA') !== -1)) return false;
        if (o.dzien < res.dzisDzien) return false;
        var gO = o.godzinaOddawana || o.godzina || '10:00';
        if (czyWeekendMszaPrzeterminowana(o.dzien, gO, res.rok, res.miesiacIdx)) return false;
        return true;
      });
      var nextGn = (daneKolejnegoMiesiaca && daneKolejnegoMiesiaca.gieldaNiedziele || []).filter(function(o) {
        return o && o.status !== 'ANULOWANA' && o.status !== 'ZAAKCEPTOWANA' && (!o.status || o.status.indexOf('WYGASLA') === -1);
      });

      var gTydzList = curGt.map(function(o) {
        return Object.assign({
          docKey: pobierzAktywnyKluczMiesiaca(),
          rok: res.rok,
          miesiacIdx: res.miesiacIdx,
          nazwaMiesiacaGen: res.nazwaMiesiaca,
          kolejnyMiesiac: false
        }, o);
      }).concat(nextGt.map(function(o) {
        var nM = (daneKolejnegoMiesiaca.miesiacIdx !== undefined) ? daneKolejnegoMiesiaca.miesiacIdx : (res.miesiacIdx + 1) % 12;
        var nY = daneKolejnegoMiesiaca.rok || res.rok;
        return Object.assign({
          docKey: wyznaczKluczMiesiaca(new Date(nY, nM, 1)),
          rok: nY,
          miesiacIdx: nM,
          nazwaMiesiacaGen: polishMonthsGenitive[nM] || 'kolejnego miesiąca',
          kolejnyMiesiac: true
        }, o);
      }));

      var gWkndList = curGn.map(function(o) {
        return Object.assign({
          docKey: pobierzAktywnyKluczMiesiaca(),
          rok: res.rok,
          miesiacIdx: res.miesiacIdx,
          nazwaMiesiacaGen: res.nazwaMiesiaca,
          kolejnyMiesiac: false
        }, o);
      }).concat(nextGn.map(function(o) {
        var nM = (daneKolejnegoMiesiaca.miesiacIdx !== undefined) ? daneKolejnegoMiesiaca.miesiacIdx : (res.miesiacIdx + 1) % 12;
        var nY = daneKolejnegoMiesiaca.rok || res.rok;
        return Object.assign({
          docKey: wyznaczKluczMiesiaca(new Date(nY, nM, 1)),
          rok: nY,
          miesiacIdx: nM,
          nazwaMiesiacaGen: polishMonthsGenitive[nM] || 'kolejnego miesiąca',
          kolejnyMiesiac: true
        }, o);
      }));

      var total11 = gTydzList.length + gWkndList.length;

      if (cntWszystkie) cntWszystkie.innerText = total11;
      if (cntTydz) cntTydz.innerText = gTydzList.length;
      if (cntWknd) cntWknd.innerText = gWkndList.length;
      if (badgeW11) {
        badgeW11.innerText = total11 + (total11 === 1 ? ' oferta' : (total11 >= 2 && total11 <= 4 ? ' oferty' : ' ofert'));
      }

      if (divWszystkie) {
        divWszystkie.innerHTML = '';
        if (total11 === 0) {
          divWszystkie.innerHTML = '<div style="text-align:center; padding:18px 8px; color:#a1a1aa; font-size:13px;">Brak aktywnych ofert wymiany 1:1.</div>';
        } else {
          // 1. Oferty z tygodnia roboczego
          gTydzList.forEach(function(o) {
            var box = document.createElement('div');
            box.className = 'oferta-box oferta-tydzien';
            box.setAttribute('data-typ', 'tydzien');

            var dOdd = o.dzienOddawany !== undefined ? o.dzienOddawany : o.dzien;
            var akceptowaneDni = o.akceptowaneDni || o.dniAkceptowane || [];
            var isMyOffer = czyToSamoNazwisko(o.wystawiajacy, myNamePulpit);

            var dopasowanyDzien = null;
            if (o.kolejnyMiesiac) {
              (res.dyzuryKolejnegoMiesiaca || []).forEach(function(item) {
                if (item.typ === 'Służba w tygodniu' && akceptowaneDni.indexOf(item.dzien) !== -1) dopasowanyDzien = item.dzien;
              });
            } else {
              (res.mojeDyzuryTydzien || []).forEach(function(md) {
                if (akceptowaneDni.indexOf(md) !== -1 && md >= res.dzisDzien) dopasowanyDzien = md;
              });
            }

            var akceptowaneLabels = akceptowaneDni.map(function(ad) {
              return formatujDateDnia(ad, res, o.rok, o.miesiacIdx, o.nazwaMiesiacaGen);
            });

            var godzStr = o.nazwaMszy || (o.godzina ? 'Godz. ' + o.godzina : '');
            var waznaDoInfo = o.waznaDo ? '<div style="font-size:11px; color:#fbbf24; margin-top:4px;">Wymiana 1:1 możliwa do: <b>' + o.waznaDo + '</b></div>' : '';
            var autoOddajInfo = o.autoOddaj ? '<div style="font-size:11px; color:#34d399; margin-top:2px;">W razie braku wymiany dyżur trafi na giełdę jako wolny (+4 pkt)</div>' : '';
            var badgeMonth = o.kolejnyMiesiac 
              ? ' <span style="font-size:10px; font-weight:700; color:#93c5fd; background:rgba(59,130,246,0.15); border:1px solid rgba(59,130,246,0.3); padding:2px 6px; border-radius:4px; text-transform:uppercase; margin-left:6px;">Nowy miesiąc</span>' 
              : '';

            var html = '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">' +
                         '<span style="font-weight:700; color:#ffffff; font-size:14px; letter-spacing:-0.01em;">' + o.wystawiajacy + badgeMonth + '</span>' +
                         '<span class="badge-gielda badge-gielda-tydzien">Tydzień</span>' +
                       '</div>' +
                       '<div style="font-size:13px; color:#e4e4e7;">Oddaje: <b style="color:#ffffff;">' + formatujDateDnia(dOdd, res, o.rok, o.miesiacIdx, o.nazwaMiesiacaGen) + '</b> ' + (godzStr ? '<span style="font-size:12px; color:#a1a1aa;">(' + godzStr + ')</span>' : '') + '</div>' +
                       '<div style="font-size:12px; color:#a1a1aa; margin-top:4px;">Może przyjąć: <span style="color:#ffffff; font-weight:600;">' + (akceptowaneLabels.length ? akceptowaneLabels.join(', ') : 'dowolny') + '</span></div>' +
                       waznaDoInfo + autoOddajInfo;

            var godzOdd = o.godzina || pobierzGodzineDlaDniaTygodnia(o.rok, o.miesiacIdx, dOdd);
            var isCutoffTydz = czyTydzienMszaPrzeterminowana(dOdd, godzOdd, o.rok, o.miesiacIdx);
            var isCutoffDopasowany = dopasowanyDzien ? czyTydzienMszaPrzeterminowana(dopasowanyDzien, pobierzGodzineDlaDniaTygodnia(o.rok, o.miesiacIdx, dopasowanyDzien), o.rok, o.miesiacIdx) : false;

            if (isMyOffer) {
              html += '<div style="margin-top:10px;"><button class="btn-cancel" onclick="anulujTydzien(\'' + o.id + '\', \'' + o.docKey + '\')">Anuluj ofertę</button></div>';
            } else if (isCutoffTydz || isCutoffDopasowany) {
              html += '<div style="margin-top:10px;"><button class="btn-action" disabled style="opacity:0.5; cursor:not-allowed; background:#27272a; color:#a1a1aa; border-color:#3f3f46;">Zbyt późno na zamianę (< 2h do mszy)</button></div>';
            } else if (dopasowanyDzien) {
              html += '<div style="margin-top:10px;"><button class="btn-action" onclick="akceptujTydzien(\'' + o.id + '\', ' + dopasowanyDzien + ', \'' + o.docKey + '\')">Oddaj ' + formatujDateDnia(dopasowanyDzien, res, o.rok, o.miesiacIdx, o.nazwaMiesiacaGen) + ' i weź ten dzień</button></div>';
            } else {
              html += '<div style="color:#f87171; font-size:12px; margin-top:6px; font-weight:500;">Nie masz pasującego dyżuru na wymianę</div>';
            }
            box.innerHTML = html;
            divWszystkie.appendChild(box);
          });

          // 2. Oferty weekendowe
          gWkndList.forEach(function(on) {
            var box = document.createElement('div');
            box.className = 'oferta-box oferta-weekend';
            box.setAttribute('data-typ', 'weekend');

            var isMyOfferWknd = czyToSamoNazwisko(on.wystawiajacy, myNamePulpit);
            var mojaGodzinaWtedy = '';
            if (on.kolejnyMiesiac) {
              var foundWkndNext = (res.dyzuryKolejnegoMiesiaca || []).find(function(it) {
                return it.typ === 'Msza niedzielna' && (it.dzienTabeli === on.dzien || it.dzien === on.dzien);
              });
              mojaGodzinaWtedy = foundWkndNext ? foundWkndNext.godzina : '';
            } else {
              mojaGodzinaWtedy = (res.godzinyWeekendy && res.godzinyWeekendy[on.dzien]) ? res.godzinyWeekendy[on.dzien].godzina : res.mojaGodzinaNiedziela;
            }

            var akceptowaneGodz = on.akceptowaneGodziny || on.godzinyAkceptowane || [];
            var godzOdd = on.godzinaOddawana || on.godzina || '10:00';

            var pasujeGodzina = mojaGodzinaWtedy && (akceptowaneGodz.indexOf(cleanTime(mojaGodzinaWtedy)) !== -1 || akceptowaneGodz.indexOf(mojaGodzinaWtedy) !== -1);
            var isCutoffWknd = czyWeekendMszaPrzeterminowana(on.dzien, godzOdd, on.rok, on.miesiacIdx) || (mojaGodzinaWtedy && czyWeekendMszaPrzeterminowana(on.dzien, mojaGodzinaWtedy, on.rok, on.miesiacIdx));

            var badgeMonthW = on.kolejnyMiesiac 
              ? ' <span style="font-size:10px; font-weight:700; color:#93c5fd; background:rgba(59,130,246,0.15); border:1px solid rgba(59,130,246,0.3); padding:2px 6px; border-radius:4px; text-transform:uppercase; margin-left:6px;">Nowy miesiąc</span>' 
              : '';

            var html = '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">' +
                         '<span style="font-weight:700; color:#ffffff; font-size:14px; letter-spacing:-0.01em;">' + on.wystawiajacy + badgeMonthW + '</span>' +
                         '<span class="badge-gielda badge-gielda-weekend">Weekend</span>' +
                       '</div>' +
                       '<div style="font-size:13px; color:#fafafa;">Oddaje: <b>' + (godzOdd === '17:00' ? ('Sobota ' + (on.dzien - 1) + ' ' + on.nazwaMiesiacaGen) : ('Niedziela ' + on.dzien + ' ' + on.nazwaMiesiacaGen)) + '</b>, godz. <b>' + godzOdd + '</b></div>' +
                       '<div style="font-size:12px; color:#a1a1aa; margin-top:4px;">Może przyjąć: <span style="color:#ffffff; font-weight:600;">' + (akceptowaneGodz.length ? akceptowaneGodz.join(', ') : 'dowolną') + '</span></div>';

            if (isMyOfferWknd) {
              html += '<div style="margin-top:10px;"><button class="btn-cancel" onclick="anulujNiedziele(\'' + on.id + '\', \'' + on.docKey + '\')">Anuluj ofertę</button></div>';
            } else if (isCutoffWknd) {
              html += '<div style="margin-top:10px;"><button class="btn-action" disabled style="opacity:0.5; cursor:not-allowed; background:#27272a; color:#a1a1aa; border-color:#3f3f46;">Zbyt późno na zamianę (< 2h do mszy)</button></div>';
            } else if (pasujeGodzina) {
              html += '<div style="margin-top:10px;"><button class="btn-action" onclick="akceptujNiedziele(\'' + on.id + '\', \'' + on.docKey + '\')">Zamień swoją ' + mojaGodzinaWtedy + ' na ' + godzOdd + '</button></div>';
            } else {
              html += '<div style="color:#f87171; font-size:12px; margin-top:6px; font-weight:500;">Twoja godzina w ten weekend (' + (mojaGodzinaWtedy || 'brak') + ') nie pasuje</div>';
            }
            box.innerHTML = html;
            divWszystkie.appendChild(box);
          });
        }

        // Zastosuj aktualny filtr
        if (typeof filtrujGielde === 'function') {
          filtrujGielde(aktywnyFiltrGieldy || 'wszystkie');
        }
      }

      // 5. Wolne zastępstwa do wzięcia (+4 pkt) na giełdzie (bieżący i kolejny miesiąc)
      var listaWolneDiv = document.getElementById('lista-wolne-zastepstwa');
      var badgeWolneCount = document.getElementById('badge-wolne-count');
      if (listaWolneDiv) {
        var curW = (res.wolneZastepstwa || []).filter(function(z) {
          if (!z || !z.dzien) return false;
          if (z.typ && z.typ !== 'Tydzień') return false;
          if (z.status !== 'OCZEKUJE' && z.status) return false;
          if (z.dzien < res.dzisDzien) return false;
          var zG = cleanTime(z.godzina) || '18:00';
          if (czyLiturgiaJuzMinela(z.dzien, zG, null, res.rok, res.miesiacIdx)) return false;
          return true;
        });
        var nextW = [];
        var isSameMNext = daneKolejnegoMiesiaca && (
          (typeof czyToTenSamKluczMiesiaca === 'function' && czyToTenSamKluczMiesiaca(daneKolejnegoMiesiaca.docId, pobierzAktywnyKluczMiesiaca())) ||
          (daneKolejnegoMiesiaca.miesiacIdx === res.miesiacIdx && daneKolejnegoMiesiaca.rok === res.rok)
        );
        if (daneKolejnegoMiesiaca && daneKolejnegoMiesiaca.wolneZastepstwa && !isSameMNext) {
          var nM = (daneKolejnegoMiesiaca.miesiacIdx !== undefined) ? daneKolejnegoMiesiaca.miesiacIdx : (res.miesiacIdx + 1) % 12;
          var nY = daneKolejnegoMiesiaca.rok || res.rok;
          var nextKeyWz = wyznaczKluczMiesiaca(new Date(nY, nM, 1));
          nextW = daneKolejnegoMiesiaca.wolneZastepstwa.filter(function(z) {
            return (!z.typ || z.typ === 'Tydzień') && (z.status === 'OCZEKUJE' || !z.status);
          }).map(function(z) {
            var zOdd = (z.oddajacy || "").trim().toLowerCase();
            var isMine = !!(zOdd && (zOdd === myNamePulpit || zOdd.indexOf(myNamePulpit) !== -1 || myNamePulpit.indexOf(zOdd) !== -1));
            return Object.assign({}, z, {
              czyMoje: isMine,
              rok: nY,
              miesiacIdx: nM,
              nazwaMiesiacaGen: polishMonthsGenitive[nM] || 'kolejnego miesiąca',
              docKey: nextKeyWz,
              kolejnyMiesiac: true
            });
          });
        }

        var wolneOferty = curW.concat(nextW);
        var doWziecia = wolneOferty.filter(function(z) { return !z.czyMoje; });

        if (badgeWolneCount) {
          badgeWolneCount.innerText = doWziecia.length + (doWziecia.length === 1 ? ' wolny' : (doWziecia.length >= 2 && doWziecia.length <= 4 ? ' wolne' : ' wolnych'));
        }

        if (wolneOferty.length === 0) {
          listaWolneDiv.innerHTML = '<div style="color:#34d399; text-align:center; padding:10px 0; font-size:13px;">Brak wolnych dyżurów do wzięcia. Wszyscy są obecni.</div>';
        } else {
          var htmlWolne = '';
          wolneOferty.forEach(function(zo) {
            var zRok = zo.rok || res.rok;
            var zMies = (zo.miesiacIdx !== undefined) ? zo.miesiacIdx : res.miesiacIdx;
            var zNazwaMies = zo.nazwaMiesiacaGen || res.nazwaMiesiaca;
            var dzienNazwa = zo.dzienTygodnia || pobierzDzienTygodnia(zRok, zMies, zo.dzien);
            var formatDaty = zo.dzien + ' ' + zNazwaMies + ' (' + dzienNazwa + ')';
            var badgeMonthWz = zo.kolejnyMiesiac 
              ? ' <span style="font-size:10px; font-weight:700; color:#93c5fd; background:rgba(59,130,246,0.15); border:1px solid rgba(59,130,246,0.3); padding:2px 6px; border-radius:4px; text-transform:uppercase; margin-left:6px;">Nowy miesiąc</span>' 
              : '';

            if (zo.czyMoje) {
              htmlWolne += '<div class="zastepstwo-box" style="border-left: 3px solid #fbbf24;">' +
                   '<div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">' +
                     '<span class="zastepstwo-data" style="color:#ffffff; font-weight:700;">' + formatDaty + badgeMonthWz + '</span>' +
                     '<span style="font-size:11px; font-weight:600; background:rgba(245,158,11,0.15); color:#fbbf24; border:1px solid rgba(245,158,11,0.3); padding:2px 8px; border-radius:9999px;">Twoja oferta</span>' +
                   '</div>' +
                   '<div class="zastepstwo-szczegoly">' +
                     'Wystawiłeś ten dyżur jako wolny. Jeśli ktoś go przejmie i przyjdzie na mszę, otrzymasz <b>+1 pkt</b>.' +
                   '</div>' +
                   '<div style="margin-top:10px; display:flex; justify-content:flex-end;">' +
                     '<button class="btn-cancel" style="width:auto; padding:6px 14px; margin:0; font-size:12px;" onclick="anulujMojeZastepstwo(\'' + zo.id + '\', ' + zo.dzien + ', \'' + (zo.docKey || '') + '\')">Wycofaj z giełdy</button>' +
                   '</div>' +
                 '</div>';
            } else {
              var escapedOdd = zo.oddajacy ? zo.oddajacy.replace(/'/g, "\\'") : '';
              var mamDyzurWTymDniu = false;
              var powodBlokady = '';
              if (zo.kolejnyMiesiac) {
                var foundNextDuty = (res.dyzuryKolejnegoMiesiaca || []).some(function(it) {
                  return it.dzien === zo.dzien;
                });
                if (foundNextDuty) {
                  mamDyzurWTymDniu = true;
                  powodBlokady = 'Masz już wyznaczony własny dyżur w tym dniu';
                }
              } else {
                if (zo.typ === 'Tydzień') {
                  if (res.mojeDyzuryTydzien && res.mojeDyzuryTydzien.indexOf(zo.dzien) !== -1) {
                    mamDyzurWTymDniu = true;
                    powodBlokady = 'Masz już wyznaczony własny dyżur w tym dniu';
                  }
                } else if (zo.typ === 'Niedziela' || zo.typ === 'Weekend') {
                  var mojaGodzWtedy = (res.godzinyWeekendy && res.godzinyWeekendy[zo.dzien]) ? res.godzinyWeekendy[zo.dzien].godzina : res.mojaGodzinaNiedziela;
                  if (mojaGodzWtedy && zo.godzina && cleanTime(mojaGodzWtedy) === cleanTime(zo.godzina)) {
                    mamDyzurWTymDniu = true;
                    powodBlokady = 'Masz już własny dyżur w tę niedzielę o godz. ' + mojaGodzWtedy;
                  }
                }
              }
              var mamPrzejetWTymDniu = (res.mojePrzejeteZastepstwa && res.mojePrzejeteZastepstwa[zo.dzien]);

              var ptsSub = (zo.typ === 'Niedziela' || zo.typ === 'Weekend') ? 3 : 4;
              if (zo.punkty !== undefined && zo.punkty !== null) ptsSub = zo.punkty;

              var czyMineloWolne = czyMszaJuzSieRozpoczela(zo.dzien, zo.godzina, zRok, zMies);

              var przyciskHtml = '';
              if (czyMineloWolne) {
                przyciskHtml = '<div style="color:#a1a1aa; font-size:12px; font-weight:500; padding:8px 12px; background:rgba(161,161,170,0.1); border-radius:6px; border:1px solid rgba(161,161,170,0.2);">' +
                                 '<span>Czas na przejęcie minął (msza święta już się rozpoczęła)</span>' +
                               '</div>';
              } else if (mamDyzurWTymDniu) {
                przyciskHtml = '<div style="color:#fbbf24; font-size:12px; font-weight:500; padding:8px 12px; background:rgba(251,191,36,0.1); border-radius:6px; border:1px solid rgba(251,191,36,0.3);">' +
                                 '<span>' + powodBlokady + '</span>' +
                               '</div>';
              } else if (mamPrzejetWTymDniu) {
                przyciskHtml = '<div style="color:#fbbf24; font-size:12px; font-weight:500; padding:8px 12px; background:rgba(251,191,36,0.1); border-radius:6px; border:1px solid rgba(251,191,36,0.3);">' +
                                 '<span>Masz już podjęte zastępstwo w tym dniu</span>' +
                               '</div>';
              } else {
                przyciskHtml = '<button class="btn-wez-dyzur" onclick="otworzModalWezDyzur(\'' + zo.id + '\', ' + zo.dzien + ', \'' + escapedOdd + '\', ' + zRok + ', ' + zMies + ', \'' + (zo.docKey || '') + '\')">Weź dyżur (+' + ptsSub + ' pkt)</button>';
              }

              htmlWolne += '<div class="zastepstwo-box">' +
                             '<div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">' +
                               '<span class="zastepstwo-data">' + formatDaty + badgeMonthWz + '</span>' +
                               '<span class="badge-plus4">+' + ptsSub + ' PKT</span>' +
                             '</div>' +
                             '<div class="zastepstwo-szczegoly">' +
                               'Oddający: <b>' + zo.oddajacy + '</b>' + (zo.godzina ? ' • Godz. ' + zo.godzina : '') + '<br>' +
                               'Typ dyżuru: ' + zo.typ +
                             '</div>' +
                             '<div style="margin-top:10px;">' +
                               przyciskHtml +
                             '</div>' +
                           '</div>';
            }
          });
          listaWolneDiv.innerHTML = htmlWolne;
        }
      }

      // Zapisz snapshot do cache (Optimistic UI — szybkie wczytanie przy następnej wizycie)
      try { localStorage.setItem('min_cached_data', JSON.stringify(res)); } catch(e) {}
    }

    function otworzGielde() {
      pokazWidok('gielda');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function zamknijGielde() {
      pokazWidok('pulpit');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

// =============================================================
    // MODUŁ NAGRÓD MIESIĘCZNYCH DLA TOP 3 (50 ZŁ)
    // =============================================================
    var aktualnyMiesiacNagrody = null;
    var unsubNagrodyMinistranta = null;

    function czyToTenSamMinistrant(n1, n2) {
      if (!n1 || !n2) return false;
      var s1 = n1.toString().trim().toLowerCase();
      var s2 = n2.toString().trim().toLowerCase();
      if (s1 === s2 || s1.indexOf(s2) !== -1 || s2.indexOf(s1) !== -1) return true;
      var w1 = s1.split(/\s+/).filter(function(w) { return w.length >= 3; });
      var w2 = s2.split(/\s+/).filter(function(w) { return w.length >= 3; });
      if (w1.length >= 2 && w2.length >= 2) {
        var matchCount = 0;
        for (var i = 0; i < w1.length; i++) {
          if (s2.indexOf(w1[i]) !== -1) matchCount++;
        }
        return matchCount >= 2;
      }
      return false;
    }

    function wyznaczPoprzedniMiesiacId() {
      var now = new Date();
      var mIdx = now.getMonth();
      var y = now.getFullYear();
      var prevMIdx = mIdx - 1;
      var prevY = y;
      if (prevMIdx < 0) {
        prevMIdx = 11;
        prevY = y - 1;
      }
      var polishMonths = [
        "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
        "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
      ];
      return polishMonths[prevMIdx] + "_" + prevY;
    }

    
    function pokazModalSukcesuZakrystii(liturgiaTekst, ilosc) {
      var modal = document.getElementById('modal-sukces-zakrystia');
      var opis = document.getElementById('modal-sukces-zakrystia-opis');
      if (opis) {
        opis.innerHTML = 'Obecność na: <b>' + (liturgiaTekst || 'Mszy') + '</b><br>została trwale i pomyślnie zapisana w grafiku dla <b>' + ilosc + '</b> ministrantów.';
      }
      if (modal) modal.style.display = 'flex';
      aktualizujBlokadeScrolla();
    }

    function zamknijModalSukcesuZakrystii() {
      var modal = document.getElementById('modal-sukces-zakrystia');
      if (modal) modal.style.display = 'none';
      aktualizujBlokadeScrolla();
    }

    function otworzModalHistoriaZakrystia() {
      var modal = document.getElementById('modal-historia-zakrystia');
      if (!modal) return;
      modal.style.display = 'flex';
      aktualizujBlokadeScrolla();
      renderujHistorieZakrystii();
    }

    function zamknijModalHistoriaZakrystia() {
      var modal = document.getElementById('modal-historia-zakrystia');
      if (modal) modal.style.display = 'none';
      aktualizujBlokadeScrolla();
    }

    function filtrujHistorieZakrystii() {
      var input = document.getElementById('szukaj-w-historii-zakrystia');
      var q = input ? input.value.toLowerCase().trim() : '';
      renderujHistorieZakrystii(q);
    }

    function renderujHistorieZakrystii(filter) {
      var box = document.getElementById('modal-historia-zakrystia-lista');
      if (!box) return;
      var logs = (tabelaMiesiacaDane && tabelaMiesiacaDane.historiaWpisow) ? tabelaMiesiacaDane.historiaWpisow : [];
      if (filter) {
        logs = logs.filter(function(l) {
          return (l.nazwisko || '').toLowerCase().indexOf(filter) !== -1 ||
                 (l.liturgia || '').toLowerCase().indexOf(filter) !== -1 ||
                 (l.dzien || '').toLowerCase().indexOf(filter) !== -1;
        });
      }

      if (logs.length === 0) {
        box.innerHTML = '<div style="text-align:center; padding:24px; color:#94a3b8; font-size:13px;">Brak wpisów w historii.</div>';
        return;
      }

      var h = '';
      logs.forEach(function(l) {
        var badgeColor = '#a1a1aa';
        var badgeBg = '#27272a';
        var badgeBorder = '1px solid #3f3f46';
        var ptsText = (l.punkty > 0 ? '+' : '') + l.punkty + ' pkt';
        if (l.punkty > 0) {
          badgeColor = '#34d399';
          badgeBg = 'rgba(16, 185, 129, 0.15)';
          badgeBorder = '1px solid rgba(16, 185, 129, 0.3)';
        } else if (l.punkty < 0) {
          badgeColor = '#f87171';
          badgeBg = 'rgba(239, 68, 68, 0.15)';
          badgeBorder = '1px solid rgba(239, 68, 68, 0.3)';
        }

        var statusInfo = l.status || '';
        if (l.typ === 'ZASTEPCA') statusInfo += ' (Zastępstwo za ' + (l.zastepuje || 'kogoś') + ')';
        else if (l.typ === 'DODATKOWY') statusInfo += ' (Służba dodatkowa)';

        h += '<div style="background:#18181b; border:1px solid #27272a; border-radius:8px; padding:12px 14px; margin-bottom:8px; box-shadow:0 1px 3px rgba(0,0,0,0.2);">' +
          '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">' +
            '<div>' +
              '<span style="font-weight:700; font-size:14px; color:#ffffff;">' + (l.nazwisko || '') + '</span>' +
              '<div style="font-size:12px; color:#a1a1aa; margin-top:2px;">' +
                (l.dzien || '') + ' • godz. ' + (l.godzina || '') + ' (' + (l.liturgia || 'Msza') + ')' +
              '</div>' +
              '<div style="font-size:12px; color:#a1a1aa; margin-top:3px;">Status: <b style="color:#ffffff;">' + statusInfo + '</b></div>' +
            '</div>' +
            '<div style="text-align:right;">' +
              '<span style="display:inline-block; font-size:12px; font-weight:800; padding:3px 8px; border-radius:6px; background:' + badgeBg + '; color:' + badgeColor + '; border:' + badgeBorder + ';">' + ptsText + '</span>' +
              '<div style="font-size:11px; color:#71717a; margin-top:4px;">' + (l.czas || '') + '<br>przez: ' + (l.wpisal || 'Kościelny') + '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
      });

      box.innerHTML = h;
    }

    function otworzModalNagrodyZakrystia() {
      var modal = document.getElementById('modal-nagrody-zakrystia');
      if (!modal) return;
      modal.style.display = 'flex';

      // Wypełnij select miesięcy jeśli pusty
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
      }

      var domyslnyMiesiac = wyznaczPoprzedniMiesiacId();
      if (sel) {
        sel.value = domyslnyMiesiac;
      }
      zaladujNagrodyDlaMiesiaca(domyslnyMiesiac);
    }

    function zamknijModalNagrodyZakrystia() {
      var modal = document.getElementById('modal-nagrody-zakrystia');
      if (modal) modal.style.display = 'none';
    }

    async function zaladujNagrodyDlaMiesiaca(miesiacId, wymusPrzeliczenie) {
      aktualnyMiesiacNagrody = miesiacId || wyznaczPoprzedniMiesiacId();
      var box = document.getElementById('lista-laureatow-nagrody');
      if (!box) return;
      box.innerHTML = '<div style="text-align:center; padding:24px; color:#a1a1aa;"><span class="mini-spin" style="font-size:20px;">⟳</span> Ładowanie rankingu TOP 3...</div>';

      try {
        var dane = await pobierzLubObliczNagrodyMiesiaca(aktualnyMiesiacNagrody, wymusPrzeliczenie);
        renderujListeNagrodZakrystia(dane);
      } catch(e) {
        console.error('Błąd ładowania nagród:', e);
        box.innerHTML = '<div style="text-align:center; padding:20px; color:#ef4444;">Nie udało się załadować rankingu dla tego miesiąca.</div>';
      }
    }

    async function pobierzLubObliczNagrodyMiesiaca(miesiacId, wymusPrzeliczenie) {
      if (!dbFirestore) throw new Error('Brak połączenia z bazą');

      var docRef = dbFirestore.collection('nagrody_miesieczne').doc(miesiacId);
      var snap = await docRef.get();
      var istniejaceDane = snap.exists ? snap.data() : null;

      var teraz = new Date();
      var nazwyMiesiecy = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
      var biezacyMiesiacId = nazwyMiesiecy[teraz.getMonth()] + '_' + teraz.getFullYear();
      var czyBiezacy = (miesiacId === biezacyMiesiacId);

      // Jeśli mamy już dane, a nie jest to bieżący miesiąc i nie zażądano wymuszonego przeliczenia:
      if (istniejaceDane && !czyBiezacy && !wymusPrzeliczenie) {
        return istniejaceDane;
      }

      // W przeciwnym razie pobierz stan grafiku dla tego miesiąca i wyznacz TOP 3
      var grafikDoc = await dbFirestore.collection('stan_grafiku').doc(miesiacId).get();
      if (!grafikDoc.exists) {
        return istniejaceDane || { miesiacId: miesiacId, laureaci: [] };
      }

      var gData = grafikDoc.data();
      var wiersze = (gData.wiersze || []).filter(function(w) {
        if (!w || !w.nazwisko) return false;
        var n = w.nazwisko.toLowerCase().trim();
        return n && n !== 'kościelny' && n !== 'koscielny';
      });

      var obliczeni = wiersze.map(function(w) {
        var obecnosci = (w.komorki || []).filter(function(k) {
          return typeof k.wartosc === 'number' && k.wartosc > 0;
        }).length;
        return {
          nazwisko: w.nazwisko,
          punkty: w.suma || 0,
          obecnosci: obecnosci
        };
      });

      // Sortowanie: punkty malejąco, przy remisie obecności malejąco
      obliczeni.sort(function(a, b) {
        return (b.punkty - a.punkty) || (b.obecnosci - a.obecnosci);
      });

      var top3 = obliczeni.slice(0, 3);
      var laureaci = top3.map(function(item, idx) {
        var stary = null;
        if (istniejaceDane && istniejaceDane.laureaci) {
          stary = istniejaceDane.laureaci.find(function(l) {
            return czyToTenSamMinistrant(l.nazwisko, item.nazwisko);
          });
        }
        return {
          miejsce: idx + 1,
          nazwisko: item.nazwisko,
          punkty: item.punkty,
          obecnosci: item.obecnosci,
          kwota: "50 zł",
          odebrane: stary ? !!stary.odebrane : false,
          dataOdbioru: stary ? (stary.dataOdbioru || null) : null
        };
      });

      var payload = {
        miesiacId: miesiacId,
        nazwaMiesiaca: miesiacId.split('_')[0],
        rok: parseInt(miesiacId.split('_')[1], 10) || (new Date()).getFullYear(),
        utworzono: (istniejaceDane && istniejaceDane.utworzono) ? istniejaceDane.utworzono : new Date().toISOString(),
        zaktualizowano: new Date().toISOString(),
        laureaci: laureaci
      };

      await docRef.set(payload);
      return payload;
    }

    function renderujListeNagrodZakrystia(dane) {
      var box = document.getElementById('lista-laureatow-nagrody');
      if (!box) return;

      var laureaci = (dane && dane.laureaci) ? dane.laureaci : [];
      if (laureaci.length === 0) {
        box.innerHTML = '<div style="text-align:center; padding:24px; color:#a1a1aa;">Brak danych rankingu dla wybranego miesiąca.</div>';
        return;
      }

      var medalePodium = [
        { bg: 'rgba(234, 179, 8, 0.15)', text: '#facc15', border: 'rgba(234, 179, 8, 0.45)', cardBorder: 'rgba(234, 179, 8, 0.35)', cardBg: 'rgba(234, 179, 8, 0.04)' },
        { bg: 'rgba(148, 163, 184, 0.15)', text: '#cbd5e1', border: 'rgba(148, 163, 184, 0.45)', cardBorder: 'rgba(148, 163, 184, 0.25)', cardBg: 'rgba(148, 163, 184, 0.03)' },
        { bg: 'rgba(180, 83, 9, 0.15)', text: '#fdba74', border: 'rgba(180, 83, 9, 0.45)', cardBorder: 'rgba(180, 83, 9, 0.25)', cardBg: 'rgba(180, 83, 9, 0.03)' }
      ];
      var html = '';

      laureaci.forEach(function(l, idx) {
        var mStyle = medalePodium[idx] || { bg: '#27272a', text: '#fafafa', border: '#3f3f46', cardBorder: '#27272a', cardBg: '#18181b' };
        var isOdebrane = !!l.odebrane;
        
        var cardBg = isOdebrane ? 'rgba(16, 185, 129, 0.04)' : mStyle.cardBg;
        var cardBorder = isOdebrane ? 'rgba(16, 185, 129, 0.35)' : mStyle.cardBorder;

        var btnAction = isOdebrane
          ? '<div style="display:flex; align-items:center; gap:6px;">' +
              '<span style="font-size:12px; font-weight:600; color:#34d399; background:rgba(16,185,129,0.12); padding:5px 10px; border-radius:6px; border:1px solid rgba(16,185,129,0.3); display:inline-flex; align-items:center; gap:4px;">✓ Odebrano ' + (l.dataOdbioru ? '(' + l.dataOdbioru + ')' : '') + '</span>' +
              '<button type="button" class="btn-secondary" onclick="zmienStatusOdbioruNagrody(\'' + l.nazwisko.replace(/'/g, "\\'") + '\', false)" style="width:auto; padding:5px 8px; font-size:12px; background:#27272a; color:#a1a1aa; border:1px solid #3f3f46; border-radius:6px; cursor:pointer;" title="Cofnij odbiór">↩</button>' +
            '</div>'
          : '<button type="button" onclick="zmienStatusOdbioruNagrody(\'' + l.nazwisko.replace(/'/g, "\\'") + '\', true)" style="width:auto; padding:8px 14px; font-size:12px; font-weight:700; background:#10b981; color:#09090b; border-radius:6px; border:none; cursor:pointer; display:inline-flex; align-items:center; gap:6px; transition:all 0.15s ease;">' +
              'Odhacz odbiór' +
            '</button>';

        html += '<div style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; background:' + cardBg + '; border:1px solid ' + cardBorder + '; border-radius:8px; gap:10px; transition:all 0.15s ease;">' +
                  '<div style="display:flex; align-items:center; gap:12px;">' +
                    '<span style="display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:50%; background:' + mStyle.bg + '; color:' + mStyle.text + '; border:1px solid ' + mStyle.border + '; font-size:13px; font-weight:800; flex-shrink:0;">' +
                      l.miejsce +
                    '</span>' +
                    '<div>' +
                      '<div style="font-weight:700; font-size:14px; color:#ffffff; letter-spacing:-0.01em;">' +
                        l.nazwisko +
                      '</div>' +
                      '<div style="font-size:12px; color:#a1a1aa; margin-top:2px;">' +
                        l.punkty + ' pkt • ' + l.obecnosci + ' obecności • <span style="color:#34d399; font-weight:700;">50 zł</span>' +
                      '</div>' +
                    '</div>' +
                  '</div>' +
                  '<div>' + btnAction + '</div>' +
                '</div>';
      });

      box.innerHTML = html;
    }

    async function zmienStatusOdbioruNagrody(nazwisko, nowyStatus) {
      if (!aktualnyMiesiacNagrody || !dbFirestore) return;
      try {
        var docRef = dbFirestore.collection('nagrody_miesieczne').doc(aktualnyMiesiacNagrody);
        var snap = await docRef.get();
        if (!snap.exists) return;
        var data = snap.data();
        var laureaci = data.laureaci || [];

        for (var i = 0; i < laureaci.length; i++) {
          if (czyToTenSamMinistrant(laureaci[i].nazwisko, nazwisko)) {
            laureaci[i].odebrane = nowyStatus;
            laureaci[i].dataOdbioru = nowyStatus ? new Date().toLocaleDateString('pl-PL') : null;
            break;
          }
        }

        await docRef.set({ laureaci: laureaci, zaktualizowano: new Date().toISOString() }, { merge: true });
        renderujListeNagrodZakrystia({ laureaci: laureaci });
        pokazToast(nowyStatus ? 'Oznaczono odbiór nagrody (50 zł)' : 'Cofnięto odbiór nagrody');
      } catch(e) {
        console.error('Błąd zmiany statusu nagrody:', e);
        pokazToast('Wystąpił błąd podczas zapisu.');
      }
    }

    function sprawdzNagrodyDlaMinistranta(nazwisko) {
      var baner = document.getElementById('baner-nagroda-top3');
      if (!baner || !nazwisko || !dbFirestore) return;

      var prevId = wyznaczPoprzedniMiesiacId();

      if (unsubNagrodyMinistranta) {
        try { unsubNagrodyMinistranta(); } catch(e) {}
        unsubNagrodyMinistranta = null;
      }

      unsubNagrodyMinistranta = dbFirestore.collection('nagrody_miesieczne').doc(prevId).onSnapshot(async function(doc) {
        if (!doc.exists) {
          try {
            await pobierzLubObliczNagrodyMiesiaca(prevId);
          } catch(e) {}
          return;
        }

        var data = doc.data();
        var laureaci = (data && data.laureaci) ? data.laureaci : [];
        var mojaNagroda = laureaci.find(function(l) {
          return czyToTenSamMinistrant(l.nazwisko, nazwisko);
        });

        if (mojaNagroda && !mojaNagroda.odebrane) {
          var tytul = document.getElementById('nagroda-top3-tytul');
          var tresc = document.getElementById('nagroda-top3-tresc');
          var nazwaM = prevId.split('_')[0];
          var medal = mojaNagroda.miejsce === 1 ? '1.' : (mojaNagroda.miejsce === 2 ? '2.' : '3.');
          if (tytul) tytul.innerText = 'Gratulacje! Zająłeś ' + medal + ' miejsce w rankingu za ' + nazwaM + '!';
          if (tresc) tresc.innerHTML = 'Przysługuje Ci nagroda <b>50 zł</b>. Zgłoś się do kościelnego w zakrystii po odbiór.';
          baner.style.display = 'block';
        } else {
          // Po odebraniu nagrody znika z aplikacji!
          baner.style.display = 'none';
        }
      }, function(err) {
        console.warn('Błąd nasłuchu nagród:', err);
      });
    }