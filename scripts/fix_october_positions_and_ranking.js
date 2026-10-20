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

async function run() {
  console.log("Pobieram Październik_2026...");
  const doc = await getDoc("Październik_2026");
  if (!doc) {
    console.error("Nie znaleziono dokumentu!");
    return;
  }

  const rm = doc.rankingMiesiac || [];
  const rr = doc.rankingRok || [];

  console.log(`Znaleziono ${rm.length} osób w rankingMiesiac oraz ${rr.length} w rankingRok.`);

  rr.forEach(r => {
    const matchM = rm.find(m => czyToSamoNazwisko(m.nazwisko, r.nazwisko));
    const pozM = matchM ? (matchM.pozycja || matchM.miejsce) : null;
    const pktM = matchM ? (matchM.punkty !== undefined ? matchM.punkty : matchM.suma) : null;

    if (r.punktyPoMiesiacach && Array.isArray(r.punktyPoMiesiacach)) {
      const oct = r.punktyPoMiesiacach.find(m => m.miesiac === "Październik" || m.miesiacIdx === 9);
      if (oct) {
        if (pozM !== null) {
          oct.pozycja = pozM;
        } else {
          delete oct.pozycja;
        }
        if (pktM !== null) oct.punkty = pktM;
        console.log(`${r.nazwisko}: Październik pkt=${oct.punkty}, pozycja=${oct.pozycja} (z rankingMiesiac=${pozM})`);
      }
    }
  });

  // Upewnij się, że rankingRok ma poprawne pozycje roczne
  rr.sort((a, b) => (b.punkty || 0) - (a.punkty || 0));
  let poz = 1;
  rr.forEach((r, idx) => {
    if (idx > 0 && (r.punkty || 0) < (rr[idx - 1].punkty || 0)) {
      poz = idx + 1;
    }
    r.pozycja = poz;
    r.miejsce = poz;
  });

  console.log("Zapisuję zaktualizowany rankingRok do Firestore...");
  await patchDoc("Październik_2026", { rankingRok: rr });
  console.log("Sukces! Zaktualizowano pozycje październikowe w rankingRok.");
}

run().catch(console.error);
