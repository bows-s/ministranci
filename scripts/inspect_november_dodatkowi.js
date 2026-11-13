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

function fetchAllDocs(coll) {
  return new Promise((resolve, reject) => {
    https.get('https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/' + coll + '?pageSize=300&key=' + API_KEY, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => {
        try {
          const json = JSON.parse(d);
          resolve(json.documents || []);
        } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function run() {
  const rawDocs = await fetchAllDocs('obecnosc');
  const docs = rawDocs.map(doc => {
    const id = doc.name.split('/').pop();
    const obj = {};
    for (const k in doc.fields) obj[k] = fromFirestoreValue(doc.fields[k]);
    return { id, ...obj };
  }).filter(x => x.miesiacIdx === 10 && x.rok === 2026);

  docs.sort((a, b) => (a.dzien - b.dzien) || (a.godzina || '').localeCompare(b.godzina || ''));

  docs.forEach(doc => {
    const dow = new Date(2026, 10, doc.dzien).getDay();
    const dodatkowi = (doc.ministranci || []).filter(m => m.typ === 'DODATKOWY' && m.status === 'OBECNY');
    if (dodatkowi.length > 0) {
      console.log(`[${doc.id}] Dzień ${doc.dzien} (dow=${dow}, ${doc.godzina}, ${doc.rodzajLiturgii}, pktLit=${doc.punktyLiturgii}, reczne=${doc.recznieUstawionePunkty}):`);
      dodatkowi.forEach(m => {
        console.log(`  - ${m.nazwisko}: obecnyPkt=${m.obecnyPkt}, punkty=${m.punkty}, opis=${m.opisGieldy}`);
      });
    }
  });
}

run().catch(console.error);
