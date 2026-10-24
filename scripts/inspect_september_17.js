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

function getDoc(docName) {
  return new Promise((resolve) => {
    const url = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/stan_grafiku/' + encodeURIComponent(docName) + '?key=' + API_KEY;
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const fields = json.fields || {};
          const docData = {};
          for (const k in fields) docData[k] = fromFirestoreValue(fields[k]);
          resolve(docData);
        } catch(e) { resolve(null); }
      });
    });
  });
}

async function run() {
  const wrz = await getDoc('Wrzesień_2026') || await getDoc('Wrzesien_2026');
  if (!wrz) {
    console.log('Nie znaleziono Wrzesień_2026!');
    return;
  }
  console.log('Miesiąc:', wrz.nazwaMiesiaca, wrz.rok);
  console.log('Liturgie dodatkowe:', JSON.stringify(wrz.liturgieDodatkowe, null, 2));

  // Nagłówek dnia 17 (indeks 16)
  if (wrz.naglowek && wrz.naglowek[16]) {
    console.log('Nagłówek dnia 17:', JSON.stringify(wrz.naglowek[16]));
  }

  // Wiersze dnia 17
  console.log('\nWiersze na dzień 17 (indeks 16):');
  (wrz.wiersze || []).forEach(w => {
    const k = w.komorki ? w.komorki[16] : null;
    console.log(`${w.nazwisko} (${w.grupa}): wartosc=${k ? k.wartosc : 'brak'}, maDyzur=${k ? k.maDyzur : 'brak'}, liturgie=${k && k.liturgie ? JSON.stringify(k.liturgie) : 'brak'}`);
  });

  // Historia wpisów związana z dniem 17
  console.log('\nHistoria wpisów dla 17 września:');
  (wrz.historiaWpisow || []).filter(h => h.dzien && h.dzien.includes('17')).forEach(h => {
    console.log(h);
  });
}

run();
