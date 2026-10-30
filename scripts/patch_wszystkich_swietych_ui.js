const fs = require('fs');
const path = require('path');

// 1. Patch public/js/zakrystia.js
const zakPath = path.join(__dirname, '..', 'public', 'js', 'zakrystia.js');
let zakContent = fs.readFileSync(zakPath, 'utf8');
const isCrlfZak = zakContent.includes('\r\n');
zakContent = zakContent.replace(/\r\n/g, '\n');

// 1a. Update fallback for 1 listopada in aktualizujGodzinyZakrystiiDlaDnia
const targetFallbackNov1 = `        if (d === 1 && m === 10) {
          // Uroczystość Wszystkich Świętych (1 listopada)
          optHtml += '<option value="08:30" data-rodzaj="msza_swieto" data-punkty="5" data-nazwa="Uroczystość Wszystkich Świętych">08:30 (Uroczystość Wszystkich Świętych - 5 pkt)</option>';
          optHtml += '<option value="10:00" data-rodzaj="msza_swieto" data-punkty="5" data-nazwa="Uroczystość Wszystkich Świętych">10:00 (Uroczystość Wszystkich Świętych - 5 pkt)</option>';
          optHtml += '<option value="11:30" data-rodzaj="msza_swieto" data-punkty="5" data-nazwa="Uroczystość Wszystkich Świętych">11:30 (Uroczystość Wszystkich Świętych - 5 pkt)</option>';
          optHtml += '<option value="15:00" data-rodzaj="msza_swieto" data-punkty="5" data-nazwa="Uroczystość Wszystkich Świętych">15:00 (Uroczystość Wszystkich Świętych - 5 pkt)</option>';
          optHtml += '<option value="16:00" data-rodzaj="msza_swieto" data-punkty="5" data-nazwa="Uroczystość Wszystkich Świętych">16:00 (Uroczystość Wszystkich Świętych - 5 pkt)</option>';
        }`;

const replacementFallbackNov1 = `        if (d === 1 && m === 10) {
          // Uroczystość Wszystkich Świętych (1 listopada)
          optHtml += '<option value="08:30" data-rodzaj="msza_swieto" data-punkty="5" data-nazwa="Uroczystość Wszystkich Świętych">08:30 (Uroczystość Wszystkich Świętych - 5 pkt)</option>';
          optHtml += '<option value="10:00" data-rodzaj="msza_swieto" data-punkty="5" data-nazwa="Uroczystość Wszystkich Świętych">10:00 (Uroczystość Wszystkich Świętych - 5 pkt)</option>';
          optHtml += '<option value="11:30" data-rodzaj="msza_swieto" data-punkty="5" data-nazwa="Uroczystość Wszystkich Świętych">11:30 (Uroczystość Wszystkich Świętych - 5 pkt)</option>';
          optHtml += '<option value="15:00" data-rodzaj="nabozenstwo" data-punkty="4" data-nazwa="Nabożeństwo na cmentarzu i procesja">15:00 (Nabożeństwo na cmentarzu i procesja - 4 pkt)</option>';
          optHtml += '<option value="16:00" data-rodzaj="msza_swieto" data-punkty="4" data-nazwa="Msza św. popołudniowa (Wszystkich Świętych)">16:00 (Msza św. popołudniowa - 4 pkt)</option>';
        }`;

if (zakContent.includes(targetFallbackNov1)) {
  zakContent = zakContent.replace(targetFallbackNov1, replacementFallbackNov1);
  console.log('[OK] Patched targetFallbackNov1 in zakrystia.js');
} else {
  console.warn('[WARN] targetFallbackNov1 not found');
}

// 1b. Update przelaczZgloszenieLiturgia to sync across months and send Telegram notification
const targetPrzelacz = `    function przelaczZgloszenieLiturgia(litId) {
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
    }`;

