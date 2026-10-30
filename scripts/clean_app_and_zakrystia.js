const fs = require('fs');
const path = require('path');

// 1. Patch app.js
const appPath = path.join(__dirname, '..', 'public', 'js', 'app.js');
let appContent = fs.readFileSync(appPath, 'utf8');
const isCrlfApp = appContent.includes('\r\n');
appContent = appContent.replace(/\r\n/g, '\n');

const targetAppBlock = `        if (aktywneLiturgie.length > 0) {
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

            var isWszystkichSwietych = (l.id && l.id.indexOf('11_01') !== -1) || 
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
                     '</div>';
          });
          if (aktywneLiturgie.some(function(l) { return (l.id && l.id.indexOf('11_01') !== -1) || (l.dzien === 1 && l.miesiacIdx === 10); })) {
            htmlL += '<div style="font-size:12px; color:#fde68a; background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.22); border-radius:8px; padding:8px 12px; margin-bottom:12px; text-align:center; line-height:1.4;">' +
                       '🔥 <b>Podwójna służba we Wszystkich Świętych:</b> Możesz zapisać się na cmentarz (15:00) i na mszę popołudniową (16:00) — zgarniasz wtedy łącznie aż <b>+8 punktów</b>!' +
                     '</div>';
          }
          boxL.innerHTML = htmlL;
          boxL.style.display = 'block';
        } else {
          boxL.innerHTML = '';
          boxL.style.display = 'none';
        }`;

const replacementAppBlock = `        if (aktywneLiturgie.length > 0) {
          var myName = (globalUser && globalUser.nazwisko) ? globalUser.nazwisko.trim().toLowerCase() : '';
          var htmlL = '';
          aktywneLiturgie.forEach(function(l) {
            var zgloszeni = l.zgloszeni || [];
            var isSigned = zgloszeni.some(function(z) {
              var zn = z.toLowerCase().trim();
              return zn === myName || zn.indexOf(myName) !== -1 || myName.indexOf(zn) !== -1;
            });

            var zgloszeniTekst = zgloszeni.length > 0 ? zgloszeni.join(', ') : 'Brak (bądź pierwszy!)';
            var dispH = cleanTime(l.godzina) || l.godzina;
            if (!dispH || dispH.indexOf('24') !== -1 || dispH === '19:24' || dispH === '20:24') {
              dispH = (Number(l.dzien) === 14) ? '10:00' : '11:00';
            }
            var punktyLit = l.punkty || 4;

            htmlL += '<div class="card" style="border:1px solid rgba(99,102,241,0.3); background:#18181b; margin-bottom:12px; padding:14px; box-shadow:0 4px 14px rgba(0,0,0,0.3);">' +
                       '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">' +
                         '<div style="width:100%;">' +
                           '<span style="background:rgba(99,102,241,0.15); color:#a5b4fc; border:1px solid rgba(99,102,241,0.3); font-size:10px; font-weight:800; letter-spacing:0.5px; padding:3px 8px; border-radius:12px; display:inline-block; margin-bottom:4px; text-transform:uppercase;">' +
                             'SŁUŻBA DODATKOWA • +' + punktyLit + ' PKT' +
                           '</span>' +
                           '<h3 style="margin:2px 0 4px 0; font-size:16px; color:#fafafa;">' +
                             l.rodzaj + ' — ' + l.dataTekst + ' • Godz. ' + dispH +
                           '</h3>' +
                           '<div style="font-size:12px; color:#a1a1aa; margin-top:4px;">' +
                             'Zgłoszeni chętni (<b>' + zgloszeni.length + '</b>): <span style="color:#fafafa; font-weight:500;">' + zgloszeniTekst + '</span>' +
                           '</div>' +
                         '</div>' +
                       '</div>' +
                       '<div style="margin-top:10px; display:flex; gap:8px;">' +
                         (isSigned ?
                           '<button type="button" class="btn-cancel" style="width:100%; padding:9px; font-size:13px; font-weight:700; background:rgba(239,68,68,0.18); color:#fca5a5; border:1px solid rgba(239,68,68,0.35); cursor:pointer;" onclick="przelaczZgloszenieLiturgia(\\\'' + l.id + '\\\')">Jesteś zgłoszony (Kliknij, aby zrezygnować)</button>' :
                           '<button type="button" class="btn-action" style="width:100%; padding:9px; font-size:13px; font-weight:700; background:#6366f1; color:#ffffff; border:none; box-shadow:0 2px 8px rgba(99,102,241,0.3); cursor:pointer;" onclick="przelaczZgloszenieLiturgia(\\\'' + l.id + '\\\')">Zgłaszam się (Będę • +' + punktyLit + ' pkt)</button>') +
                       '</div>' +
                     '</div>';
          });
          boxL.innerHTML = htmlL;
          boxL.style.display = 'block';
        } else {
          boxL.innerHTML = '';
          boxL.style.display = 'none';
        }`;

if (appContent.includes(targetAppBlock)) {
  appContent = appContent.replace(targetAppBlock, replacementAppBlock);
  console.log('[OK] Cleaned app.js liturgie cards');
} else {
  console.warn('[WARN] targetAppBlock not found in app.js');
}

if (isCrlfApp) appContent = appContent.replace(/\n/g, '\r\n');
fs.writeFileSync(appPath, appContent, 'utf8');

