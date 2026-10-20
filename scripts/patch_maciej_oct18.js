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
  console.log('--- 1. Aktualizacja obecnosc/M9_18_1000 ---');
  const ob = await getDoc('obecnosc', 'M9_18_1000');
  if (ob && ob.ministranci) {
    let zmieniono = false;
    ob.ministranci.forEach(m => {
      if (m && (m.nazwisko === 'Maciej Erich' || (m.normName && m.normName.includes('erich')))) {
        console.log('Znaleziono Macieja w obecnosci:', m);
        m.typ = 'DOMYSLNY';
        m.punkty = 3;
        m.obecnyPkt = 3;
        m.poprzedniePunktyZTejMszy = 3;
        m.status = 'OBECNY';
        m.domyslnyStatus = 'OBECNY';
        m.opisGieldy = 'Przeniesiony przez zakrystię (zamiana weekendowa)';
        zmieniono = true;
      }
    });
    if (zmieniono) {
      await patchDocFields('obecnosc', 'M9_18_1000', { ministranci: ob.ministranci });
      console.log('Zaktualizowano obecnosc/M9_18_1000 pomyślnie!');
    }
  } else {
    console.warn('Nie znaleziono obecnosc/M9_18_1000');
  }

  const docIds = ['Październik_2026', 'Pazdziernik_2026'];
  for (const docId of docIds) {
    console.log(`\n--- 2. Aktualizacja stan_grafiku/${docId} ---`);
    const doc = await getDoc('stan_grafiku', docId);
    if (!doc) {
      console.warn(`Brak dokumentu ${docId}`);
      continue;
    }

    // A. Dodaj lub zaktualizuj wpis w zamianyNiedziele
    let zamiany = (doc.zamianyNiedziele || []).slice();
    // Usuń ewentualne stare ręczne dla Macieja na dzień 18
    zamiany = zamiany.filter(z => !(z && z.typ === 'RECZNA' && z.dzien === 18 && z.ministrant && z.ministrant.includes('Erich')));
    zamiany.push({
      id: 'zr_18_maciej_1000',
      typ: 'RECZNA',
      dzien: 18,
      ministrant: 'Maciej Erich',
      godzinaPoprzednia: '11:30',
      godzina: '10:00',
      status: 'ZAAKCEPTOWANA',
      utworzonoPrzez: 'Kościelny',
      utworzono: Date.now()
    });

    // B. Zaktualizuj komórkę 17 w wierszach
    let wiersze = (doc.wiersze || []).slice();
    let maciejW = wiersze.find(w => w && w.nazwisko === 'Maciej Erich');
    let delta = 0;
    if (maciejW) {
      const c17 = maciejW.komorki[17] || {};
      const staraWartosc = typeof c17.wartosc === 'number' ? c17.wartosc : 1;
      c17.liturgie = c17.liturgie || {};
      c17.liturgie['10:00'] = 3;
      c17.wartosc = 3;
      maciejW.komorki[17] = c17;
      
      // Przelicz sumę
      const staraSuma = maciejW.suma;
      maciejW.suma = maciejW.komorki.reduce((acc, c) => acc + (c && typeof c.wartosc === 'number' ? c.wartosc : 0), 0);
      delta = maciejW.suma - staraSuma;
      console.log(`Maciej Erich: stara suma = ${staraSuma}, nowa suma = ${maciejW.suma} (delta = ${delta})`);
    }

    // C. Zaktualizuj rankingMiesiac
    let rankingMiesiac = (doc.rankingMiesiac || []).slice();
    let rm = rankingMiesiac.find(r => r && r.nazwisko === 'Maciej Erich');
    if (rm && maciejW) {
      rm.suma = maciejW.suma;
      rm.punkty = maciejW.suma;
    }
    rankingMiesiac.sort((a, b) => (b.suma || 0) - (a.suma || 0));
    rankingMiesiac.forEach((r, idx) => {
      r.pozycja = idx + 1;
      r.miejsce = idx + 1;
    });

    // D. Zaktualizuj rankingRok
    let rankingRok = (doc.rankingRok || []).slice();
    let rr = rankingRok.find(r => r && r.nazwisko === 'Maciej Erich');
    if (rr && maciejW) {
      rr.suma = (rr.suma || 0) + delta;
      rr.punkty = rr.suma;
      if (Array.isArray(rr.punktyPoMiesiacach)) {
        let pOct = rr.punktyPoMiesiacach.find(p => p && (p.miesiacIdx === 9 || p.miesiac === 'Październik'));
        if (pOct) {
          pOct.punkty = maciejW.suma;
        }
      }
    }
    rankingRok.sort((a, b) => (b.suma || 0) - (a.suma || 0));
    rankingRok.forEach((r, idx) => {
      r.pozycja = idx + 1;
      r.miejsce = idx + 1;
    });

    // E. Zapisz do Firestore
    await patchDocFields('stan_grafiku', docId, {
      zamianyNiedziele: zamiany,
      wiersze: wiersze,
      rankingMiesiac: rankingMiesiac,
      rankingRok: rankingRok
    });
    console.log(`Pomyślnie zaktualizowano ${docId}!`);
  }

  console.log('\n--- Gotowe! Maciej ma 3 pkt za 10:00 i dyżur przeniesiony z 11:30 na 10:00! ---');
}

run().catch(err => {
  console.error('BŁĄD:', err);
  process.exit(1);
});
