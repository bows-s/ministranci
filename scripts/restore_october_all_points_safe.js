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

function getDoc(docName) {
  return new Promise((resolve, reject) => {
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
        } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function patchDoc(docName, updateFields) {
  return new Promise((resolve, reject) => {
    const mask = Object.keys(updateFields).map(k => 'updateMask.fieldPaths=' + encodeURIComponent(k)).join('&');
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/stan_grafiku/${encodeURIComponent(docName)}?${mask}&key=${API_KEY}`;
    const fields = {};
    for (const k in updateFields) {
      if (Object.prototype.hasOwnProperty.call(updateFields, k)) {
        fields[k] = toFirestoreValue(updateFields[k]);
      }
    }
    const payload = JSON.stringify({ fields: fields });
    const parsedUrl = new URL(url);
    const req = https.request({
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ sukces: true });
        } else {
          reject(new Error(`Błąd zapisu Firestore HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function czyToSamoNazwisko(a, b) {
  if (!a || !b) return false;
  const na = a.toLowerCase().trim();
  const nb = b.toLowerCase().trim();
  return na === nb || na.includes(nb) || nb.includes(na);
}

const PUNKTY_HISTORIA = {
  1: { "Jan Radliński": 7, "Rafał Danielczok": 7, "Marcel Mazurkiewicz": -5, "Bartosz Rozik": 7, "Jakub Brytner": 4, "Franek Kik": 4 },
  2: { "Maciej Erich": 7, "Emil Czech": 7, "Mateusz Pierścieński": -5 },
  3: { "Maciej Erich": 9, "Ksawery Skrzypek": 3, "Rafał Danielczok": 1 },
  4: { "Maks Erich": 0, "Mateusz Pierścieński": 3, "Jan Radliński": 3, "Wiktor Kowalski": 1, "Maciej Erich": 3, "Michał Kupiec": 3, "Paweł Głaz": -5, "Mikołaj Erich": 3, "Jakub Brytner": 3, "Franek Kik": 6, "Michał Danielczok": 3, "Marcel Mazurkiewicz": -5, "Emil Czech": 6, "Bartosz Rozik": 0 },
  5: { "Jakub Brytner": 5 },
  6: { "Ksawery Skrzypek": 7, "Maciej Erich": 6, "Franek Kik": 7, "Maks Erich": 5, "Michał Kupiec": -5, "Mikołaj Erich": 1 },
  8: { "Jan Radliński": 7, "Rafał Danielczok": 7, "Bartosz Rozik": 7, "Marcel Mazurkiewicz": -5 },
  9: { "Maciej Erich": 7, "Emil Czech": 7, "Jakub Brytner": 4, "Mateusz Pierścieński": -5 },
  10: { "Maciej Erich": 5, "Ksawery Skrzypek": 5, "Rafał Danielczok": 5 },
  11: {
    "Maks Erich": 3,
    "Mateusz Pierścieński": 3,
    "Jan Radliński": 3,
    "Wiktor Kowalski": -5,
    "Maciej Erich": 3,
    "Michał Kupiec": 3,
    "Paweł Głaz": -5,
    "Mikołaj Erich": 3,
    "Jakub Brytner": 3,
    "Franek Kik": 6,
    "Michał Danielczok": -5,
    "Marcel Mazurkiewicz": -4,
    "Emil Czech": 3,
    "Bartosz Rozik": 6
  },
  12: { "Jakub Brytner": 5 },
  13: { "Ksawery Skrzypek": 0 },
  16: { "Emil Czech": 0 },
  18: { "Emil Czech": 0 }
};

async function run() {
  console.log("Pobieram Październik_2026...");
  const doc = await getDoc("Październik_2026");
  if (!doc) throw new Error("Brak dokumentu Październik_2026");

  const wiersze = doc.wiersze || [];
  console.log(`Przetwarzam ${wiersze.length} wierszy...`);

  wiersze.forEach(w => {
    let suma = 0;
    (w.komorki || []).forEach((c, idx) => {
      const d = idx + 1;
      let p = null;
      if (PUNKTY_HISTORIA[d]) {
        for (const nazwa in PUNKTY_HISTORIA[d]) {
          if (czyToSamoNazwisko(nazwa, w.nazwisko)) {
            p = PUNKTY_HISTORIA[d][nazwa];
            break;
          }
        }
      }
      c.wartosc = p;
      if (typeof p === 'number') {
        suma += p;
      }
    });
    w.suma = Math.round(suma * 10) / 10;
  });

  // Ranking miesięczny
  const rankingNowy = wiersze
    .filter(w => {
      if (!w || !w.nazwisko) return false;
      const n = w.nazwisko.toLowerCase().trim();
      return n !== 'kościelny' && n !== 'koscielny' && !n.includes('pokojsk');
    })
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

  console.log("=== ODTWORZONY RANKING MIESIĄCA ===");
  rankingNowy.forEach(r => {
    console.log(`${r.pozycja}. ${r.nazwisko}: ${r.punkty} pkt`);
  });

  // Ranking roczny: zaktualizuj wpis październikowy w punktyPoMiesiacach
  const rankingRok = (doc.rankingRok || []).map(r => {
    const matchW = wiersze.find(w => czyToSamoNazwisko(w.nazwisko, r.nazwisko));
    const mPts = matchW ? matchW.suma : 0;
    const matchRM = rankingNowy.find(rn => czyToSamoNazwisko(rn.nazwisko, r.nazwisko));
    const pozM = matchRM ? matchRM.pozycja : undefined;

    let sumPrev = 0;
    let foundOct = false;
    if (r.punktyPoMiesiacach && Array.isArray(r.punktyPoMiesiacach)) {
      r.punktyPoMiesiacach.forEach(pm => {
        if (pm.miesiac === "Październik" || pm.miesiacIdx === 9) {
          pm.punkty = mPts;
          if (pozM !== undefined) pm.pozycja = pozM;
          else delete pm.pozycja;
          foundOct = true;
        } else {
          sumPrev += (pm.punkty || 0);
        }
      });
    }
    if (!foundOct && r.punktyPoMiesiacach) {
      r.punktyPoMiesiacach.push({
        miesiac: "Październik",
        miesiacIdx: 9,
        rok: 2026,
        punkty: mPts,
        pozycja: pozM
      });
    }
    const tot = Math.round((sumPrev + mPts) * 10) / 10;
    return {
      ...r,
      punkty: tot,
      suma: tot
    };
  });

  rankingRok.sort((a, b) => (b.punkty || 0) - (a.punkty || 0));
  let pozR = 1;
  rankingRok.forEach((r, idx) => {
    if (idx > 0 && (r.punkty || 0) < (rankingRok[idx - 1].punkty || 0)) pozR = idx + 1;
    r.pozycja = pozR;
    r.miejsce = pozR;
  });

  console.log("Zapisuję przywrócone punkty i rankingi do Firestore...");
  await patchDoc("Październik_2026", {
    wiersze: wiersze,
    ranking: rankingNowy,
    rankingMiesiac: rankingNowy,
    rankingRok: rankingRok,
    zaktualizowano: new Date().toISOString()
  });

  console.log("SUKCES! Wszystkie punkty zostały przywrócone!");
}

run().catch(console.error);