const replacementPrzelacz = `    function przelaczZgloszenieLiturgia(litId) {
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

      var isZgloszenie = (idx === -1);
      if (idx !== -1) {
        lit.zgloszeni.splice(idx, 1);
        pokazToast('Wycofano zgłoszenie ze służby.');
      } else {
        lit.zgloszeni.push(myName);
        pokazToast('Zgłoszono obecność na ' + lit.rodzaj + '! (+' + (lit.punkty || 4) + ' pkt po mszy)');
      }

      // Synchronizacja w pamięci podręcznej obu miesięcy
      if (tabelaMiesiacaDane && tabelaMiesiacaDane.liturgieDodatkowe) {
        var cIdx = tabelaMiesiacaDane.liturgieDodatkowe.findIndex(function(l) { return l.id === litId; });
        if (cIdx !== -1) tabelaMiesiacaDane.liturgieDodatkowe[cIdx].zgloszeni = lit.zgloszeni;
      }
      if (daneKolejnegoMiesiaca && daneKolejnegoMiesiaca.liturgieDodatkowe) {
        var nIdx = daneKolejnegoMiesiaca.liturgieDodatkowe.findIndex(function(l) { return l.id === litId; });
        if (nIdx !== -1) daneKolejnegoMiesiaca.liturgieDodatkowe[nIdx].zgloszeni = lit.zgloszeni;
      }

      // 1. Zapis do Firestore
      if (dbFirestore) {
        var isNov1 = (lit.miesiacIdx === 10 || (lit.id && lit.id.indexOf('11_01') !== -1));
        var docsToSync = [targetDocKey];
        if (isNov1) {
          if (docsToSync.indexOf('Listopad_2026') === -1) docsToSync.push('Listopad_2026');
          if (docsToSync.indexOf('Pazdziernik_2026') === -1) docsToSync.push('Pazdziernik_2026');
        }

        docsToSync.forEach(function(dKey) {
          dbFirestore.collection('stan_grafiku').doc(dKey).get().then(function(snap) {
            if (snap.exists) {
              var sLits = snap.data().liturgieDodatkowe || [];
              var sIdx = sLits.findIndex(function(l) { return l.id === litId; });
              if (sIdx !== -1) {
                sLits[sIdx].zgloszeni = lit.zgloszeni;
                dbFirestore.collection('stan_grafiku').doc(dKey).set({
                  liturgieDodatkowe: sLits
                }, { merge: true });
              }
            }
          }).catch(function(e) {
            console.warn('Błąd synchronizacji zgloszenia Firestore (' + dKey + '):', e);
          });
        });
      }

      // 2. Powiadomienie Telegram do bota
      if (typeof wyslijPowiadomienieTelegram === 'function') {
        var ikonaTel = isZgloszenie ? '🕯️' : '↩️';
        var naglowekTel = isZgloszenie ? 'Nowe zgłoszenie na służbę' : 'Wycofanie zgłoszenia ze służby';
        var maxStr = lit.maxOsob ? (' / ' + lit.maxOsob) : '';
        var tMsg = ikonaTel + ' <b>' + naglowekTel + ' (Wszystkich Świętych)</b>\\n' +
                   '👤 Ministrant: <b>' + myName + '</b>\\n' +
                   '📅 Służba: ' + lit.rodzaj + ' (' + (lit.dataTekst || '') + ' • Godz. ' + (cleanTime(lit.godzina) || lit.godzina) + ')\\n' +
                   '⭐ Punkty: +' + (lit.punkty || 4) + ' pkt\\n' +
                   '👥 Zgłoszeni (' + lit.zgloszeni.length + maxStr + '): ' + (lit.zgloszeni.join(', ') || 'Brak');
        wyslijPowiadomienieTelegram(tMsg);
      }

      // 3. Odśwież widok natychmiast
      if (targetDocKey === pobierzAktywnyKluczMiesiaca()) {
        try { localStorage.setItem('min_cached_tabela', JSON.stringify(tabelaMiesiacaDane)); } catch(e) {}
      } else {
        try { localStorage.setItem('min_cached_tabela_' + targetDocKey, JSON.stringify(daneKolejnegoMiesiaca)); } catch(e) {}
      }
      var stan = generujStanZFirestore(globalUser.nazwisko, tabelaMiesiacaDane);
      if (stan) renderujDane(stan);
    }`;

if (zakContent.includes(targetPrzelacz)) {
  zakContent = zakContent.replace(targetPrzelacz, replacementPrzelacz);
  console.log('[OK] Patched przelaczZgloszenieLiturgia in zakrystia.js');
} else {
  console.warn('[WARN] targetPrzelacz not found');
}

if (isCrlfZak) zakContent = zakContent.replace(/\n/g, '\r\n');
fs.writeFileSync(zakPath, zakContent, 'utf8');

// 2. Patch public/js/app.js
const appPath = path.join(__dirname, '..', 'public', 'js', 'app.js');
let appContent = fs.readFileSync(appPath, 'utf8');
const isCrlfApp = appContent.includes('\r\n');
appContent = appContent.replace(/\r\n/g, '\n');

