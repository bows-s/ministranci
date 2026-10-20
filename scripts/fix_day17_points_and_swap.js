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

async function fix() {
  console.log('1. Fixing obecnosc/M9_17_1700...');
  const obec = await getDoc('obecnosc', 'M9_17_1700');
  if (obec && Array.isArray(obec.ministranci)) {
    for (const m of obec.ministranci) {
      if (m.nazwisko && m.nazwisko.includes('Mateusz')) {
        m.typ = 'DOMYSLNY';
        m.punkty = 3;
        m.obecnyPkt = 3;
        m.opisGieldy = 'Zamiana z: Maciej Erich';
        console.log('Updated Mateusz in obecnosc -> DOMYSLNY, 3 pkt');
      } else if (m.nazwisko && m.nazwisko.includes('Maciej')) {
        m.typ = 'DODATKOWY';
        m.punkty = 1;
        m.obecnyPkt = 1;
        m.opisGieldy = 'Dodatkowa msza (+1 pkt • po dyżurze +2 pkt)';
        console.log('Updated Maciej in obecnosc -> DODATKOWY, 1 pkt');
      }
    }
    await patchDocFields('obecnosc', 'M9_17_1700', { ministranci: obec.ministranci });
    console.log('obecnosc/M9_17_1700 saved successfully.');
  }

  const docKeys = ['Październik_2026', 'Pazdziernik_2026'];
  for (const docKey of docKeys) {
    console.log(`\n2. Fixing stan_grafiku/${docKey}...`);
    const docData = await getDoc('stan_grafiku', docKey);
    if (!docData) {
      console.log(`Document ${docKey} not found!`);
      continue;
    }

    const wiersze = docData.wiersze || [];
    for (const w of wiersze) {
      if (!w || !w.nazwisko || !w.komorki) continue;
      if (w.nazwisko.includes('Mateusz')) {
        const c17 = w.komorki[16];
        if (c17) {
          c17.liturgie = c17.liturgie || {};
          c17.liturgie['17:00'] = 3;
          c17.liturgie['16:15'] = 2; // Różaniec
          c17.wartosc = 5;
        }
      } else if (w.nazwisko.includes('Maciej')) {
        const c17 = w.komorki[16];
        if (c17) {
          c17.liturgie = c17.liturgie || {};
          c17.liturgie['17:00'] = 1; // msza dodatkowa przed jutrzejszym dyżurem
          c17.liturgie['16:15'] = 2; // Różaniec
          c17.wartosc = 3;
        }
      }

      // Recalculate row sum
      w.suma = w.komorki.reduce((acc, c) => {
        const v = parseFloat(c ? c.wartosc : 0);
        return acc + (isNaN(v) ? 0 : v);
      }, 0);
      w.suma = Math.round(w.suma * 10) / 10;
    }

    // Recalculate ranking
    const ranking = wiersze
      .filter(w => {
        if (!w || !w.nazwisko) return false;
        const n = w.nazwisko.toLowerCase().trim();
        return n !== 'kościelny' && n !== 'koscielny' && !n.includes('pokojsk');
      })
      .map(w => {
        const obecnosci = (w.komorki || []).filter(c => typeof c.wartosc === 'number' && c.wartosc > 0).length;
        return {
          nazwisko: w.nazwisko,
          punkty: w.suma || 0,
          obecnosci: obecnosci,
          grupa: w.grupa || 'Ogólna',
          stopien: w.stopien || 'Ministrant',
          stopienRanga: w.stopienRanga || 1
        };
      });

    ranking.sort((a, b) => (b.punkty - a.punkty) || (b.obecnosci - a.obecnosci));

    const fieldsToUpdate = {
      wiersze: wiersze,
      ranking: ranking,
      rankingMiesiac: ranking,
      zaktualizowano: new Date().toISOString()
    };

    await patchDocFields('stan_grafiku', docKey, fieldsToUpdate);
    console.log(`stan_grafiku/${docKey} patched successfully!`);

    const maciej = wiersze.find(w => w.nazwisko.includes('Maciej'));
    const mateusz = wiersze.find(w => w.nazwisko.includes('Mateusz'));
    console.log(`New sums in ${docKey}: Maciej = ${maciej.suma}, Mateusz = ${mateusz.suma}`);
  }

  console.log('\nAll fixes complete!');
}

fix().catch(console.error);
