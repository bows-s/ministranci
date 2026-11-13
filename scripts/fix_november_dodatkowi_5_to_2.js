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

function obliczSumeLiturgiiKomorki(cell) {
  if (!cell || !cell.liturgie || typeof cell.liturgie !== 'object') return cell ? cell.wartosc : null;
  const keys = Object.keys(cell.liturgie);
  if (keys.length === 0) return null;
  let sum = 0;
  for (const k of keys) {
    const v = parseFloat(cell.liturgie[k]);
    if (!isNaN(v)) sum += v;
  }
  return Math.round(sum * 10) / 10;
}

async function run() {
  // 1. Fix obecnosc docs
  const fixes = [
    { docId: 'M10_11_0900', nazwisko: 'Emil Czech', godzina: '09:00', colIdx: 10 },
    { docId: 'M10_12_1700', nazwisko: 'Emil Czech', godzina: '17:00', colIdx: 11 },
    { docId: 'M10_13_1800', nazwisko: 'Jakub Brytner', godzina: '18:00', colIdx: 12 }
  ];

  for (const f of fixes) {
    const docRaw = await fetchDoc('obecnosc', f.docId);
    if (docRaw && docRaw.fields) {
      const dOb = {};
      for (const k in docRaw.fields) dOb[k] = fromFirestoreValue(docRaw.fields[k]);
      let changed = false;
      (dOb.ministranci || []).forEach(m => {
        if (m.nazwisko === f.nazwisko && m.typ === 'DODATKOWY' && m.status === 'OBECNY') {
          if (m.obecnyPkt !== 2 || m.punkty !== 2) {
            console.log(`[obecnosc/${f.docId}] ${m.nazwisko}: ${m.punkty} -> 2 pkt`);
            m.obecnyPkt = 2;
            m.punkty = 2 + (m.bylNaRozancu ? 2 : 0) - (m.karaPunkty || 0);
            m.opisGieldy = 'Dodatkowa służba (+2 pkt)';
            changed = true;
          }
        }
      });
      if (changed) {
        await patchDoc('obecnosc', f.docId, { ministranci: dOb.ministranci }, ['ministranci']);
        console.log(`✅ Zaktualizowano obecnosc/${f.docId}`);
      }
    }
  }

  // 2. Fix stan_grafiku/Listopad_2026
  const stanRaw = await fetchDoc('stan_grafiku', 'Listopad_2026');
  const stan = {};
  for (const k in stanRaw.fields) stan[k] = fromFirestoreValue(stanRaw.fields[k]);

  const wiersze = stan.wiersze || [];
  let stanChanged = false;

  for (const f of fixes) {
    const w = wiersze.find(r => r.nazwisko === f.nazwisko);
    if (w && w.komorki && w.komorki[f.colIdx]) {
      const cell = w.komorki[f.colIdx];
      if (cell.liturgie && cell.liturgie[f.godzina] !== undefined && cell.liturgie[f.godzina] !== 2) {
        console.log(`[stan_grafiku] ${f.nazwisko} dzień ${f.colIdx + 1} (${f.godzina}): ${cell.liturgie[f.godzina]} -> 2`);
        cell.liturgie[f.godzina] = 2;
        cell.wartosc = obliczSumeLiturgiiKomorki(cell);
        stanChanged = true;
      }
    }
  }

  if (stanChanged) {
    // Recalculate sumy
    const sumyMap = {};
    wiersze.forEach(w => {
      if (w.komorki) {
        w.suma = w.komorki.reduce((acc, c) => {
          const v = parseFloat(c.wartosc);
          return acc + (isNaN(v) ? 0 : v);
        }, 0);
        w.suma = Math.round(w.suma * 10) / 10;
      }
      if (w.nazwisko) {
        sumyMap[w.nazwisko.toLowerCase().trim()] = w.suma || 0;
      }
    });

    // Recalculate rankingMiesiac
    const rNowy = wiersze
      .filter(w => {
        if (!w || !w.nazwisko) return false;
        const n = w.nazwisko.toLowerCase().trim();
        return n !== 'kościelny' && n !== 'koscielny' && !n.includes('pokojsk');
      })
      .map(w => ({
        nazwisko: w.nazwisko,
        punkty: w.suma || 0,
        suma: w.suma || 0,
        grupa: w.grupa
      }))
      .sort((a, b) => (b.punkty !== a.punkty) ? (b.punkty - a.punkty) : a.nazwisko.localeCompare(b.nazwisko, 'pl'));

    let pz = 1;
    rNowy.forEach((r, idx) => {
      if (idx > 0 && r.punkty < rNowy[idx - 1].punkty) pz = idx + 1;
      r.pozycja = pz;
      r.miejsce = pz;
    });

    // Update rankingRok if present
    const rankingRok = Array.isArray(stan.rankingRok) ? stan.rankingRok : [];
    rankingRok.forEach(r => {
      const n = (r.nazwisko || '').toLowerCase().trim();
      if (sumyMap[n] !== undefined) {
        const pmList = r.punktyPoMiesiacach || [];
        let pmNov = pmList.find(pm => pm.miesiac === 'Listopad' || pm.miesiacIdx === 10);
        if (!pmNov) {
          pmNov = { miesiac: 'Listopad', miesiacIdx: 10, punkty: sumyMap[n] };
          pmList.push(pmNov);
        } else {
          pmNov.punkty = sumyMap[n];
        }
        r.punktyPoMiesiacach = pmList;
        const totalRok = pmList.reduce((acc, pm) => acc + (pm.punkty || 0), 0);
        r.punkty = Math.round(totalRok * 10) / 10;
        r.suma = r.punkty;
      }
    });
    rankingRok.sort((a, b) => (b.punkty !== a.punkty) ? (b.punkty - a.punkty) : a.nazwisko.localeCompare(b.nazwisko, 'pl'));
    let pr = 1;
    rankingRok.forEach((r, idx) => {
      if (idx > 0 && r.punkty < rankingRok[idx - 1].punkty) pr = idx + 1;
      r.pozycja = pr;
      r.miejsce = pr;
    });

    await patchDoc('stan_grafiku', 'Listopad_2026', {
      wiersze: wiersze,
      ranking: rNowy,
      rankingMiesiac: rNowy,
      rankingRok: rankingRok
    }, ['wiersze', 'ranking', 'rankingMiesiac', 'rankingRok']);

    console.log('✅ Zaktualizowano stan_grafiku/Listopad_2026!');
    console.log('Emil Czech nowa suma:', sumyMap['emil czech']);
    console.log('Jakub Brytner nowa suma:', sumyMap['jakub brytner']);
  } else {
    console.log('Brak zmian w stan_grafiku/Listopad_2026.');
  }
}

run().catch(console.error);