// 2a. Enhanced styling and tasks for Wszystkich Swietych cards in app.js
const targetAppLitCard = `            htmlL += '<div class="card" style="border:1px solid rgba(99,102,241,0.3); background:#18181b; margin-bottom:12px; padding:14px; box-shadow:0 4px 14px rgba(0,0,0,0.3);">' +
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
                           '<button type="button" class="btn-cancel" style="width:100%; padding:9px; font-size:13px; font-weight:700; background:rgba(239,68,68,0.15); color:#f87171; border:1px solid rgba(239,68,68,0.3);" onclick="przelaczZgloszenieLiturgia(\\\'' + l.id + '\\\')">Jesteś zgłoszony (Kliknij, aby zrezygnować)</button>' :
                           '<button type="button" class="btn-action" style="width:100%; padding:9px; font-size:13px; font-weight:700; background:#6366f1; color:#ffffff; border:none; box-shadow:0 2px 8px rgba(99,102,241,0.3);" onclick="przelaczZgloszenieLiturgia(\\\'' + l.id + '\\\')">Zgłaszam się (Będę • +' + (l.punkty || 3) + ' pkt)</button>') +
                       '</div>' +
                     '</div>';`;

const replacementAppLitCard = `            var isWszystkichSwietych = (l.id && l.id.indexOf('11_01') !== -1) || 
                                       (l.dzien === 1 && l.miesiacIdx === 10) || 
                                       (l.rodzaj && (l.rodzaj.toLowerCase().indexOf('cmentarz') !== -1 || l.rodzaj.toLowerCase().indexOf('popołudniowa') !== -1));
            var isCmentarz = l.rodzaj && l.rodzaj.toLowerCase().indexOf('cmentarz') !== -1;
            var isMszaPop = l.rodzaj && l.rodzaj.toLowerCase().indexOf('popołudniowa') !== -1;

            var cardBorder = isWszystkichSwietych 
              ? 'border:1px solid rgba(245,158,11,0.45); background:linear-gradient(145deg, #18181b 0%, #221810 100%);' 
              : 'border:1px solid rgba(99,102,241,0.3); background:#18181b;';
            var badgeBg = isWszystkichSwietych 
              ? 'background:rgba(245,158,11,0.18); color:#fbbf24; border:1px solid rgba(245,158,11,0.35);' 
              : 'background:rgba(99,102,241,0.15); color:#a5b4fc; border:1px solid rgba(99,102,241,0.3);';
            var badgeText = isWszystkichSwietych 
              ? ('🕯️ WSZYSTKICH ŚWIĘTYCH • +' + (l.punkty || 4) + ' PKT') 
              : ('SŁUŻBA DODATKOWA • +' + (l.punkty || 3) + ' PKT');
            var litIkona = isCmentarz ? '🪦' : (isMszaPop ? '⛪' : '⚰️');

            var zadaniaHtml = '';
            if (isCmentarz) {
              zadaniaHtml = '<div style="font-size:12px; color:#fef08a; background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.22); border-radius:6px; padding:6px 9px; margin:7px 0 6px 0; line-height:1.4;">' +
                              '<b>✝️ Zadania na cmentarzu:</b> krzyż procesyjny, nagłośnienie/mikrofon, latarnie/znicze, kadzielnica i łódka.' +
                            '</div>';
            } else if (isMszaPop) {
              zadaniaHtml = '<div style="font-size:12px; color:#bfdbfe; background:rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.22); border-radius:6px; padding:6px 9px; margin:7px 0 6px 0; line-height:1.4;">' +
                              '<b>⛪ Msza w kościele:</b> bezpośrednio po procesji na cmentarzu. Wolny nabór dla wszystkich chętnych!' +
                            '</div>';
            }

            var limitTekst = l.maxOsob ? (' / ' + l.maxOsob + ' miejsc') : '';

            htmlL += '<div class="card" style="' + cardBorder + ' margin-bottom:12px; padding:14px; box-shadow:0 4px 14px rgba(0,0,0,0.3);">' +
                       '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">' +
                         '<div style="width:100%;">' +
                           '<span style="' + badgeBg + ' font-size:10px; font-weight:800; letter-spacing:0.5px; padding:3px 8px; border-radius:12px; display:inline-block; margin-bottom:4px; text-transform:uppercase;">' +
                             badgeText +
                           '</span>' +
                           '<h3 style="margin:2px 0 4px 0; font-size:16px; color:#fafafa;">' +
                             litIkona + ' ' + l.rodzaj + ' — ' + l.dataTekst + ' • Godz. ' + dispH +
                           '</h3>' +
                           zadaniaHtml +
                           '<div style="font-size:12px; color:#a1a1aa; margin-top:4px;">' +
                             'Zgłoszeni chętni (<b>' + zgloszeni.length + limitTekst + '</b>): <span style="color:#fafafa; font-weight:500;">' + zgloszeniTekst + '</span>' +
                           '</div>' +
                         '</div>' +
                       '</div>' +
                       '<div style="margin-top:10px; display:flex; gap:8px;">' +
                         (isSigned ?
                           '<button type="button" class="btn-cancel" style="width:100%; padding:9px; font-size:13px; font-weight:700; background:rgba(239,68,68,0.18); color:#fca5a5; border:1px solid rgba(239,68,68,0.35); cursor:pointer;" onclick="przelaczZgloszenieLiturgia(\\\'' + l.id + '\\\')">✓ Jesteś zapisany (Kliknij, aby zrezygnować)</button>' :
                           '<button type="button" class="btn-action" style="width:100%; padding:9px; font-size:13px; font-weight:700; background:' + (isWszystkichSwietych ? '#d97706' : '#6366f1') + '; color:#ffffff; border:none; box-shadow:0 2px 8px rgba(217,119,6,0.35); cursor:pointer;" onclick="przelaczZgloszenieLiturgia(\\\'' + l.id + '\\\')">Zapisz się na służbę (+' + (l.punkty || 4) + ' pkt)</button>') +
                       '</div>' +
                     '</div>';`;

