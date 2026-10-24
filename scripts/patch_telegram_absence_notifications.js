const fs = require('fs');

function patchFile(filePath, transforms) {
  let content = fs.readFileSync(filePath, 'utf8');
  transforms.forEach(({ name, search, replace }) => {
    const normContent = content.replace(/\r\n/g, '\n');
    const normSearch = search.replace(/\r\n/g, '\n');
    const normReplace = replace.replace(/\r\n/g, '\n');

    if (normContent.includes(normSearch)) {
      const isCRLF = content.includes('\r\n');
      const patchedNorm = normContent.replace(normSearch, normReplace);
      content = isCRLF ? patchedNorm.replace(/\n/g, '\r\n') : patchedNorm;
      console.log(`[PASS] ${filePath}: ${name}`);
    } else {
      console.warn(`[WARN] ${filePath}: pattern for '${name}' not found!`);
    }
  });
  fs.writeFileSync(filePath, content, 'utf8');
}

// 1. Patch public/js/utils.js - Add wyslijPowiadomienieTelegram
patchFile('public/js/utils.js', [
  {
    name: 'Add Telegram bot notification sender in utils.js',
    search: `    function czyToTenSamKluczMiesiaca(k1, k2) {
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
    window.czyToTenSamKluczMiesiaca = czyToTenSamKluczMiesiaca;`,
    replace: `    function czyToTenSamKluczMiesiaca(k1, k2) {
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

    // =============================================================
    // WYSYŁKA POWIADOMIEŃ TELEGRAM (ALERT BOT)
    // =============================================================
    var TELEGRAM_BOT_TOKEN = '8928454251:AAERM9vwRwolBiXGhO4RoGgbuytobqE9X9g';
    var TELEGRAM_CHAT_ID = '1953233927';

    function wyslijPowiadomienieTelegram(tekst) {
      try {
        if (!tekst) return Promise.resolve();
        return fetch('https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: tekst,
            parse_mode: 'HTML'
          })
        }).then(function(res) {
          return res.json();
        }).then(function(data) {
          if (data && data.ok) {
            console.log('[Telegram] Powiadomienie wysłane pomyślnie!');
          } else {
            console.warn('[Telegram] Błąd wysyłki powiadomienia:', data && data.description);
          }
          return data;
        }).catch(function(err) {
          console.warn('[Telegram] Błąd sieciowy podczas wysyłania powiadomienia:', err);
        });
      } catch(e) {
        console.warn('[Telegram] Wyjątek podczas wysyłania powiadomienia:', e);
        return Promise.resolve();
      }
    }
    window.wyslijPowiadomienieTelegram = wyslijPowiadomienieTelegram;
    window.TELEGRAM_BOT_TOKEN = TELEGRAM_BOT_TOKEN;
    window.TELEGRAM_CHAT_ID = TELEGRAM_CHAT_ID;`
  }
]);

