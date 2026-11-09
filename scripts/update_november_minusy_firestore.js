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

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const k in val) {
      if (val[k] !== undefined) fields[k] = toFirestoreValue(val[k]);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fetchDoc(coll, id) {
  return new Promise((resolve, reject) => {
    https.get('https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/' + coll + '/' + encodeURIComponent(id) + '?key=' + API_KEY, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function patchDoc(coll, id, fields, updateMask) {
  return new Promise((resolve, reject) => {
    const maskParams = (updateMask || Object.keys(fields)).map(f => 'updateMask.fieldPaths=' + encodeURIComponent(f)).join('&');
    const url = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/' + coll + '/' + encodeURIComponent(id) + '?' + maskParams + '&key=' + API_KEY;
    const body = JSON.stringify({ fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, toFirestoreValue(v)])) });
    const req = https.request(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const DNI_NAZWY = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
const POLISH_MONTHS_GENITIVE = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'
];

async function run() {
  console.log('Pobieram stan_grafiku/Listopad_2026...');
  const doc = await fetchDoc('stan_grafiku', 'Listopad_2026');
  const data = {};
  for (const k in doc.fields) data[k] = fromFirestoreValue(doc.fields[k]);

  const curRok = data.rok || 2026;
  const curMIdx = (data.miesiacIdx !== undefined) ? data.miesiacIdx : 10;
  const curMName = data.nazwaMiesiaca || 'Listopad';
  const curMGen = POLISH_MONTHS_GENITIVE[curMIdx] || 'listopada';

  const wiersze = data.wiersze || [];
  const minusyMiesiacMap = {};

  wiersze.forEach(w => {
    if (!w || !w.nazwisko) return;
    const n = w.nazwisko.toLowerCase().trim();
    if (n === 'kościelny' || n === 'koscielny' || n.includes('pokojsk')) return;

    const mList = [];
    (w.komorki || []).forEach((c, idx) => {
      const dNum = idx + 1;
      const dt = new Date(curRok, curMIdx, dNum);
      const dow = DNI_NAZWY[dt.getDay()];

      if (c && c.liturgie && typeof c.liturgie === 'object') {
        for (const g in c.liturgie) {
          const val = c.liturgie[g];
          if (typeof val === 'number' && val < 0) {
            mList.push({
              dzien: dNum,
              godzina: g,
              miesiac: curMName,
              miesiacGen: curMGen,
              miesiacIdx: curMIdx,
              rok: curRok,
              dzienTygodnia: dow,
              punkty: val
            });
          }
        }
      } else if (c && typeof c.wartosc === 'number' && c.wartosc < 0) {
        mList.push({
          dzien: dNum,
          godzina: '',
          miesiac: curMName,
          miesiacGen: curMGen,
          miesiacIdx: curMIdx,
          rok: curRok,
          dzienTygodnia: dow,
          punkty: c.wartosc
        });
      }
    });

    if (mList.length > 0) {
      minusyMiesiacMap[n] = {
        nazwisko: w.nazwisko,
        grupa: w.grupa,
        mins: mList
      };
    }
  });

  const nowyRMM = [];
  for (const nKey in minusyMiesiacMap) {
    const item = minusyMiesiacMap[nKey];
    let sum = 0;
    item.mins.forEach(x => { sum += x.punkty; });
    nowyRMM.push({
      nazwisko: item.nazwisko,
      normName: nKey,
      minusy: sum,
      szczegolyMinusow: item.mins,
      grupa: item.grupa,
      pozycja: 1
    });
  }

  nowyRMM.sort((a, b) => a.minusy - b.minusy);
  let pMM = 1;
  nowyRMM.forEach((m, idx) => {
    if (idx > 0 && m.minusy > nowyRMM[idx - 1].minusy) pMM = idx + 1;
    m.pozycja = pMM;
    m.miejsce = pMM;
  });

  console.log('\n=== Nowy rankingMinusyMiesiac (Listopad 2026) ===');
  nowyRMM.forEach(m => console.log(`${m.pozycja}. ${m.nazwisko}: ${m.minusy} pkt (${m.szczegolyMinusow.length} minusów)`));

  // Aktualizacja rankingMinusyRok
  let rankingMinusyRok = Array.isArray(data.rankingMinusyRok) ? data.rankingMinusyRok : [];
  wiersze.forEach(w => {
    if (!w || !w.nazwisko) return;
    const n = w.nazwisko.toLowerCase().trim();
    if (n === 'kościelny' || n === 'koscielny' || n.includes('pokojsk')) return;

    let rItem = rankingMinusyRok.find(it => (it.normName || it.nazwisko || '').toLowerCase().trim() === n);
    if (!rItem) {
      rItem = {
        nazwisko: w.nazwisko,
        normName: n,
        minusy: 0,
        szczegolyMinusow: [],
        grupa: w.grupa,
        pozycja: 1
      };
      rankingMinusyRok.push(rItem);
    }

    const starszeMinusy = (rItem.szczegolyMinusow || []).filter(sm => {
      return sm.miesiac !== curMName && sm.miesiacIdx !== curMIdx;
    });
    const biezaceMinusy = (minusyMiesiacMap[n] && minusyMiesiacMap[n].mins) ? minusyMiesiacMap[n].mins : [];
    rItem.szczegolyMinusow = starszeMinusy.concat(biezaceMinusy);

    let total = 0;
    rItem.szczegolyMinusow.forEach(sm => { total += (sm.punkty || 0); });
    rItem.minusy = total;
  });

  rankingMinusyRok.sort((a, b) => a.minusy - b.minusy);
  let pMR = 1;
  rankingMinusyRok.forEach((m, idx) => {
    if (idx > 0 && m.minusy > rankingMinusyRok[idx - 1].minusy) pMR = idx + 1;
    m.pozycja = pMR;
    m.miejsce = pMR;
  });

  console.log('\n=== Nowy rankingMinusyRok (zaktualizowany o listopad) ===');
  rankingMinusyRok.forEach(m => console.log(`${m.pozycja}. ${m.nazwisko}: ${m.minusy} pkt (${m.szczegolyMinusow.length} minusów)`));

  // Zapis do Firestore
  await patchDoc('stan_grafiku', 'Listopad_2026', {
    rankingMinusyMiesiac: nowyRMM,
    rankingMinusyRok: rankingMinusyRok,
    rankingMinusy: rankingMinusyRok
  }, ['rankingMinusyMiesiac', 'rankingMinusyRok', 'rankingMinusy']);

  console.log('\n✅ Pomyślnie zapisano rankingMinusyMiesiac i rankingMinusyRok w stan_grafiku/Listopad_2026!');
}

run().catch(console.error);
