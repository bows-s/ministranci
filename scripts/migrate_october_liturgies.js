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

function czyToSamoNazwisko(a, b) {
  if (!a || !b) return false;
  const na = a.toLowerCase().trim();
  const nb = b.toLowerCase().trim();
  return na === nb || na.indexOf(nb) !== -1 || nb.indexOf(na) !== -1;
}

async function migrate(dryRun = false) {
  console.log(`Starting migration (dryRun=${dryRun})...`);

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
  
  obecnosci.sort((a, b) => {
    if (a.dzien !== b.dzien) return a.dzien - b.dzien;
    return (a.godzina || '').localeCompare(b.godzina || '');
  });

  console.log(`Loaded ${obecnosci.length} attendance records from obecnosc.`);

  // Build attendance lookup: day -> map of name -> { [godzina]: points }
  const attLookup = {};
  for (let d = 1; d <= 31; d++) attLookup[d] = {};

  obecnosci.forEach(o => {
    const d = o.dzien;
    const g = (o.godzina || '').trim();
    (o.ministranci || []).forEach(m => {
      const row = stan.wiersze.find(w => czyToSamoNazwisko(w.nazwisko, m.nazwisko));
      if (!row) return;
      const rName = row.nazwisko;
      attLookup[d][rName] = attLookup[d][rName] || {};

      let pkt = (typeof m.punkty === 'number') ? m.punkty : (m.obecnyPkt || 5);
      if (m.bylNaRozancu && typeof m.punkty !== 'number') {
        pkt += 2;
      }
      if (m.status === 'NIEOBECNY') {
        pkt = (o.rodzajLiturgii === 'nabozenstwo' || m.typ === 'DODATKOWY') ? 0 : -5;
      } else if (m.status === 'ODDANY') {
        pkt = 1;
      } else if (m.status === 'USPRAWIEDLIWIONY') {
        pkt = 0;
      }

      if (!(m.status === 'NIEOBECNY' && (o.rodzajLiturgii === 'nabozenstwo' || m.typ === 'DODATKOWY'))) {
        if (m.bylNaRozancu && typeof m.punkty !== 'number') {
          attLookup[d][rName]['17:15'] = 2;
          attLookup[d][rName][g] = (m.obecnyPkt || 5);
        } else {
          attLookup[d][rName][g] = pkt;
        }
      }

      if (m.typ === 'ZASTEPCA' && m.zastepuje) {
        const oddRow = stan.wiersze.find(w => czyToSamoNazwisko(w.nazwisko, m.zastepuje));
        if (oddRow) {
          attLookup[d][oddRow.nazwisko] = attLookup[d][oddRow.nazwisko] || {};
          attLookup[d][oddRow.nazwisko][g] = 1;
        }
      }
    });
  });

  // Apply to cells in stan.wiersze
  stan.wiersze.forEach(w => {
    for (let d = 1; d <= 31; d++) {
      const cell = w.komorki[d - 1];
      const attDay = (attLookup[d] && attLookup[d][w.nazwisko]) ? attLookup[d][w.nazwisko] : null;
      
      let litMap = {};
      if (attDay && Object.keys(attDay).length > 0) {
        if (w.nazwisko === 'Wiktor Kowalski' && d === 4) {
          litMap = { '10:00': 1 };
        } else if (w.nazwisko === 'Ksawery Skrzypek' && d === 3) {
          litMap = { '17:00': 3 };
        } else {
          litMap = attDay;
        }
      } else if (typeof cell.wartosc === 'number') {
        litMap = { 'dyzur': cell.wartosc };
      }

      cell.liturgie = litMap;
      const keys = Object.keys(litMap);
      if (keys.length > 0) {
        cell.wartosc = keys.reduce((acc, k) => acc + litMap[k], 0);
      } else if (cell.wartosc === 0 || cell.wartosc === '0') {
        cell.wartosc = 0;
      } else {
        cell.wartosc = null;
      }
    }

    // Recalculate row total
    w.suma = w.komorki.reduce((acc, c) => {
      const v = parseFloat(c.wartosc);
      return acc + (isNaN(v) ? 0 : v);
    }, 0);
    w.suma = Math.round(w.suma * 10) / 10;
  });

  // Recalculate monthly ranking
  const rankingNowy = stan.wiersze
    .filter(w => w.nazwisko && w.suma !== undefined)
    .map(w => ({
      nazwisko: w.nazwisko,
      punkty: w.suma,
      suma: w.suma,
      grupa: w.grupa
    }))
    .sort((a, b) => b.punkty - a.punkty);

  let poz = 1;
  rankingNowy.forEach((r, idx) => {
    if (idx > 0 && r.punkty < rankingNowy[idx - 1].punkty) poz = idx + 1;
    r.pozycja = poz;
    r.miejsce = poz;
  });
  stan.ranking = rankingNowy;
  stan.rankingMiesiac = rankingNowy;

  console.log('\n--- Final Verified State of Ministrants ---');
  stan.wiersze.forEach(w => {
    const d13 = w.komorki[12];
    console.log(`${w.nazwisko.padEnd(22)} | Suma: ${String(w.suma).padStart(3)} | D13: val=${d13.wartosc}, lits=${JSON.stringify(d13.liturgie)}`);
  });

  if (!dryRun) {
    console.log('\nSaving updated stan_grafiku/Październik_2026 to Firestore...');
    await saveDoc('Październik_2026', stan);
    console.log('✅ Successfully saved to Firestore!');
  } else {
    console.log('\n[Dry Run complete. No writes performed.]');
  }
}

const isDry = process.argv.includes('--dry-run');
migrate(isDry).catch(console.error);
