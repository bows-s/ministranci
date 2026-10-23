const https = require('https');
const { sendTelegramMessage } = require('./notify_telegram');

const GAS_URL = 'https://script.google.com/macros/s/AKfycbw4inpFTSAMv22GQpz_AYOytBx04CcEuCgwhHCAU0qwVFZ5H2BdjyA1PrnhxtP6KtCazg/exec';

function callGas(funkcja, args) {
  return new Promise((resolve, reject) => {
    const url = GAS_URL + '?payload=' + encodeURIComponent(JSON.stringify({ funkcja, args: args || [] }));
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, (res2) => {
          let data = '';
          res2.on('data', chunk => data += chunk);
          res2.on('end', () => {
            try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
          });
        });
      } else {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
        });
      }
    }).on('error', reject);
  });
}

async function main() {
  console.log('[Przypomnienia] Uruchamianie porannych przypomnień o służbie...');
  try {
    const res = await callGas('testujPorannePrzypomnienia', []);
    console.log('[Przypomnienia] Odpowiedź:', JSON.stringify(res, null, 2));

    if (res && res.sukces) {
      const odbiorcy = (res.odbiorcy && res.odbiorcy.length > 0) ? res.odbiorcy.join(', ') : 'Nikt (brak służb w grafiku lub brak tokenów)';
      const msg = `🔔 <b>Poranne przypomnienia PUSH wysłane!</b>\n\n` +
        `📅 <b>Wysłano do:</b> ${odbiorcy}\n` +
        `📊 <b>Liczba urządzeń:</b> ${res.liczbaWyslanych || 0}`;
      console.log('[Przypomnienia] Sukces:', msg);
      await sendTelegramMessage(msg);
    } else {
      const err = res ? res.wiadomosc : 'Nieznany błąd';
      console.warn('[Przypomnienia] Problem z wysyłką:', err);
      await sendTelegramMessage(`⚠️ <b>Ostrzeżenie powiadomień:</b> ${err}`);
    }
  } catch (e) {
    console.error('[Przypomnienia] Błąd krytyczny:', e);
    await sendTelegramMessage(`❌ <b>Błąd wysyłki porannych powiadomień:</b> ${e.message}`);
    process.exit(1);
  }
}

main();
