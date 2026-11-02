const fs = require('fs');
const path = require('path');

const zakrystiaPath = path.join(__dirname, '..', 'public', 'js', 'zakrystia.js');
let zakrystiaContent = fs.readFileSync(zakrystiaPath, 'utf8');

// Normalize CRLF to LF for reliable string matching
const hasCrlf = zakrystiaContent.includes('\r\n');
if (hasCrlf) {
  zakrystiaContent = zakrystiaContent.replace(/\r\n/g, '\n');
}

// 1. Add ostatnieAlertyTelegram and deduplication to wyslijAlertTelegramZakrystia
if (!zakrystiaContent.includes('var ostatnieAlertyTelegram = {};')) {
  zakrystiaContent = zakrystiaContent.replace(
    'function wyslijAlertTelegramZakrystia(stan) {',
    'var ostatnieAlertyTelegram = {};\n\n    function wyslijAlertTelegramZakrystia(stan) {'
  );
}

const targetMsgBlock = `        var messageText = lines.join('\\n').trim();

        fetch('https://api.telegram.org/bot' + botToken + '/sendMessage'`;

const replacementMsgBlock = `        var messageText = lines.join('\\n').trim();

        // Blokada dubli: pamięć podręczna (5 min) oraz localStorage na wypadek odświeżenia strony
        var gKeyClean = (typeof cleanTime === 'function') ? cleanTime(stan.godzina || '') : (stan.godzina || '').replace(':', '');
        var dedupKey = (stan.docKey || '') + '_' + (stan.dzien || '') + '_' + gKeyClean + '_' + messageText;
        var teraz = Date.now();

        if (ostatnieAlertyTelegram[dedupKey] && (teraz - ostatnieAlertyTelegram[dedupKey] < 5 * 60 * 1000)) {
          console.log('[Telegram] Pomijam powtórzony alert zakrystii (antyspam pamięciowy):', dedupKey);
          return;
        }

        try {
          var lsKey = 'min_alert_tel_' + (stan.dzien || '') + '_' + gKeyClean;
          var cachedLs = localStorage.getItem(lsKey);
          if (cachedLs) {
            var cData = JSON.parse(cachedLs);
            if (cData && (teraz - cData.ts < 5 * 60 * 1000) && cData.text === messageText) {
              console.log('[Telegram] Pomijam powtórzony alert zakrystii (localStorage):', lsKey);
              return;
            }
          }
          localStorage.setItem(lsKey, JSON.stringify({ ts: teraz, text: messageText }));
        } catch(eLs) {}

        ostatnieAlertyTelegram[dedupKey] = teraz;

        fetch('https://api.telegram.org/bot' + botToken + '/sendMessage'`;

if (zakrystiaContent.includes(targetMsgBlock)) {
  zakrystiaContent = zakrystiaContent.replace(targetMsgBlock, replacementMsgBlock);
  console.log('[OK] Patched wyslijAlertTelegramZakrystia with dedup');
} else {
  console.warn('[WARN] Could not find targetMsgBlock in zakrystia.js');
}

// 2. Patch przetworzKolejkeOfflineZakrystia to avoid duplicate Telegram sends
const targetQueueSend = `          if (item.stanDoTelegramu) {
            wyslijAlertTelegramZakrystia(item.stanDoTelegramu);
          }`;

const replacementQueueSend = `          if (item.stanDoTelegramu && !item.juzWyslanoTelegram) {
            wyslijAlertTelegramZakrystia(item.stanDoTelegramu);
            item.juzWyslanoTelegram = true;
          }`;

if (zakrystiaContent.includes(targetQueueSend)) {
  zakrystiaContent = zakrystiaContent.replace(targetQueueSend, replacementQueueSend);
  console.log('[OK] Patched przetworzKolejkeOfflineZakrystia with juzWyslanoTelegram check');
} else {
  console.warn('[WARN] Could not find targetQueueSend in zakrystia.js');
}

// 3. Patch zakrystiaZapiszObecnosc with zakrystiaZapisTrwa debounce and post-save disabled button
if (!zakrystiaContent.includes('var zakrystiaZapisTrwa = false;')) {
  zakrystiaContent = zakrystiaContent.replace(
    'async function zakrystiaZapiszObecnosc() {',
    'var zakrystiaZapisTrwa = false;\n\n    async function zakrystiaZapiszObecnosc() {'
  );
}

const targetZapisStart = `    async function zakrystiaZapiszObecnosc() {
      if (!czyMaDostepDoZakrystii(globalUser ? globalUser.nazwisko : "")) {`;

const replacementZapisStart = `    async function zakrystiaZapiszObecnosc() {
      if (zakrystiaZapisTrwa) {
        console.warn('[Zakrystia] Zapis już trwa. Ignoruję powtórne kliknięcie.');
        return;
      }
      if (!czyMaDostepDoZakrystii(globalUser ? globalUser.nazwisko : "")) {`;

if (zakrystiaContent.includes(targetZapisStart)) {
  zakrystiaContent = zakrystiaContent.replace(targetZapisStart, replacementZapisStart);
  console.log('[OK] Patched zakrystiaZapiszObecnosc entry debounce');
} else {
  console.warn('[WARN] Could not find targetZapisStart in zakrystia.js');
}