// 2. Patch zakrystia.js
const zakPath = path.join(__dirname, '..', 'public', 'js', 'zakrystia.js');
let zakContent = fs.readFileSync(zakPath, 'utf8');
const isCrlfZak = zakContent.includes('\r\n');
zakContent = zakContent.replace(/\r\n/g, '\n');

// Clean fallback names in zakrystia.js
const targetNovFallback = `        if (d === 1 && m === 10) {
          // Uroczystość Wszystkich Świętych (1 listopada)
          optHtml += '<option value="08:30" data-rodzaj="msza_swieto" data-punkty="5" data-nazwa="Uroczystość Wszystkich Świętych">08:30 (Uroczystość Wszystkich Świętych - 5 pkt)</option>';
          optHtml += '<option value="10:00" data-rodzaj="msza_swieto" data-punkty="5" data-nazwa="Uroczystość Wszystkich Świętych">10:00 (Uroczystość Wszystkich Świętych - 5 pkt)</option>';
          optHtml += '<option value="11:30" data-rodzaj="msza_swieto" data-punkty="5" data-nazwa="Uroczystość Wszystkich Świętych">11:30 (Uroczystość Wszystkich Świętych - 5 pkt)</option>';
          optHtml += '<option value="15:00" data-rodzaj="nabozenstwo" data-punkty="4" data-nazwa="Nabożeństwo na cmentarzu i procesja">15:00 (Nabożeństwo na cmentarzu i procesja - 4 pkt)</option>';
          optHtml += '<option value="16:00" data-rodzaj="msza_swieto" data-punkty="4" data-nazwa="Msza św. popołudniowa (Wszystkich Świętych)">16:00 (Msza św. popołudniowa - 4 pkt)</option>';
        }`;

const replacementNovFallback = `        if (d === 1 && m === 10) {
          // Uroczystość Wszystkich Świętych (1 listopada)
          optHtml += '<option value="08:30" data-rodzaj="msza_swieto" data-punkty="5" data-nazwa="Uroczystość Wszystkich Świętych">08:30 (Uroczystość Wszystkich Świętych - 5 pkt)</option>';
          optHtml += '<option value="10:00" data-rodzaj="msza_swieto" data-punkty="5" data-nazwa="Uroczystość Wszystkich Świętych">10:00 (Uroczystość Wszystkich Świętych - 5 pkt)</option>';
          optHtml += '<option value="11:30" data-rodzaj="msza_swieto" data-punkty="5" data-nazwa="Uroczystość Wszystkich Świętych">11:30 (Uroczystość Wszystkich Świętych - 5 pkt)</option>';
          optHtml += '<option value="15:00" data-rodzaj="nabozenstwo" data-punkty="4" data-nazwa="Nabożeństwo na cmentarzu">15:00 (Nabożeństwo na cmentarzu - 4 pkt)</option>';
          optHtml += '<option value="16:00" data-rodzaj="msza_swieto" data-punkty="4" data-nazwa="Msza św.">16:00 (Msza św. - 4 pkt)</option>';
        }`;

if (zakContent.includes(targetNovFallback)) {
  zakContent = zakContent.replace(targetNovFallback, replacementNovFallback);
  console.log('[OK] Cleaned fallback names in zakrystia.js');
}

// Clean Telegram message in zakrystia.js
const targetTelMsg = `      // 2. Powiadomienie Telegram do bota
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
      }`;

const replacementTelMsg = `      // 2. Powiadomienie Telegram do bota
      if (typeof wyslijPowiadomienieTelegram === 'function') {
        var ikonaTel = isZgloszenie ? '📌' : '↩️';
        var naglowekTel = isZgloszenie ? 'Nowe zgłoszenie na służbę' : 'Wycofanie zgłoszenia ze służby';
        var tMsg = ikonaTel + ' <b>' + naglowekTel + '</b>\\n' +
                   '👤 Ministrant: <b>' + myName + '</b>\\n' +
                   '📅 Służba: ' + lit.rodzaj + ' (' + (lit.dataTekst || '') + ' • Godz. ' + (cleanTime(lit.godzina) || lit.godzina) + ')\\n' +
                   '⭐ Punkty: +' + (lit.punkty || 4) + ' pkt\\n' +
                   '👥 Zgłoszeni (' + lit.zgloszeni.length + '): ' + (lit.zgloszeni.join(', ') || 'Brak');
        wyslijPowiadomienieTelegram(tMsg);
      }`;

if (zakContent.includes(targetTelMsg)) {
  zakContent = zakContent.replace(targetTelMsg, replacementTelMsg);
  console.log('[OK] Cleaned Telegram message in zakrystia.js');
}

if (isCrlfZak) zakContent = zakContent.replace(/\n/g, '\r\n');
fs.writeFileSync(zakPath, zakContent, 'utf8');

// 3. Bump version in index.html and zakrystia/index.html to v=1.8.5
const bumpVersion = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/\?v=1\.[0-9]+\.[0-9]+/g, '?v=1.8.5');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[OK] Bumped scripts version to 1.8.5 in ' + filePath);
};

bumpVersion(path.join(__dirname, '..', 'public', 'index.html'));
bumpVersion(path.join(__dirname, '..', 'public', 'zakrystia', 'index.html'));

console.log('Cleanup script executed successfully!');
