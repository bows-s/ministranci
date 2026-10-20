const https = require('https');
const API_KEY = "AIzaSyAsgkKWXr-L3fDHQODxioVssvIGL9SQePk";
const PROJECT_ID = "makole-85f32";

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
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === "object") {
    const fields = {};
    for (const k in val) {
      if (Object.prototype.hasOwnProperty.call(val, k)) {
        fields[k] = toFirestoreValue(val[k]);
      }
    }
    return { mapValue: { fields: fields } };
  }
  return { stringValue: String(val) };
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function saveDoc(docName, dataObj) {
  return new Promise((resolve, reject) => {
    const fields = {};
    for (const k in dataObj) {
      fields[k] = toFirestoreValue(dataObj[k]);
    }
    const body = JSON.stringify({ fields: fields });
    const options = {
      hostname: 'firestore.googleapis.com',
      path: '/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/stan_grafiku/' + encodeURIComponent(docName) + '?key=' + API_KEY,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) reject(new Error(JSON.stringify(json.error)));
          else resolve(json);
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function getDocData(docName) {
  const url = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/stan_grafiku/' + encodeURIComponent(docName) + '?key=' + API_KEY;
  const json = await fetchJson(url);
  if (!json || !json.fields) return null;
  const data = {};
  for (const k in json.fields) {
    data[k] = fromFirestoreValue(json.fields[k]);
  }
  return data;
}

async function main() {
  const pairs = [
    { src: 'Styczen_2026', dst: 'Styczeń_2026' },
    { src: 'Kwiecien_2026', dst: 'Kwiecień_2026' },
    { src: 'Sierpień_2026', dst: 'Sierpien_2026' },
    { src: 'Wrzesień_2026', dst: 'Wrzesien_2026' },
    { src: 'Październik_2026', dst: 'Pazdziernik_2026' },
    { src: 'Grudzień_2026', dst: 'Grudzien_2026' }
  ];

  for (const p of pairs) {
    console.log(`Checking pair: ${p.src} -> ${p.dst}`);
    const srcData = await getDocData(p.src);
    if (srcData) {
      console.log(`  Source ${p.src} found (${(srcData.wiersze || []).length} wierszy). Copying to ${p.dst}...`);
      await saveDoc(p.dst, srcData);
      console.log(`  Successfully saved ${p.dst}!`);
    } else {
      console.log(`  Source ${p.src} not found.`);
    }

    // Also check reverse if needed
    const dstData = await getDocData(p.dst);
    if (dstData && !srcData) {
      console.log(`  Dst ${p.dst} found. Copying back to ${p.src}...`);
      await saveDoc(p.src, dstData);
      console.log(`  Successfully saved ${p.src}!`);
    }
  }

  console.log('Done syncing aliases!');
}

main().catch(console.error);
