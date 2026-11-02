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
  console.log('=== 1. Pobranie Październik_2026 i wyznaczenie finalnego rankingu miesiąca ===');
  const octDoc = await fetchDoc('stan_grafiku', 'Październik_2026');
  const oct = {};
  for (const k in octDoc.fields) oct[k] = fromFirestoreValue(octDoc.fields[k]);

  const finalOctRanking = (oct.rankingMiesiac || []).map(r => ({
    nazwisko: r.nazwisko,
    normName: (r.nazwisko || '').toLowerCase().trim(),
    punkty: r.punkty,
    suma: r.punkty,
    pozycja: r.pozycja,
    miejsce: r.pozycja,
    grupa: r.grupa || ''
  }));

  console.log('Finalny ranking października do zarchiwizowania:');
  finalOctRanking.forEach(r => console.log(`${r.pozycja}. ${r.nazwisko}: ${r.punkty} pkt`));

  // Dokumenty do aktualizacji
  const docsToUpdate = ['Listopad_2026', 'Październik_2026', 'Pazdziernik_2026'];

  for (const docKey of docsToUpdate) {
    console.log(`\n=== Aktualizacja stan_grafiku/${docKey} ===`);
    const docDataRaw = await fetchDoc('stan_grafiku', docKey);
    if (!docDataRaw || !docDataRaw.fields) continue;

    const docObj = {};
    for (const k in docDataRaw.fields) docObj[k] = fromFirestoreValue(docDataRaw.fields[k]);

    let rankingiM = docObj.rankingiMiesiecy || {};
    rankingiM['Październik'] = finalOctRanking;

    await patchDoc('stan_grafiku', docKey, {
      rankingiMiesiecy: rankingiM
    }, ['rankingiMiesiecy']);

    console.log(`✅ Zaktualizowano rankingiMiesiecy.Październik w ${docKey}`);
  }

  console.log('\n Wszystkie dokumenty zaktualizowane pomyślnie!');
}

run().catch(console.error);
