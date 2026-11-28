const https = require('https');

const API_KEY = 'AIzaSyAsgkKWXr-L3fDHQODxioVssvIGL9SQePk';
const PROJECT_ID = 'makole-85f32';

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: val.toString() };
    return { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === 'object') {
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

function getDoc(col, id) {
  return new Promise((resolve, reject) => {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${encodeURIComponent(col)}/${encodeURIComponent(id)}?key=${API_KEY}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`GET ${col}/${id} -> HTTP ${res.statusCode}: ${data}`));
        const json = JSON.parse(data);
        const out = {};
        for (const k in (json.fields || {})) out[k] = fromFirestoreValue(json.fields[k]);
        resolve(out);
      });
    }).on('error', reject);
  });
}

function patchDoc(col, id, payload, fieldPaths) {
  return new Promise((resolve, reject) => {
    const mask = fieldPaths.map(f => 'updateMask.fieldPaths=' + encodeURIComponent(f)).join('&');
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${encodeURIComponent(col)}/${encodeURIComponent(id)}?${mask}&key=${API_KEY}`;
    const parsed = new URL(url);
    const bodyFields = {};
    for (const k of fieldPaths) {
      if (Object.prototype.hasOwnProperty.call(payload, k)) {
        bodyFields[k] = toFirestoreValue(payload[k]);
      }
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
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`PATCH ${col}/${id} -> HTTP ${res.statusCode}: ${d}`));
        resolve(JSON.parse(d));
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function run() {
  const doc = await getDoc('stan_grafiku', 'Listopad_2026');
  const emil = (doc.wiersze || []).find(w => w && w.nazwisko && w.nazwisko.toLowerCase().includes('emil czech'));
  if (!emil) throw new Error('Brak wiersza Emil Czech w Listopad_2026!');

  console.log('Przed [27 listopada]:', JSON.stringify(emil.komorki[26]));
  emil.komorki[26] = {
    maDyzur: true,
    wartosc: 0,
    czyUsprawiedliwiony: true,
    liturgie: { '18:00': 0 }
  };

  await patchDoc('stan_grafiku', 'Listopad_2026', { wiersze: doc.wiersze }, ['wiersze']);
  const after = await getDoc('stan_grafiku', 'Listopad_2026');
  const emilAfter = (after.wiersze || []).find(w => w && w.nazwisko && w.nazwisko.toLowerCase().includes('emil czech'));
  console.log('Po [27 listopada]:', JSON.stringify(emilAfter.komorki[26]), '| suma:', emilAfter.suma);
}

run().catch(err => {
  console.error('BLAD:', err);
  process.exit(1);
});
