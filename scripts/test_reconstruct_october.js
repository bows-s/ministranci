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

function czyToSamoNazwisko(a, b) {
  if (!a || !b) return false;
  const na = a.toLowerCase().trim();
  const nb = b.toLowerCase().trim();
  return na === nb || na.indexOf(nb) !== -1 || nb.indexOf(na) !== -1;
}

async function run() {
  const urlStan = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/stan_grafiku/Pa%C5%BAdziernik_2026?key=' + API_KEY;
  const jsonStan = await fetchJson(urlStan);
  const fieldsStan = jsonStan.fields || {};
  const stan = {};
  for (const k in fieldsStan) stan[k] = fromFirestoreValue(fieldsStan[k]);

  const urlObec = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/obecnosc?pageSize=100&key=' + API_KEY;
  const jsonObec = await fetchJson(urlObec);
  const docs = (jsonObec.documents || []).filter(d => d.name.split('/').pop().startsWith('M9_'));
  
  const obecnosci = [];
  for (const d of docs) {
    const fields = d.fields || {};
    const obj = {};
    for (const k in fields) obj[k] = fromFirestoreValue(fields[k]);
    obecnosci.push(obj);
  }
  
  // Sort by day and hour
  obecnosci.sort((a, b) => {
    if (a.dzien !== b.dzien) return a.dzien - b.dzien;
    return (a.godzina || '').localeCompare(b.godzina || '');
  });

  // Reconstruct per ministrant per day
  const reconstructed = {}; // name -> day -> { liturgie: {} }
  stan.wiersze.forEach(w => {
    reconstructed[w.nazwisko] = {};
    for (let d = 1; d <= 31; d++) {
      reconstructed[w.nazwisko][d] = { liturgie: {} };
    }
  });

  obecnosci.forEach(o => {
    const d = o.dzien;
    const g = (o.godzina || '').trim();
    (o.ministranci || []).forEach(m => {
      const row = stan.wiersze.find(w => czyToSamoNazwisko(w.nazwisko, m.nazwisko));
      if (!row) {
        console.log('Not found row for:', m.nazwisko);
        return;
      }
      const dayRec = reconstructed[row.nazwisko][d];
      
      let pkt = 0;
      if (typeof m.punkty === 'number') {
        pkt = m.punkty;
      } else if (m.status === 'OBECNY') {
        pkt = m.obecnyPkt || 5;
        if (m.bylNaRozancu) pkt += 2;
        if (m.karaPunkty) pkt -= m.karaPunkty;
      } else if (m.status === 'NIEOBECNY') {
        pkt = (o.rodzajLiturgii === 'nabozenstwo' || m.typ === 'DODATKOWY') ? 0 : -5;
      } else if (m.status === 'ODDANY') {
        pkt = 1;
      } else if (m.status === 'USPRAWIEDLIWIONY') {
        pkt = 0;
      }

      if (m.status === 'NIEOBECNY' && (o.rodzajLiturgii === 'nabozenstwo' || m.typ === 'DODATKOWY')) {
        // do not record point
      } else {
        dayRec.liturgie[g] = pkt;
      }

      if (m.typ === 'ZASTEPCA' && m.zastepuje) {
        const oddRow = stan.wiersze.find(w => czyToSamoNazwisko(w.nazwisko, m.zastepuje));
        if (oddRow) {
          reconstructed[oddRow.nazwisko][d].liturgie[g] = 1;
        }
      }
    });
  });

  // Now compare for days 1..13 with stan.wiersze
  console.log('Comparing reconstructed vs current cells in stan_grafiku:');
  let diffCount = 0;
  stan.wiersze.forEach(w => {
    for (let d = 1; d <= 13; d++) {
      const cell = w.komorki[d - 1];
      const rec = reconstructed[w.nazwisko][d];
      const litKeys = Object.keys(rec.liturgie);
      let recSum = null;
      if (litKeys.length > 0) {
        recSum = litKeys.reduce((acc, k) => acc + rec.liturgie[k], 0);
      }
      const currentVal = cell.wartosc;
      if (recSum !== currentVal) {
        console.log(`DIFF: ${w.nazwisko} Day ${d}: rec=${recSum} (${JSON.stringify(rec.liturgie)}) vs cur=${currentVal}`);
        diffCount++;
      }
    }
  });
  console.log('Total diffs:', diffCount);
}
run();