// 2. Patch public/js/gielda.js - Add absence alerts & cancellations
patchFile('public/js/gielda.js', [
  {
    name: 'Add absence notification to wykonajOddajDyzur',
    search: `        btn.disabled = false;
        btn.innerText = isWeekend ? 'Zgłoś nieobecność (0 pkt)' : 'Tak, oddaj na giełdę (+4 pkt)';
        zamknijModalOddajDyzur();
        pokazToast(isWeekend ? 'Zgłoszono nieobecność (0 pkt)' : 'Dyżur oddany na giełdę wolnych');
        odswiezDane();
      } catch(err) {`,
    replace: `        btn.disabled = false;
        btn.innerText = isWeekend ? 'Zgłoś nieobecność (0 pkt)' : 'Tak, oddaj na giełdę (+4 pkt)';
        zamknijModalOddajDyzur();
        pokazToast(isWeekend ? 'Zgłoszono nieobecność (0 pkt)' : 'Dyżur oddany na giełdę wolnych');
        odswiezDane();

        // Powiadomienie na Telegram o zgłoszonej nieobecności:
        try {
          var realAlertD = dOdd;
          if (isWeekend && cleanTime(godz) === '17:00') {
            var dowAlert = new Date(targetRok, targetMiesiacIdx, dOdd).getDay();
            realAlertD = (dowAlert === 0) ? (dOdd - 1) : dOdd;
          }
          var alertStan = (globalUser && globalUser.stan) ? globalUser.stan : {};
          var dataTekst = (typeof formatujDateDnia === 'function')
            ? formatujDateDnia(realAlertD, alertStan, targetRok, targetMiesiacIdx)
            : (realAlertD + '.' + (targetMiesiacIdx + 1) + '.' + targetRok);
          var typTekst = isWeekend ? 'Msza niedzielna' : 'Służba w tygodniu';
          var lines = [
            '⚠️ <b>Zgłoszono nieobecność w grafiku!</b>',
            '',
            '👤 Ministrant: <b>' + myName + '</b>',
            '📅 Data: <b>' + dataTekst + '</b>' + (godz ? (' • godz. <b>' + cleanTime(godz) + '</b>') : ''),
            '⛪ Typ: <b>' + typTekst + '</b>',
            '🛡️ Status: <b>Usprawiedliwiony (0 pkt)</b>'
          ];
          if (isWeekend) {
            lines.push('ℹ️ Dyżur weekendowy – ochrona przed -5 pkt.');
          } else {
            lines.push('🎟️ Dyżur trafił na giełdę wolnych (+4 pkt dla zastępcy).');
          }
          if (typeof wyslijPowiadomienieTelegram === 'function') {
            wyslijPowiadomienieTelegram(lines.join('\\n'));
          }
        } catch(errTel) {
          console.warn('[Telegram] Błąd wysyłki powiadomienia o nieobecności:', errTel);
        }
      } catch(err) {`
  },
  {
    name: 'Add absence cancellation notification to anulujUsprawiedliwienieNiedziela',
    search: `      try {
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
      } catch(err) {`,
    replace: `      try {
        var alertRok = (new Date()).getFullYear();
        var alertMiesiacIdx = (new Date()).getMonth();
        await dbFirestore.runTransaction(async function(transaction) {
          var sfDoc = await transaction.get(docRef);
          if (!sfDoc.exists) return;
          var data = sfDoc.data();
          if (data.rok) alertRok = data.rok;
          if (data.miesiacIdx !== undefined) alertMiesiacIdx = data.miesiacIdx;
          var wiersze = data.wiersze || [];
          var row = wiersze.find(function(w) { return czyToSamoNazwisko(w.nazwisko, myName); });
          if (row && row.komorki) {
            if (row.komorki[dNum - 1] && (row.komorki[dNum - 1].wartosc === 0 || row.komorki[dNum - 1].wartosc === '0')) {
              row.komorki[dNum - 1].wartosc = null;
              row.komorki[dNum - 1].czyUsprawiedliwiony = false;
            }
            if (dNum > 1 && row.komorki[dNum - 2] && (row.komorki[dNum - 2].wartosc === 0 || row.komorki[dNum - 2].wartosc === '0')) {
              row.komorki[dNum - 2].wartosc = null;
              row.komorki[dNum - 2].czyUsprawiedliwiony = false;
            }
          }
          transaction.update(docRef, {
            wiersze: wiersze,
            zaktualizowano: firebase.firestore.FieldValue.serverTimestamp()
          });
        });
        pokazToast('Wycofano zgłoszenie nieobecności.');
        odswiezDane();

        // Powiadomienie na Telegram o wycofaniu nieobecności:
        try {
          var dataTekst = (typeof formatujDateDnia === 'function')
            ? formatujDateDnia(dNum, null, alertRok, alertMiesiacIdx)
            : (dNum + '.' + (alertMiesiacIdx + 1) + '.' + alertRok);
          var lines = [
            '↩️ <b>Wycofano zgłoszenie nieobecności</b>',
            '',
            '👤 Ministrant: <b>' + myName + '</b>',
            '📅 Data: <b>' + dataTekst + '</b>',
            '⛪ Typ: <b>Msza niedzielna</b>',
            '✅ Status: <b>Powrót do normalnego dyżuru</b>'
          ];
          if (typeof wyslijPowiadomienieTelegram === 'function') {
            wyslijPowiadomienieTelegram(lines.join('\\n'));
          }
        } catch(errTel) {
          console.warn('[Telegram] Błąd wysyłki powiadomienia o wycofaniu nieobecności:', errTel);
        }
      } catch(err) {`
  },
  {
    name: 'Add cancellation notification to anulujMojeZastepstwo',
    search: `          if (anulowanyDzien) {
            var row = wiersze.find(function(w) { return czyToSamoNazwisko(w.nazwisko, myName); });
            if (row && row.komorki && row.komorki[anulowanyDzien - 1]) {
              if (row.komorki[anulowanyDzien - 1].wartosc === 0 || row.komorki[anulowanyDzien - 1].wartosc === '0') {
                row.komorki[anulowanyDzien - 1].wartosc = null;
              }
            }
          }`,
    replace: `          if (anulowanyDzien) {
            var row = wiersze.find(function(w) { return czyToSamoNazwisko(w.nazwisko, myName); });
            if (row && row.komorki && row.komorki[anulowanyDzien - 1]) {
              if (row.komorki[anulowanyDzien - 1].wartosc === 0 || row.komorki[anulowanyDzien - 1].wartosc === '0') {
                row.komorki[anulowanyDzien - 1].wartosc = null;
                row.komorki[anulowanyDzien - 1].czyUsprawiedliwiony = false;
              }
            }
          }`
  },
  {
    name: 'Add telegram alert after anulujMojeZastepstwo',
    search: `        pokazToast('Dyżur wycofany z giełdy');
        odswiezDane();
      } catch(err) {
        alert(err.message || 'Wystąpił błąd podczas wycofywania oferty.');
      }`,
    replace: `        pokazToast('Dyżur wycofany z giełdy');
        odswiezDane();

        try {
          if (anulowanyDzien) {
            var alertRok = (tabelaMiesiacaDane && tabelaMiesiacaDane.rok) || (new Date()).getFullYear();
            var alertMiesiacIdx = (tabelaMiesiacaDane && tabelaMiesiacaDane.miesiacIdx !== undefined) ? tabelaMiesiacaDane.miesiacIdx : (new Date()).getMonth();
            var dataTekst = (typeof formatujDateDnia === 'function')
              ? formatujDateDnia(anulowanyDzien, null, alertRok, alertMiesiacIdx)
              : (anulowanyDzien + '.' + (alertMiesiacIdx + 1) + '.' + alertRok);
            var lines = [
              '↩️ <b>Wycofano nieobecność / dyżur z giełdy</b>',
              '',
              '👤 Ministrant: <b>' + myName + '</b>',
              '📅 Data: <b>' + dataTekst + '</b>',
              '⛪ Typ: <b>Służba w tygodniu</b>',
              '✅ Status: <b>Powrót do normalnego dyżuru</b>'
            ];
            if (typeof wyslijPowiadomienieTelegram === 'function') {
              wyslijPowiadomienieTelegram(lines.join('\\n'));
            }
          }
        } catch(errTel) {
          console.warn('[Telegram] Błąd wysyłki powiadomienia o wycofaniu:', errTel);
        }
      } catch(err) {
        alert(err.message || 'Wystąpił błąd podczas wycofywania oferty.');
      }`
  },
  {
    name: 'Add takeover alert to wykonajWezDyzur',
    search: `          // Zaktualizuj zamianyZastepstwa
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
        odswiezDane();`,
    replace: `          // Zaktualizuj zamianyZastepstwa
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

        // Powiadomienie na Telegram o przejęciu wolnego dyżuru:
        try {
          var oddajacyZ = (typeof wybranaOfertaDoWziecia === 'object' && wybranaOfertaDoWziecia.oddajacy) ? wybranaOfertaDoWziecia.oddajacy : 'Inny ministrant';
          var dzienZ = (typeof wybranaOfertaDoWziecia === 'object' && wybranaOfertaDoWziecia.dzien) ? wybranaOfertaDoWziecia.dzien : null;
          var curStanW = (globalUser && globalUser.stan) ? globalUser.stan : {};
          var rokZ = (typeof wybranaOfertaDoWziecia === 'object' && wybranaOfertaDoWziecia.rok) || curStanW.rok || (new Date()).getFullYear();
          var mIdxZ = (typeof wybranaOfertaDoWziecia === 'object' && wybranaOfertaDoWziecia.miesiacIdx !== undefined) ? wybranaOfertaDoWziecia.miesiacIdx : (curStanW.miesiacIdx !== undefined ? curStanW.miesiacIdx : (new Date()).getMonth());
          var dataTekst = dzienZ ? formatujDateDnia(dzienZ, null, rokZ, mIdxZ) : '';
          var lines = [
            '🤝 <b>Przejęto wolny dyżur z giełdy!</b>',
            '',
            '👤 Zastępca: <b>' + myName + '</b>',
            '👤 Za ministranta: <b>' + oddajacyZ + '</b>',
            (dataTekst ? ('📅 Data: <b>' + dataTekst + '</b>\\n') : '') +
            '✅ Status: <b>Służba obsadzona</b>'
          ];
          if (typeof wyslijPowiadomienieTelegram === 'function') {
            wyslijPowiadomienieTelegram(lines.join('\\n'));
          }
        } catch(errTel) {
          console.warn('[Telegram] Błąd wysyłki powiadomienia o przejęciu dyżuru:', errTel);
        }`
  }
]);

