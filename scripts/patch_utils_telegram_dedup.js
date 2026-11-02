const fs = require('fs');
const path = require('path');

const utilsPath = path.join(__dirname, '..', 'public', 'js', 'utils.js');
let content = fs.readFileSync(utilsPath, 'utf8');

const hasCrlf = content.includes('\r\n');
if (hasCrlf) content = content.replace(/\r\n/g, '\n');

const targetUtils = `    var TELEGRAM_BOT_TOKEN = '8928454251:AAERM9vwRwolBiXGhO4RoGgbuytobqE9X9g';
    var TELEGRAM_CHAT_ID = '1953233927';

    function wyslijPowiadomienieTelegram(tekst) {
      try {
        if (!tekst) return Promise.resolve();`;

const replacementUtils = `    var TELEGRAM_BOT_TOKEN = '8928454251:AAERM9vwRwolBiXGhO4RoGgbuytobqE9X9g';
    var TELEGRAM_CHAT_ID = '1953233927';
    var ostatniePowiadomieniaTelegram = {};

    function wyslijPowiadomienieTelegram(tekst) {
      try {
        if (!tekst) return Promise.resolve();
        var teraz = Date.now();
        if (ostatniePowiadomieniaTelegram[tekst] && (teraz - ostatniePowiadomieniaTelegram[tekst] < 60 * 1000)) {
          console.log('[Telegram] Pomijam powtórzone powiadomienie (antyspam 60s):', (tekst || '').substring(0, 30));
          return Promise.resolve();
        }
        ostatniePowiadomieniaTelegram[tekst] = teraz;`;

if (content.includes(targetUtils)) {
  content = content.replace(targetUtils, replacementUtils);
  console.log('[OK] Patched utils.js with Telegram dedup');
} else {
  console.warn('[WARN] targetUtils not found in utils.js');
}

if (hasCrlf) content = content.replace(/\n/g, '\r\n');

fs.writeFileSync(utilsPath, content, 'utf8');
