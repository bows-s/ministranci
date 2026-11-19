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

function formatMateuszDays(row, rok, mIdx) {
  const dn = ['Nd', 'Pn', 'Wt', 'Sr', 'Cz', 'Pt', 'Sb'];
  return (row.komorki || []).map((c, idx) => {
    const d = idx + 1;
    const dow = new Date(rok, mIdx, d).getDay();
    if (c && (c.maDyzur || (c.wartosc !== null && c.wartosc !== undefined && c.wartosc !== ''))) {
      return `${d}(${dn[dow]}):dyz=${!!c.maDyzur},val=${c.wartosc}`;
    }
    return null;
  }).filter(Boolean).join(' | ');
}

function findMateuszRow(data) {
  return (data.wiersze || []).find(w => w && w.nazwisko && w.nazwisko.toLowerCase().includes('pierścieński'));
}

async function run() {
  // 1. konfiguracja/stale_dni
  console.log('1. Pobieranie konfiguracja/stale_dni...');
  const staleDni = await getDoc('konfiguracja', 'stale_dni');
  const prevLastChange = (staleDni['Mateusz Pierścieński'] && staleDni['Mateusz Pierścieński'].ostatniaZmiana) || '2026-11-17T21:21:38.321Z';
  staleDni['Mateusz Pierścieński'] = {
    stalyDzien: 1,
    nazwaDnia: 'Poniedziałek',
    godzinaDnia: 'godz. 18:00',
    ostatniaZmiana: prevLastChange,
    zmienionoPrzez: 'Admin'
  };
  await patchDoc('konfiguracja', 'stale_dni', staleDni, null);
  console.log('   Zapisano konfiguracja/stale_dni.');

  // 2. stan_grafiku/Listopad_2026 (od przyszlego tygodnia d >= 23, bez ruszania przeszlych dni i -5)
  console.log('2. Pobieranie stan_grafiku/Listopad_2026...');
  const listDoc = await getDoc('stan_grafiku', 'Listopad_2026');
  const mListRow = findMateuszRow(listDoc);
  if (!mListRow) throw new Error('Brak wiersza Mateusz Pierścieński w Listopad_2026!');

  const dzisCell = mListRow.komorki && mListRow.komorki[18]; // 19 listopada (czwartek)
  if (!dzisCell || dzisCell.wartosc !== -5 || dzisCell.maDyzur !== true) {
    throw new Error(`Nieoczekiwany stan komorki[18] (19 listopada): ${JSON.stringify(dzisCell)}`);
  }
  if (mListRow.suma !== -13) {
    throw new Error(`Nieoczekiwana suma w Listopad_2026: ${mListRow.suma}`);
  }

  // Sprawdz czy sa oferty gieldowe w dniach 23..30 dla Mateusza
  const futureOffers = []
    .concat(listDoc.gieldaTydzien || [], listDoc.zamianyZastepstwa || [], listDoc.wolneZastepstwa || [])
    .filter(o => {
      if (!o || !JSON.stringify(o).toLowerCase().includes('pier')) return false;
      const d = parseInt(o.dzienOddawany !== undefined ? o.dzienOddawany : o.dzien, 10);
      return !isNaN(d) && d >= 23;
    });
  if (futureOffers.length > 0) {
    throw new Error(`Wykryto oferty gieldowe dla dni >= 23: ${JSON.stringify(futureOffers)}`);
  }

  mListRow.stalyDzienTygodnia = 1;
  mListRow.ostatniaZmianaDnia = mListRow.ostatniaZmianaDnia || prevLastChange;
  for (let d = 23; d <= mListRow.komorki.length; d++) {
    const dow = new Date(2026, 10, d).getDay();
    const cell = mListRow.komorki[d - 1];
    if (dow >= 1 && dow <= 5 && cell && (cell.wartosc === null || cell.wartosc === undefined || cell.wartosc === '')) {
      cell.maDyzur = (dow === 1);
    }
  }
  await patchDoc('stan_grafiku', 'Listopad_2026', { wiersze: listDoc.wiersze }, ['wiersze']);
  console.log('   Zapisano stan_grafiku/Listopad_2026 (updateMask=wiersze).');

  // 3. stan_grafiku/Grudzień_2026 oraz stan_grafiku/Grudzien_2026
  for (const grudId of ['Grudzień_2026', 'Grudzien_2026']) {
    console.log(`3. Pobieranie stan_grafiku/${grudId}...`);
    const grudDoc = await getDoc('stan_grafiku', grudId);
    const mGrudRow = findMateuszRow(grudDoc);
    if (!mGrudRow) throw new Error(`Brak wiersza Mateusz Pierścieński w ${grudId}!`);

    mGrudRow.stalyDzienTygodnia = 1;
    mGrudRow.ostatniaZmianaDnia = prevLastChange;
    for (let d = 1; d <= mGrudRow.komorki.length; d++) {
      const dow = new Date(2026, 11, d).getDay();
      const cell = mGrudRow.komorki[d - 1];
      if (dow >= 1 && dow <= 5 && cell && (cell.wartosc === null || cell.wartosc === undefined || cell.wartosc === '')) {
        cell.maDyzur = (dow === 1);
      }
    }
    await patchDoc('stan_grafiku', grudId, { wiersze: grudDoc.wiersze }, ['wiersze']);
    console.log(`   Zapisano stan_grafiku/${grudId} (updateMask=wiersze).`);
  }

  // 4. Weryfikacja po zapisie
  console.log('\n=== WERYFIKACJA PO ZAPISIE ===');
  const vStale = await getDoc('konfiguracja', 'stale_dni');
  console.log('konfiguracja/stale_dni:', JSON.stringify(vStale, null, 2));
  if (!vStale['Maks Erich'] || !vStale['Mikołaj Erich'] || !vStale['Mateusz Pierścieński'] || vStale['Mateusz Pierścieński'].stalyDzien !== 1) {
    throw new Error('Weryfikacja konfiguracja/stale_dni nie powiodla sie!');
  }

  const vList = await getDoc('stan_grafiku', 'Listopad_2026');
  const vmList = findMateuszRow(vList);
  console.log(`Listopad_2026 -> staly=${vmList.stalyDzienTygodnia}, suma=${vmList.suma}`);
  console.log('Listopad_2026 days:', formatMateuszDays(vmList, 2026, 10));
  if (vmList.stalyDzienTygodnia !== 1 || vmList.suma !== -13 || vmList.komorki[18].wartosc !== -5 || !vmList.komorki[22].maDyzur || vmList.komorki[25].maDyzur || !vmList.komorki[29].maDyzur) {
    throw new Error('Weryfikacja stan_grafiku/Listopad_2026 nie powiodla sie!');
  }

  for (const grudId of ['Grudzień_2026', 'Grudzien_2026']) {
    const vGrud = await getDoc('stan_grafiku', grudId);
    const vmGrud = findMateuszRow(vGrud);
    console.log(`${grudId} -> staly=${vmGrud.stalyDzienTygodnia}, suma=${vmGrud.suma}`);
    console.log(`${grudId} days:`, formatMateuszDays(vmGrud, 2026, 11));
    if (vmGrud.stalyDzienTygodnia !== 1 || !vmGrud.komorki[6].maDyzur || !vmGrud.komorki[13].maDyzur || !vmGrud.komorki[20].maDyzur || !vmGrud.komorki[27].maDyzur || vmGrud.komorki[3].maDyzur || vmGrud.komorki[10].maDyzur || vmGrud.komorki[17].maDyzur || vmGrud.komorki[24].maDyzur) {
      throw new Error(`Weryfikacja stan_grafiku/${grudId} nie powiodla sie!`);
    }
  }

  console.log('\nWSZYSTKIE AKTUALIZACJE I WERYFIKACJE ZAKONCZONE SUKCESEM!');
}

run().catch(err => {
  console.error('BLAD:', err);
  process.exit(1);
});