// 3. Patch public/index.html - bump cache buster to 1.8.0
patchFile('public/index.html', [
  {
    name: 'Bump script versions in index.html to 1.8.0',
    search: `  <script src="/js/firebase-config.js?v=1.7.6"></script>
  <script src="/js/utils.js?v=1.7.6"></script>
  <script src="/js/auth.js?v=1.7.6"></script>
  <script src="/js/pwa.js?v=1.7.6"></script>
  <script src="/js/liturgia.js?v=1.7.8"></script>
  <script src="/js/gamification.js?v=1.7.6"></script>
  <script src="/js/ranking.js?v=1.7.6"></script>
  <script src="/js/gielda.js?v=1.7.9"></script>
  <script src="/js/zakrystia.js?v=1.7.9"></script>
  <script src="/js/tabela.js?v=1.7.6"></script>
  <script src="/js/app.js?v=1.7.6"></script>`,
    replace: `  <script src="/js/firebase-config.js?v=1.7.6"></script>
  <script src="/js/utils.js?v=1.8.0"></script>
  <script src="/js/auth.js?v=1.7.6"></script>
  <script src="/js/pwa.js?v=1.7.6"></script>
  <script src="/js/liturgia.js?v=1.7.8"></script>
  <script src="/js/gamification.js?v=1.7.6"></script>
  <script src="/js/ranking.js?v=1.7.6"></script>
  <script src="/js/gielda.js?v=1.8.0"></script>
  <script src="/js/zakrystia.js?v=1.8.0"></script>
  <script src="/js/tabela.js?v=1.7.6"></script>
  <script src="/js/app.js?v=1.8.0"></script>`
  }
]);

console.log('Patch complete.');
