const https = require('https');
const { sendTelegramMessage } = require('./notify_telegram');

const API_KEY = "AIzaSyAsgkKWXr-L3fDHQODxioVssvIGL9SQePk";
const PROJECT_ID = "makole-85f32";

const POLSKIE_MIESIACE = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
];

function fromFirestoreValue(val) {
  if (!val) return null;
  if ('nullValue' in val) return null;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return parseFloat(val.doubleValue);
  if ('stringValue' in val) return val.stringValue;
  if ('arrayValue' in val) return (val.arrayValue.values || []).map(fromFirestoreValue);
  if ('mapValue' in val) {
    const res = {};
    const fields = val.mapValue.fields || {};
    for (const k in fields) res[k] = fromFirestoreValue(fields[k]);
    return res;
  }
  return null;
}

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") {
    if (Number.isInteger(val)) return { integerValue: val.toString() };
    return { doubleValue: val };
  }
  if (typeof val === "string") return { stringValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === "object") {
    const fields = {};
    for (const k in val) {
      if (Object.prototype.hasOwnProperty.call(val, k)) {
        fields[k] = toFirestoreValue(val[k]);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function getDoc(col, id) {
  return new Promise((resolve) => {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${encodeURIComponent(col)}/${encodeURIComponent(id)}?key=${API_KEY}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.fields) {
            const out = {};
            for (const k in json.fields) out[k] = fromFirestoreValue(json.fields[k]);
            resolve(out);
          } else {
            resolve(null);
          }
        } catch(e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

function patchDoc(col, id, payload, fieldPaths) {
  return new Promise((resolve, reject) => {
    const mask = fieldPaths.map(f => 'updateMask.fieldPaths=' + encodeURIComponent(f)).join('&');
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${encodeURIComponent(col)}/${encodeURIComponent(id)}?${mask}&key=${API_KEY}`;
    const parsed = new URL(url);
    const bodyFields = {};
    for (const k of fieldPaths) {
      if (payload[k] !== undefined) bodyFields[k] = toFirestoreValue(payload[k]);
    }
    const bodyStr = JSON.stringify({ fields: bodyFields });

    const req = https.request({
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname + parsed.search,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function audyt() {
  const now = new Date();
  const docKey = `${POLSKIE_MIESIACE[now.getMonth()]}_${now.getFullYear()}`;
  console.log(`[Nocny Audyt] Rozpoczynanie audytu dla: ${docKey}...`);

  const data = await getDoc('stan_grafiku', docKey);
  if (!data) {
    console.warn(`[Nocny Audyt] Brak dokumentu stan_grafiku/${docKey}`);
    return;
  }

  const dzisiaj = now.getDate();
  const terazGodzina = now.getHours();
  const terazMinuta = now.getMinutes();

  let zmieniono = false;
  let wygaszoneWolne = 0;
  let wygaszoneGielda = 0;

  // 1. Sprawdź wolne zastępstwa
  const wolne = data.wolneZastepstwa || [];
  wolne.forEach(z => {
    if (z.status === 'OCZEKUJE' || z.status === 'AKTYWNA') {
      const zDzien = parseInt(z.dzien, 10);
      let czyMinelo = false;
      if (zDzien < dzisiaj) {
        czyMinelo = true;
      } else if (zDzien === dzisiaj) {
        const godzStr = (z.godzina || '18:00').trim();
        const parts = godzStr.split(':').map(Number);
        const g = parts[0] || 0;
        const m = parts[1] || 0;
        if (terazGodzina > g || (terazGodzina === g && terazMinuta >= m)) {
          czyMinelo = true;
        }
      }

      if (czyMinelo) {
        z.status = 'WYGASLA_NIEPRZEJETA';
        z.wygaslaDnia = now.toISOString();
        zmieniono = true;
        wygaszoneWolne++;
      }
    }
  });

  // 2. Sprawdź oferty giełdy tygodniowej
  const gt = data.gieldaTydzien || [];
  gt.forEach(o => {
    if (o.status === 'AKTYWNA') {
      const oDzien = parseInt(o.dzienOddawany !== undefined ? o.dzienOddawany : o.dzien, 10);
      if (oDzien <= dzisiaj) {
        o.status = 'WYGASLA_USPRAWIEDLIWIONA';
        zmieniono = true;
        wygaszoneGielda++;
      }
    }
  });

  if (zmieniono) {
    console.log(`[Nocny Audyt] Zaktualizowano oferty: ${wygaszoneWolne} wolnych zastępstw, ${wygaszoneGielda} ofert giełdy.`);
    await patchDoc('stan_grafiku', docKey, {
      wolneZastepstwa: wolne,
      gieldaTydzien: gt,
      ostatniAudytGieldy: now.toISOString()
    }, ['wolneZastepstwa', 'gieldaTydzien', 'ostatniAudytGieldy']);

    // Alias
    const asciiKey = docKey.replace(/ź/g, 'z').replace(/ł/g, 'l').replace(/ą/g, 'a').replace(/ę/g, 'e').replace(/ś/g, 's').replace(/ć/g, 'c').replace(/ż/g, 'z').replace(/ń/g, 'n').replace(/ó/g, 'o');
    if (asciiKey !== docKey) {
      await patchDoc('stan_grafiku', asciiKey, {
        wolneZastepstwa: wolne,
        gieldaTydzien: gt,
        ostatniAudytGieldy: now.toISOString()
      }, ['wolneZastepstwa', 'gieldaTydzien', 'ostatniAudytGieldy']).catch(() => {});
    }

    const msg = `🧹 <b>Nocny audyt giełdy zakończony</b>\n\n` +
      `📅 Miesiąc: <b>${docKey}</b>\n` +
      `🔒 Wygaszone nieprzejęte zastępstwa: ${wygaszoneWolne}\n` +
      `📋 Wygaszone oferty giełdy: ${wygaszoneGielda}`;
    await sendTelegramMessage(msg);
  } else {
    console.log('[Nocny Audyt] Brak przeterminowanych ofert – baza czysta.');
  }
}

if (require.main === module) {
  audyt().catch(err => {
    console.error('[Nocny Audyt] Błąd:', err);
    process.exit(1);
  });
}

module.exports = { audyt };