if (appContent.includes(targetAppLitCard)) {
  appContent = appContent.replace(targetAppLitCard, replacementAppLitCard);
  console.log('[OK] Patched targetAppLitCard in app.js');
} else {
  console.warn('[WARN] targetAppLitCard not found');
}

// 2b. Add bonus tip after active liturgies in app.js
const targetAppBoxDisplay = `          boxL.innerHTML = htmlL;
          boxL.style.display = 'block';`;

const replacementAppBoxDisplay = `          if (aktywneLiturgie.some(function(l) { return (l.id && l.id.indexOf('11_01') !== -1) || (l.dzien === 1 && l.miesiacIdx === 10); })) {
            htmlL += '<div style="font-size:12px; color:#fde68a; background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.22); border-radius:8px; padding:8px 12px; margin-bottom:12px; text-align:center; line-height:1.4;">' +
                       '🔥 <b>Podwójna służba we Wszystkich Świętych:</b> Możesz zapisać się na cmentarz (15:00) i na mszę popołudniową (16:00) — zgarniasz wtedy łącznie aż <b>+8 punktów</b>!' +
                     '</div>';
          }
          boxL.innerHTML = htmlL;
          boxL.style.display = 'block';`;

if (appContent.includes(targetAppBoxDisplay)) {
  appContent = appContent.replace(targetAppBoxDisplay, replacementAppBoxDisplay);
  console.log('[OK] Patched targetAppBoxDisplay in app.js');
} else {
  console.warn('[WARN] targetAppBoxDisplay not found');
}

// 2c. Support Sunday/special duties in pulpit open shifts filter
const targetWFilter = `          if (z.typ && z.typ !== 'Tydzień') return false;`;
const replaceWFilter = `          if (z.typ && z.typ !== 'Tydzień' && z.typ !== 'Niedziela' && z.typ !== 'Dodatkowa') return false;`;
if (appContent.includes(targetWFilter)) {
  appContent = appContent.replace(targetWFilter, replaceWFilter);
  console.log('[OK] Patched targetWFilter in app.js');
}

const targetWNextFilter = `            return (!z.typ || z.typ === 'Tydzień') && (z.status === 'OCZEKUJE' || !z.status);`;
const replaceWNextFilter = `            return (!z.typ || z.typ === 'Tydzień' || z.typ === 'Niedziela' || z.typ === 'Dodatkowa') && (z.status === 'OCZEKUJE' || !z.status);`;
if (appContent.includes(targetWNextFilter)) {
  appContent = appContent.replace(targetWNextFilter, replaceWNextFilter);
  console.log('[OK] Patched targetWNextFilter in app.js');
}

if (isCrlfApp) appContent = appContent.replace(/\n/g, '\r\n');
fs.writeFileSync(appPath, appContent, 'utf8');

// 3. Bump version in index.html and zakrystia/index.html to v=1.8.4
const bumpVersion = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/\?v=1\.[0-9]+\.[0-9]+/g, '?v=1.8.4');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[OK] Bumped scripts version in ' + filePath);
};

bumpVersion(path.join(__dirname, '..', 'public', 'index.html'));
bumpVersion(path.join(__dirname, '..', 'public', 'zakrystia', 'index.html'));

console.log('All patches applied successfully!');
