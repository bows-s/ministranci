const https = require('https');

const API_KEY = 'AIzaSyAsgkKWXr-L3fDHQODxioVssvIGL9SQePk';
const PROJECT_ID = 'makole-85f32';

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
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const k in val) {
      if (val[k] !== undefined) fields[k] = toFirestoreValue(val[k]);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fetchDoc(coll, id) {
  return new Promise((resolve, reject) => {
    https.get('https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/' + coll + '/' + encodeURIComponent(id) + '?key=' + API_KEY, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function patchDoc(coll, id, fields, updateMask) {
  return new Promise((resolve, reject) => {
    const maskParams = (updateMask || Object.keys(fields)).map(f => 'updateMask.fieldPaths=' + encodeURIComponent(f)).join('&');
    const url = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/' + coll + '/' + encodeURIComponent(id) + '?' + maskParams + '&key=' + API_KEY;
    const body = JSON.stringify({ fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, toFirestoreValue(v)])) });
    const req = https.request(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function run() {
  console.log('Fetching stan_grafiku/Listopad_2026...');
  const doc = await fetchDoc('stan_grafiku', 'Listopad_2026');
  const data = {};
  for (const k in doc.fields) data[k] = fromFirestoreValue(doc.fields[k]);

  let dniNaglowekModified = false;
  let harmonogramModified = false;

  // 1. Fix dniNaglowek: weekdays (Monday to Friday, except day 2 Zaduszki) get 5 pkt
  if (Array.isArray(data.dniNaglowek)) {
    data.dniNaglowek.forEach(dn => {
      const dNum = dn.dzien;
      const skrot = dn.skrotDnia;
      const isWeekend = (skrot === 'Nd' || skrot === 'Sb' || dn.czyNiedziela || dn.czySobota);
      if (!isWeekend && dNum !== 2) {
        if (dn.punktyZaObecnosc !== 5) {
          dn.punktyZaObecnosc = 5;
          dniNaglowekModified = true;
        }
      }
    });
  }

  // 2. Fix harmonogramDni: for Monday to Friday (except day 2 Zaduszki), all regular msze get 5 pkt
  if (data.harmonogramDni && typeof data.harmonogramDni === 'object') {
    for (const dKey in data.harmonogramDni) {
      const dNum = parseInt(dKey, 10);
      const hDay = data.harmonogramDni[dKey];
      // Day of week in Nov 2026: Nov 1 is Sunday (dow=0)
      const dow = (new Date(2026, 10, dNum)).getDay();
      const isWeekday = (dow >= 1 && dow <= 5);

      if (isWeekday && dNum !== 2 && Array.isArray(hDay.msze)) {
        hDay.msze.forEach(m => {
          if (m.typ !== 'nabozenstwo' && m.punkty !== 5) {
            console.log(`Setting day ${dNum} (${hDay.dzienTygodnia}) mass ${m.godzina} from ${m.punkty} to 5 pkt`);
            m.punkty = 5;
            harmonogramModified = true;
          }
        });
      }
    }
  }

  console.log('dniNaglowekModified:', dniNaglowekModified);
  console.log('harmonogramModified:', harmonogramModified);

  if (dniNaglowekModified || harmonogramModified) {
    const patchFields = {};
    const mask = [];
    if (dniNaglowekModified) {
      patchFields.dniNaglowek = data.dniNaglowek;
      mask.push('dniNaglowek');
    }
    if (harmonogramModified) {
      patchFields.harmonogramDni = data.harmonogramDni;
      mask.push('harmonogramDni');
    }
    await patchDoc('stan_grafiku', 'Listopad_2026', patchFields, mask);
    console.log('Successfully patched stan_grafiku/Listopad_2026 in Firestore!');
  } else {
    console.log('No modifications needed.');
  }
}

run().catch(console.error);
