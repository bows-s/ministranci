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
  console.log('--- 1. Aktualizacja obecnosc/M9_20_1800 ---');
  const ob = await getDoc('obecnosc', 'M9_20_1800');
  if (ob && ob.ministranci) {
    ob.ministranci.forEach(m => {
      if (m && m.nazwisko === 'Maks Erich') {
        console.log('Aktualizacja Maks Erich w obecnosci (1 pkt):', m);
        m.status = 'USPRAWIEDLIWIONY';
        m.domyslnyStatus = 'USPRAWIEDLIWIONY';
        m.punkty = 1;
        m.obecnyPkt = 1;
        m.poprzedniePunktyZTejMszy = 1;
        m.opisGieldy = 'Zastępstwo przejęte: Maciej Erich (+1 pkt)';
      } else if (m && m.nazwisko === 'Maciej Erich') {
        console.log('Aktualizacja Maciej Erich w obecnosci (4 pkt):', m);
        m.status = 'OBECNY';
        m.domyslnyStatus = 'OBECNY';
        m.punkty = 4;
        m.obecnyPkt = 4;
        m.poprzedniePunktyZTejMszy = 4;
        m.zastepuje = 'Maks Erich';
        m.opisGieldy = 'Przejęty dyżur z giełdy (+4 pkt • Maks Erich)';
      }
    });
    await patchDocFields('obecnosc', 'M9_20_1800', { ministranci: ob.ministranci });
    console.log('Zapisano obecnosc/M9_20_1800 pomyślnie!');
  } else {
    console.warn('Nie znaleziono obecnosc/M9_20_1800');
  }

  const docIds = ['Październik_2026', 'Pazdziernik_2026'];
  for (const docId of docIds) {
    console.log(`\n--- 2. Aktualizacja stan_grafiku/${docId} ---`);
    const doc = await getDoc('stan_grafiku', docId);
    if (!doc) {
      console.warn(`Brak dokumentu ${docId}`);
      continue;
    }

    // A. Zaktualizuj wolneZastepstwa i zamianyZastepstwa
    let wolne = (doc.wolneZastepstwa || []).slice();
    wolne.forEach(z => {
      if (z && (z.id === 'oferta_20_1792510357461' || (z.dzien === 20 && z.oddajacy === 'Maks Erich'))) {
        z.status = 'ZREALIZOWANE';
        z.przejmujacy = 'Maciej Erich';
        z.czasPrzejecia = 1792510400000;
      }
    });

    let zamiany = (doc.zamianyZastepstwa || []).slice();
    let foundZam = false;
    zamiany.forEach(z => {
      if (z && (z.id === 'oferta_20_1792510357461' || (z.dzien === 20 && z.oddajacy === 'Maks Erich'))) {
        z.status = 'ZREALIZOWANE';
        z.przejmujacy = 'Maciej Erich';
        z.czasPrzejecia = 1792510400000;
        foundZam = true;
      }
    });
    if (!foundZam) {
      zamiany.push({
        id: 'oferta_20_1792510357461',
        dzien: 20,
        oddajacy: 'Maks Erich',
        godzina: '18:00',
        typ: 'Tydzień',
        status: 'ZREALIZOWANE',
        punkty: 4,
        rok: 2026,
        miesiacIdx: 9,
        utworzono: 1792510357642,
        przejmujacy: 'Maciej Erich',
        czasPrzejecia: 1792510400000
      });
    }

    // B. Zaktualizuj komórki wierszy
    let wiersze = (doc.wiersze || []).slice();
    let maciejW = wiersze.find(w => w && w.nazwisko === 'Maciej Erich');
    let maksW = wiersze.find(w => w && w.nazwisko === 'Maks Erich');

    let deltaMaciej = 0;
    if (maciejW) {
      const c19 = maciejW.komorki[19] || {};
      c19.liturgie = c19.liturgie || {};
      c19.liturgie['18:00'] = 4;
      c19.wartosc = 4;
      maciejW.komorki[19] = c19;
      const staraSuma = maciejW.suma;
      maciejW.suma = maciejW.komorki.reduce((acc, c) => acc + (c && typeof c.wartosc === 'number' ? c.wartosc : 0), 0);
      deltaMaciej = maciejW.suma - staraSuma;
      console.log(`Maciej Erich: stara suma = ${staraSuma}, nowa suma = ${maciejW.suma} (delta = ${deltaMaciej})`);
    }

    let deltaMaks = 0;
    if (maksW) {
      const c19 = maksW.komorki[19] || {};
      c19.liturgie = c19.liturgie || {};
      c19.liturgie['18:00'] = 1;
      c19.wartosc = 1;
      maksW.komorki[19] = c19;
      const staraSuma = maksW.suma;
      maksW.suma = maksW.komorki.reduce((acc, c) => acc + (c && typeof c.wartosc === 'number' ? c.wartosc : 0), 0);
      deltaMaks = maksW.suma - staraSuma;
      console.log(`Maks Erich: stara suma = ${staraSuma}, nowa suma = ${maksW.suma} (delta = ${deltaMaks})`);
    }

    // C. Ranking miesiąc
    let rankingMiesiac = (doc.rankingMiesiac || []).slice();
    let rmMaciej = rankingMiesiac.find(r => r && r.nazwisko === 'Maciej Erich');
    if (rmMaciej && maciejW) {
      rmMaciej.suma = maciejW.suma;
      rmMaciej.punkty = maciejW.suma;
    }
    let rmMaks = rankingMiesiac.find(r => r && r.nazwisko === 'Maks Erich');
    if (rmMaks && maksW) {
      rmMaks.suma = maksW.suma;
      rmMaks.punkty = maksW.suma;
    }
    rankingMiesiac.sort((a, b) => (b.suma || 0) - (a.suma || 0));
    rankingMiesiac.forEach((r, idx) => {
      r.pozycja = idx + 1;
      r.miejsce = idx + 1;
    });

    // D. Ranking rok
    let rankingRok = (doc.rankingRok || []).slice();
    let rrMaciej = rankingRok.find(r => r && r.nazwisko === 'Maciej Erich');
    if (rrMaciej && maciejW) {
      rrMaciej.suma = (rrMaciej.suma || 0) + deltaMaciej;
      rrMaciej.punkty = rrMaciej.suma;
      if (Array.isArray(rrMaciej.punktyPoMiesiacach)) {
        let pOct = rrMaciej.punktyPoMiesiacach.find(p => p && (p.miesiacIdx === 9 || p.miesiac === 'Październik'));
        if (pOct) pOct.punkty = maciejW.suma;
      }
    }
    let rrMaks = rankingRok.find(r => r && r.nazwisko === 'Maks Erich');
    if (rrMaks && maksW) {
      rrMaks.suma = (rrMaks.suma || 0) + deltaMaks;
      rrMaks.punkty = rrMaks.suma;
      if (Array.isArray(rrMaks.punktyPoMiesiacach)) {
        let pOct = rrMaks.punktyPoMiesiacach.find(p => p && (p.miesiacIdx === 9 || p.miesiac === 'Październik'));
        if (pOct) pOct.punkty = maksW.suma;
      }
    }
    rankingRok.sort((a, b) => (b.suma || 0) - (a.suma || 0));
    rankingRok.forEach((r, idx) => {
      r.pozycja = idx + 1;
      r.miejsce = idx + 1;
    });

    await patchDocFields('stan_grafiku', docId, {
      wolneZastepstwa: wolne,
      zamianyZastepstwa: zamiany,
      wiersze: wiersze,
      rankingMiesiac: rankingMiesiac,
      rankingRok: rankingRok
    });
    console.log(`Pomyślnie zaktualizowano ${docId}!`);
  }

  console.log('\n--- Gotowe! Punkty zaktualizowane: Maciej 4 pkt, Maks 1 pkt, giełda zrealizowana! ---');
}

run().catch(err => {
  console.error('BŁĄD:', err);
  process.exit(1);
});