// Set zakrystiaZapisTrwa = true before operations
const targetSpinnerBlock = `      if (btn) {
        btn.disabled = true;
        btn.innerText = '⏳ ZAPISYWANIE... PROSZĘ CZEKAĆ';
        btn.style.opacity = '0.7';
        btn.style.cursor = 'wait';
      }
      if (spinner) spinner.style.display = 'inline';`;

const replacementSpinnerBlock = `      if (btn) {
        btn.disabled = true;
        btn.innerText = '⏳ ZAPISYWANIE... PROSZĘ CZEKAĆ';
        btn.style.opacity = '0.7';
        btn.style.cursor = 'wait';
      }
      if (spinner) spinner.style.display = 'inline';
      zakrystiaZapisTrwa = true;`;

if (zakrystiaContent.includes(targetSpinnerBlock)) {
  zakrystiaContent = zakrystiaContent.replace(targetSpinnerBlock, replacementSpinnerBlock);
  console.log('[OK] Patched zakrystiaZapisTrwa set');
} else {
  console.warn('[WARN] Could not find targetSpinnerBlock in zakrystia.js');
}

// In wpisDoKolejki add juzWyslanoTelegram: false
const targetWpis = `        obecnoscPayload: obecnoscPayload,
        stanDoTelegramu: JSON.parse(JSON.stringify(zakrystiaStan)),
        utworzono: Date.now()`;

const replacementWpis = `        obecnoscPayload: obecnoscPayload,
        stanDoTelegramu: JSON.parse(JSON.stringify(zakrystiaStan)),
        juzWyslanoTelegram: false,
        utworzono: Date.now()`;

if (zakrystiaContent.includes(targetWpis)) {
  zakrystiaContent = zakrystiaContent.replace(targetWpis, replacementWpis);
  console.log('[OK] Patched wpisDoKolejki with juzWyslanoTelegram');
} else {
  console.warn('[WARN] Could not find targetWpis in zakrystia.js');
}

// In online save mark wpisDoKolejki.juzWyslanoTelegram = true
const targetOnlineSend = `          // Pomyślny zapis na serwerze: usuwamy z kolejki offline i wysyłamy alert Telegram na żywo!
          usunZKolejkiOfflineZakrystia(logId);
          wyslijAlertTelegramZakrystia(zakrystiaStan);`;

const replacementOnlineSend = `          // Pomyślny zapis na serwerze: oznaczamy, usuwamy z kolejki offline i wysyłamy alert Telegram na żywo!
          wpisDoKolejki.juzWyslanoTelegram = true;
          usunZKolejkiOfflineZakrystia(logId);
          wyslijAlertTelegramZakrystia(zakrystiaStan);`;

if (zakrystiaContent.includes(targetOnlineSend)) {
  zakrystiaContent = zakrystiaContent.replace(targetOnlineSend, replacementOnlineSend);
  console.log('[OK] Patched online Telegram send');
} else {
  console.warn('[WARN] Could not find targetOnlineSend in zakrystia.js');
}

// In success blocks, keep btn disabled and reset zakrystiaZapisTrwa in finally or at end
const targetEndBlock = `      if (!firestoreSuccess) {
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
    }`;

const replacementEndBlock = `      if (!firestoreSuccess) {
        zakrystiaZapisTrwa = false;
        if (btn) {
          btn.disabled = true;
          btn.innerText = '✓ ZAPISANO OFFLINE (' + zakrystiaStan.ministranci.length + ' ministrantów)';
          btn.style.opacity = '0.85';
          btn.style.cursor = 'default';
        }
        pokazToast('📡 Zapisano lokalnie w pamięci telefonu. Wyśle się automatycznie po odzyskaniu internetu.');
        pokazModalSukcesuZakrystii(zakrystiaStan.nazwaLiturgii + ' (' + zakrystiaStan.godzina + ')', zakrystiaStan.ministranci.length, true);
        return;
      }

      zakrystiaZapisTrwa = false;
      if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.85';
        btn.style.cursor = 'default';
        btn.innerText = '✓ ZAPISANO (' + zakrystiaStan.ministranci.length + ' ministrantów)';
      }

      // Haptic feedback dla Kościelnego w telefonie
      try {
        if (window.navigator && window.navigator.vibrate) {
          window.navigator.vibrate([100, 50, 100]);
        }
      } catch(eVib) {}

      // Wielkie, nie do przeoczenia potwierdzenie sukcesu online
      pokazModalSukcesuZakrystii(zakrystiaStan.nazwaLiturgii + ' (' + zakrystiaStan.godzina + ')', zakrystiaStan.ministranci.length, false);
    }`;

if (zakrystiaContent.includes(targetEndBlock)) {
  zakrystiaContent = zakrystiaContent.replace(targetEndBlock, replacementEndBlock);
  console.log('[OK] Patched zakrystiaZapiszObecnosc end block');
} else {
  console.warn('[WARN] Could not find targetEndBlock in zakrystia.js');
}

if (hasCrlf) {
  zakrystiaContent = zakrystiaContent.replace(/\n/g, '\r\n');
}

fs.writeFileSync(zakrystiaPath, zakrystiaContent, 'utf8');
console.log('zakrystia.js successfully updated.');
