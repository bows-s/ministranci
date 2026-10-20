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
      if (Object.prototype.hasOwnProperty.call(val, k) && val[k] !== undefined) {
        fields[k] = toFirestoreValue(val[k]);
      }
    }
    return { mapValue: { fields: fields } };
  }
  return { stringValue: String(val) };
}

function getDoc(collection, docId) {
  return new Promise((resolve, reject) => {
    const path = `/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${encodeURIComponent(docId)}?key=${API_KEY}`;
    https.get({ host: 'firestore.googleapis.com', path: path }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.fields) {
            const resObj = {};
            for (const k in json.fields) resObj[k] = fromFirestoreValue(json.fields[k]);
            resolve(resObj);
          } else {
            resolve(null);
          }
        } catch (e) { resolve(null); }
      });
    }).on('error', reject);
  });
}

function patchDocFields(collection, docId, fieldsToUpdate) {
  return new Promise((resolve, reject) => {
    const updateMask = Object.keys(fieldsToUpdate).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
    const path = `/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${encodeURIComponent(docId)}?${updateMask}&key=${API_KEY}`;
    
    const firestoreFields = {};
    for (const k in fieldsToUpdate) {
      firestoreFields[k] = toFirestoreValue(fieldsToUpdate[k]);
    }
    
    const body = JSON.stringify({ fields: firestoreFields });
    
    const req = https.request({
      host: 'firestore.googleapis.com',
      path: path,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Patch failed (${res.statusCode}): ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function run() {
  console.log('--- 1. Naprawa Mikołaja Ericha w obecnosc/M9_17_1700 ---');
  const ob = await getDoc('obecnosc', 'M9_17_1700');
  if (ob && ob.ministranci) {
    let zmieniono = false;
    ob.ministranci.forEach(m => {
      if (m && (m.nazwisko === 'Mikołaj Erich' || (m.normName && m.normName.includes('mikołaj')))) {
        console.log('Znaleziono Mikołaja w obecnosc/M9_17_1700 -> przywracanie 3 pkt (msza dyżurna):', m);
        m.typ = 'DOMYSLNY';
        m.punkty = 3;
        m.obecnyPkt = 3;
        m.poprzedniePunktyZTejMszy = 3;
        m.status = 'OBECNY';
        m.domyslnyStatus = 'OBECNY';
        m.opisGieldy = '';
        zmieniono = true;
      }
    });
    if (zmieniono) {
      await patchDocFields('obecnosc', 'M9_17_1700', { ministranci: ob.ministranci });
      console.log('Pomyślnie zaktualizowano obecnosc/M9_17_1700!');
    }
  }

  const docIds = ['Październik_2026', 'Pazdziernik_2026'];
  for (const docId of docIds) {
    console.log(`\n--- 2. Aktualizacja stan_grafiku/${docId} ---`);
    const doc = await getDoc('stan_grafiku', docId);
    if (!doc) continue;

    let wiersze = (doc.wiersze || []).slice();
    let mikolajW = wiersze.find(w => w && w.nazwisko === 'Mikołaj Erich');
    let delta = 0;
    if (mikolajW) {
      const c16 = mikolajW.komorki[16] || {};
      c16.liturgie = c16.liturgie || {};
      c16.liturgie['17:00'] = 3; // msza dyżurna = 3 pkt
      c16.liturgie['16:15'] = c16.liturgie['16:15'] || 2; // Różaniec = 2 pkt
      c16.wartosc = 5; // 3 + 2 = 5 pkt
      c16.maDyzur = true;
      mikolajW.komorki[16] = c16;

      const staraSuma = mikolajW.suma;
      mikolajW.suma = mikolajW.komorki.reduce((acc, c) => acc + (c && typeof c.wartosc === 'number' ? c.wartosc : 0), 0);
      delta = mikolajW.suma - staraSuma;
      console.log(`Mikołaj Erich (dzień 17): liturgie=${JSON.stringify(c16.liturgie)}, wartosc=${c16.wartosc}, nowa suma=${mikolajW.suma} (delta=${delta})`);
    }

    // Ranking miesiąc
    let rankingMiesiac = (doc.rankingMiesiac || []).slice();
    let rm = rankingMiesiac.find(r => r && r.nazwisko === 'Mikołaj Erich');
    if (rm && mikolajW) {
      rm.suma = mikolajW.suma;
      rm.punkty = mikolajW.suma;
    }
    rankingMiesiac.sort((a, b) => (b.suma || 0) - (a.suma || 0));
    rankingMiesiac.forEach((r, idx) => {
      r.pozycja = idx + 1;
      r.miejsce = idx + 1;
    });

    // Ranking rok
    let rankingRok = (doc.rankingRok || []).slice();
    let rr = rankingRok.find(r => r && r.nazwisko === 'Mikołaj Erich');
    if (rr && mikolajW) {
      rr.suma = (rr.suma || 0) + delta;
      rr.punkty = rr.suma;
      if (Array.isArray(rr.punktyPoMiesiacach)) {
        let pOct = rr.punktyPoMiesiacach.find(p => p && (p.miesiacIdx === 9 || p.miesiac === 'Październik'));
        if (pOct) {
          pOct.punkty = mikolajW.suma;
        }
      }
    }
    rankingRok.sort((a, b) => (b.suma || 0) - (a.suma || 0));
    rankingRok.forEach((r, idx) => {
      r.pozycja = idx + 1;
      r.miejsce = idx + 1;
    });

    await patchDocFields('stan_grafiku', docId, {
      wiersze: wiersze,
      rankingMiesiac: rankingMiesiac,
      rankingRok: rankingRok
    });
    console.log(`Zapisano ${docId} pomyślnie.`);
  }

  console.log('\n--- Gotowe! Mikołaj Erich ma w Zakrystii +3 pkt i w grafiku 5 pkt za wczoraj (3 msza + 2 różaniec), łącznie 7 pkt w październiku! ---');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
