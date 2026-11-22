const https = require('https');

const API_KEY = 'AIzaSyAsgkKWXr-L3fDHQODxioVssvIGL9SQePk';
const PROJECT_ID = 'makole-85f32';

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: val.toString() };
    return { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === 'object') {
    const fields = {};
    for (const k in val) {
      if (Object.prototype.hasOwnProperty.call(val, k)) {
        fields[k] = toFirestoreValue(val[k]);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

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

function getDoc(col, id) {
  return new Promise((resolve, reject) => {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${encodeURIComponent(col)}/${encodeURIComponent(id)}?key=${API_KEY}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`GET ${col}/${id} -> HTTP ${res.statusCode}: ${data}`));
        }
        try {
          const json = JSON.parse(data);
          const out = {};
          const fields = json.fields || {};
          for (const k in fields) out[k] = fromFirestoreValue(fields[k]);
          resolve(out);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function patchDoc(col, id, payload, fieldPaths) {
  return new Promise((resolve, reject) => {
    const mask = (fieldPaths && fieldPaths.length)
      ? fieldPaths.map(f => 'updateMask.fieldPaths=' + encodeURIComponent(f)).join('&') + '&'
      : '';
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${encodeURIComponent(col)}/${encodeURIComponent(id)}?${mask}key=${API_KEY}`;
    const parsed = new URL(url);
    const bodyFields = {};
    const keys = (fieldPaths && fieldPaths.length) ? fieldPaths : Object.keys(payload);
    for (const k of keys) {
      if (Object.prototype.hasOwnProperty.call(payload, k)) {
        bodyFields[k] = toFirestoreValue(payload[k]);
      }
    }
    const bodyStr = JSON.stringify({ fields: bodyFields });

    const req = https.request({
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname + parsed.search,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`PATCH ${col}/${id} -> HTTP ${res.statusCode}: ${d}`));
        }
        resolve(JSON.parse(d));
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

function normName(s) {
  return String(s || '').toLowerCase().trim()
    .replace(/ł/g, 'l').replace(/ą/g, 'a').replace(/ę/g, 'e')
    .replace(/ś/g, 's').replace(/ć/g, 'c').replace(/ż/g, 'z')
    .replace(/ź/g, 'z').replace(/ń/g, 'n').replace(/ó/g, 'o');
}

function sumCellLiturgie(cell) {
  if (!cell || !cell.liturgie) return cell ? cell.wartosc : null;
  let sum = 0;
  for (const k of Object.keys(cell.liturgie)) {
    const v = cell.liturgie[k];
    const n = typeof v === 'number' ? v : parseFloat(v);
    if (!isNaN(n)) sum += n;
  }
  return sum;
}

async function run() {
  const obUpdates = [
    { docId: 'M10_22_0830', hour: '08:30' },
    { docId: 'M10_22_1000', hour: '10:00' }
  ];

  // Mapa korekt liturgie[hour] dla kazdego ministranta
  const cellPatches = {}; // normName -> { hour -> newPkt }

  for (const item of obUpdates) {
    console.log(`Pobieranie obecnosc/${item.docId}...`);
    const doc = await getDoc('obecnosc', item.docId);
    let changed = false;

    for (const m of (doc.ministranci || [])) {
      if (m.status !== 'OBECNY') continue;
      if (m.typ === 'DOMYSLNY' && m.punkty === 5) {
        console.log(`  [${item.docId}] ${m.nazwisko} (DOMYSLNY): 5 -> 3`);
        m.punkty = 3;
        m.obecnyPkt = 3;
        changed = true;
        const nk = normName(m.nazwisko);
        if (!cellPatches[nk]) cellPatches[nk] = {};
        cellPatches[nk][item.hour] = 3;
      } else if (m.typ === 'DODATKOWY' && m.punkty === 5) {
        console.log(`  [${item.docId}] ${m.nazwisko} (DODATKOWY): 5 -> 1`);
        m.punkty = 1;
        m.obecnyPkt = 1;
        m.opisGieldy = 'Dodatkowa służba (+1 pkt)';
        changed = true;
        const nk = normName(m.nazwisko);
        if (!cellPatches[nk]) cellPatches[nk] = {};
        cellPatches[nk][item.hour] = 1;
      }
    }

    if (changed) {
      await patchDoc('obecnosc', item.docId, { ministranci: doc.ministranci }, ['ministranci']);
      console.log(`  Zapisano obecnosc/${item.docId}.`);
    } else {
      console.log(`  Brak zmian w obecnosc/${item.docId}.`);
    }
  }

  // Aktualizacja stan_grafiku/Listopad_2026
  console.log('\nPobieranie stan_grafiku/Listopad_2026...');
  const listDoc = await getDoc('stan_grafiku', 'Listopad_2026');
  const colIdx = 21; // 22 listopada
  const deltas = {}; // normName -> delta (newSuma - oldSuma)

  for (const w of (listDoc.wiersze || [])) {
    const nk = normName(w.nazwisko);
    if (!cellPatches[nk]) continue;
    const cell = w.komorki && w.komorki[colIdx];
    if (!cell) continue;
    const oldSuma = typeof w.suma === 'number' ? w.suma : 0;
    const oldVal = cell.wartosc;

    if (!cell.liturgie) cell.liturgie = {};
    for (const h of Object.keys(cellPatches[nk])) {
      cell.liturgie[h] = cellPatches[nk][h];
    }
    cell.wartosc = sumCellLiturgie(cell);

    let newSuma = 0;
    for (const k of (w.komorki || [])) {
      if (k && typeof k.wartosc === 'number' && !isNaN(k.wartosc)) {
        newSuma += k.wartosc;
      }
    }
    w.suma = newSuma;
    deltas[nk] = newSuma - oldSuma;
    console.log(`  ${w.nazwisko}: dzien 22 (${oldVal} -> ${cell.wartosc}), suma (${oldSuma} -> ${newSuma}, delta=${deltas[nk]})`);
  }

  // Przelicz ranking i rankingMiesiac z wierszy
  const activeRows = (listDoc.wiersze || []).filter(w => {
    const n = (w.nazwisko || '').toLowerCase();
    return n && n !== 'kościelny' && n !== 'koscielny' && !n.includes('proboszcz');
  });

  const sortedM = activeRows.map(w => ({
    nazwisko: w.nazwisko,
    suma: typeof w.suma === 'number' ? w.suma : 0,
    grupa: w.grupa || ''
  })).sort((a, b) => b.suma - a.suma || a.nazwisko.localeCompare(b.nazwisko, 'pl'));

  let pos = 1;
  const newRanking = sortedM.map((item, idx) => {
    if (idx > 0 && item.suma < sortedM[idx - 1].suma) pos = idx + 1;
    return { nazwisko: item.nazwisko, suma: item.suma, miejsce: pos, grupa: item.grupa };
  });

  pos = 1;
  const newRankingMiesiac = sortedM.map((item, idx) => {
    if (idx > 0 && item.suma < sortedM[idx - 1].suma) pos = idx + 1;
    return { nazwisko: item.nazwisko, punkty: item.suma, pozycja: pos, grupa: item.grupa };
  });

  // Zaktualizuj rankingRok o delty
  const newRankingRok = (listDoc.rankingRok || []).map(r => {
    const nk = normName(r.nazwisko);
    const d = deltas[nk] || 0;
    const oldP = typeof r.punkty === 'number' ? r.punkty : (typeof r.suma === 'number' ? r.suma : 0);
    const updated = { ...r, punkty: oldP + d };
    if (typeof updated.suma === 'number') updated.suma = oldP + d;
    if (Array.isArray(updated.punktyPoMiesiacach)) {
      updated.punktyPoMiesiacach = updated.punktyPoMiesiacach.map(pm => {
        if (pm && pm.miesiac && pm.miesiac.toLowerCase().includes('listopad')) {
          const wMatch = activeRows.find(w => normName(w.nazwisko) === nk);
          if (wMatch) return { ...pm, punkty: wMatch.suma };
        }
        return pm;
      });
    }
    return updated;
  }).sort((a, b) => (b.punkty || 0) - (a.punkty || 0));

  let posR = 1;
  newRankingRok.forEach((r, idx) => {
    if (idx > 0 && (r.punkty || 0) < (newRankingRok[idx - 1].punkty || 0)) posR = idx + 1;
    r.pozycja = posR;
    if (r.miejsce !== undefined) r.miejsce = posR;
  });

  await patchDoc('stan_grafiku', 'Listopad_2026', {
    wiersze: listDoc.wiersze,
    ranking: newRanking,
    rankingMiesiac: newRankingMiesiac,
    rankingRok: newRankingRok
  }, ['wiersze', 'ranking', 'rankingMiesiac', 'rankingRok']);
  console.log('Zapisano stan_grafiku/Listopad_2026!');

  // Weryfikacja
  console.log('\n=== WERYFIKACJA PO ZAPISIE ===');
  const vList = await getDoc('stan_grafiku', 'Listopad_2026');
  for (const w of (vList.wiersze || [])) {
    const c = w.komorki && w.komorki[21];
    if (c && c.wartosc !== null && c.wartosc !== undefined) {
      console.log(`  ${w.nazwisko}: dzien 22 = ${c.wartosc} (${JSON.stringify(c.liturgie)}), suma = ${w.suma}`);
    }
  }
}

run().catch(err => {
  console.error('BLAD:', err);
  process.exit(1);
});
