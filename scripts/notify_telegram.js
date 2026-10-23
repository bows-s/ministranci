const https = require('https');

async function sendTelegramMessage(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.log('[Telegram] Brak skonfigurowanych TELEGRAM_BOT_TOKEN lub TELEGRAM_CHAT_ID w Secrets. Pomijam wysyłkę Telegram.');
    return;
  }
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    });
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.ok) console.log('[Telegram] Wiadomość wysłana pomyślnie!');
          else console.warn('[Telegram] Błąd wysyłki Telegram:', parsed.description);
        } catch(e) {
          console.warn('[Telegram] Błąd parsowania odpowiedzi:', data);
        }
        resolve();
      });
    });
    req.on('error', (err) => {
      console.warn('[Telegram] Błąd sieciowy:', err.message);
      resolve();
    });
    req.write(postData);
    req.end();
  });
}

module.exports = { sendTelegramMessage };
