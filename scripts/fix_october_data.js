const apiKey = 'AIzaSyAsgkKWXr-L3fDHQODxioVssvIGL9SQePk';
const baseUrl = 'https://firestore.googleapis.com/v1/projects/makole-85f32/databases/(default)/documents';

function fromFirestore(fields) {
  if (!fields) return {};
  const res = {};
  for (const k in fields) {
    const v = fields[k];
    if ('stringValue' in v) res[k] = v.stringValue;
    else if ('integerValue' in v) res[k] = parseInt(v.integerValue);
    else if ('doubleValue' in v) res[k] = parseFloat(v.doubleValue);
    else if ('booleanValue' in v) res[k] = v.booleanValue;
    else if ('nullValue' in v) res[k] = null;
    else if ('mapValue' in v) res[k] = fromFirestore(v.mapValue.fields || {});
    else if ('arrayValue' in v) {
      res[k] = (v.arrayValue.values || []).map(item => {
        if ('stringValue' in item) return item.stringValue;
        if ('integerValue' in item) return parseInt(item.integerValue);
        if ('doubleValue' in item) return parseFloat(item.doubleValue);
        if ('booleanValue' in item) return item.booleanValue;
        if ('nullValue' in item) return null;
        if ('mapValue' in item) return fromFirestore(item.mapValue.fields || {});
        return null;
      });
    }
  }
  return res;
}

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: val.toString() };
    return { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    if (val.length === 0) return { arrayValue: {} };
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const k of Object.keys(val)) {
      fields[k] = toFirestoreValue(val[k]);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

async function getDoc(path) {
  const url = `${baseUrl}/${path}?key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return fromFirestore(json.fields);
}

async function patchDoc(path, obj) {
  const url = `${baseUrl}/${path}?key=${apiKey}`;
  const fields = {};
  for (const k of Object.keys(obj)) {
    fields[k] = toFirestoreValue(obj[k]);
  }
  const body = JSON.stringify({ fields });
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body
  });
  if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status} ${await res.text()}`);
  return await res.json();
}

async function run() {
  console.log('--- 1. Fetching stan_grafiku/Październik_2026 ---');
  const stan = await getDoc('stan_grafiku/Pa%C5%BAdziernik_2026');

  console.log('--- 2. Updating wiersze for Day 3 and Day 11 ---');
  const wiersze = stan.wiersze || [];
  for (const w of wiersze) {
    const name = (w.nazwisko || '').toLowerCase().trim();

    if (name.includes('maciej erich')) {
      console.log('Updating Maciej Erich: Day 3 = 9');
      w.komorki[2].wartosc = 9;
      w.komorki[2].maDyzur = true;
      w.komorki[2].bg = '';
    } else if (name.includes('michał kupiec') || name.includes('michal kupiec')) {
      console.log('Updating Michał Kupiec: Day 11 = 3');
      w.komorki[10].wartosc = 3;
      w.komorki[10].maDyzur = true;
      w.komorki[10].bg = '';
    } else if (name.includes('jakub brytner')) {
      console.log('Updating Jakub Brytner: Day 11 = 3');
      w.komorki[10].wartosc = 3;
      w.komorki[10].maDyzur = true;
      w.komorki[10].bg = '';
    } else if (name.includes('paweł głaz') || name.includes('pawel glaz')) {
      console.log('Updating Paweł Głaz: Day 11 = -5');
      w.komorki[10].wartosc = -5;
      w.komorki[10].maDyzur = true;
      w.komorki[10].bg = '';
    } else if (name.includes('franek kik')) {
      console.log('Updating Franek Kik: Day 11 = 6 (3 msza + 3 nabożeństwo)');
      w.komorki[10].wartosc = 6;
      w.komorki[10].maDyzur = true;
      w.komorki[10].bg = '';
    } else if (name.includes('marcel mazurkiewicz')) {
      console.log('Updating Marcel Mazurkiewicz: Day 11 = -4 (-5 nieobecność + 1 dodatkowa)');
      w.komorki[10].wartosc = -4;
      w.komorki[10].maDyzur = true;
      w.komorki[10].bg = '';
    }

    // Przelicz sumę dla wiersza:
    w.suma = (w.komorki || []).reduce((acc, k) => acc + (typeof k.wartosc === 'number' ? k.wartosc : 0), 0);
    console.log(`  ${w.nazwisko}: suma = ${w.suma}`);
  }

  console.log('--- 3. Recalculating monthly and yearly rankings ---');
  // Ranking miesięczny:
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
  stan.ranking = rankingNowy;
  stan.rankingMiesiac = rankingNowy;

  // Ranking roczny:
  if (stan.rankingRok && Array.isArray(stan.rankingRok)) {
    const curMName = stan.nazwaMiesiaca || 'Październik';
    const curMIdx = (stan.miesiacIdx !== undefined) ? stan.miesiacIdx : 9;
    const curRok = stan.rok || 2026;

    stan.rankingRok.forEach(r => {
      const rNorm = (r.nazwisko || '').toLowerCase().trim();
      const matchW = wiersze.find(w => {
        const nw = (w.nazwisko || '').toLowerCase().trim();
        return nw === rNorm || nw.includes(rNorm) || rNorm.includes(nw);
      });
      const mPts = matchW ? (matchW.suma || 0) : 0;
      let sumPrev = 0;
      let foundM = false;

      if (r.punktyPoMiesiacach && Array.isArray(r.punktyPoMiesiacach)) {
        r.punktyPoMiesiacach.forEach(pm => {
          if (pm.miesiac === curMName || pm.miesiacIdx === curMIdx) {
            pm.punkty = mPts;
            foundM = true;
          } else {
            sumPrev += (pm.punkty || 0);
          }
        });
      }
      if (!foundM && r.punktyPoMiesiacach) {
        r.punktyPoMiesiacach.push({ miesiac: curMName, miesiacIdx: curMIdx, rok: curRok, punkty: mPts });
      }
      r.punkty = Math.round((sumPrev + mPts) * 10) / 10;
      r.suma = r.punkty;
    });

    stan.rankingRok.sort((a, b) => b.punkty - a.punkty);
    let pozRok = 1;
    stan.rankingRok.forEach((r, idx) => {
      if (idx > 0 && r.punkty < stan.rankingRok[idx - 1].punkty) pozRok = idx + 1;
      r.pozycja = pozRok;
      r.miejsce = pozRok;
    });
  }

  // Minusy:
  const curMNameZ = stan.nazwaMiesiaca || 'Październik';
  const curMIdxZ = (stan.miesiacIdx !== undefined) ? stan.miesiacIdx : 9;
  const curRokZ = stan.rok || 2026;
  const dniNazwyMinusZ = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
  const polishMonthsGenMinusZ = [
    'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
    'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'
  ];
  const mGenMinusZ = polishMonthsGenMinusZ[curMIdxZ] || 'października';

  const minusyMiesiacMapZ = {};
  wiersze.forEach(w => {
    if (!w || !w.nazwisko) return;
    const wNorm = w.nazwisko.toLowerCase().trim();
    const mList = [];
    (w.komorki || []).forEach((k, kIdx) => {
      if (typeof k.wartosc === 'number' && k.wartosc < 0) {
        const dtM = new Date(curRokZ, curMIdxZ, kIdx + 1);
        mList.push({
          dzien: kIdx + 1,
          miesiac: curMNameZ,
          miesiacGen: mGenMinusZ,
          miesiacIdx: curMIdxZ,
          rok: curRokZ,
          dzienTygodnia: dniNazwyMinusZ[dtM.getDay()],
          punkty: k.wartosc
        });
      }
    });
    if (mList.length > 0) {
      minusyMiesiacMapZ[wNorm] = { nazwisko: w.nazwisko, grupa: w.grupa, mins: mList };
    }
  });

  const nowyRMM = [];
  for (const nKey in minusyMiesiacMapZ) {
    const itemMM = minusyMiesiacMapZ[nKey];
    const sumMinMM = itemMM.mins.reduce((acc, it) => acc + it.punkty, 0);
    nowyRMM.push({
      nazwisko: itemMM.nazwisko,
      grupa: itemMM.grupa,
      punkty: sumMinMM,
      suma: sumMinMM,
      szczegolyMinusow: itemMM.mins
    });
  }
  nowyRMM.sort((a, b) => a.punkty - b.punkty);
  let pozMM = 1;
  nowyRMM.forEach((r, idx) => {
    if (idx > 0 && r.punkty > nowyRMM[idx - 1].punkty) pozMM = idx + 1;
    r.pozycja = pozMM;
    r.miejsce = pozMM;
  });
  stan.rankingMinusyMiesiac = nowyRMM;

  stan.zaktualizowano = new Date().toISOString();

  console.log('--- 4. Saving stan_grafiku/Październik_2026 ---');
  await patchDoc('stan_grafiku/Pa%C5%BAdziernik_2026', stan);
  console.log('stan_grafiku updated successfully!');

  console.log('--- 5. Updating obecnosc/M9_11_0830 ---');
  const doc0830 = await getDoc('obecnosc/M9_11_0830');
  doc0830.ministranci = [
    {
      nazwisko: 'Michał Kupiec',
      normName: 'michał kupiec',
      grupa: 'III GRUPA (ZIELONA)',
      stopien: 'Lektor',
      stopienRanga: 4,
      status: 'OBECNY',
      domyslnyStatus: 'OBECNY',
      typ: 'DOMYSLNY',
      punkty: 3,
      obecnyPkt: 3,
      poprzedniePunktyZTejMszy: 3,
      funkcja: null,
      strona: null,
      zastepuje: null,
      opisGieldy: '',
      poprzedniaWartosc: null
    },
    {
      nazwisko: 'Paweł Głaz',
      normName: 'paweł głaz',
      grupa: 'III GRUPA (ZIELONA)',
      stopien: 'Kandydat',
      stopienRanga: 1,
      status: 'NIEOBECNY',
      domyslnyStatus: 'OBECNY',
      typ: 'DOMYSLNY',
      punkty: -5,
      obecnyPkt: 3,
      poprzedniePunktyZTejMszy: -5,
      funkcja: null,
      strona: null,
      zastepuje: null,
      opisGieldy: '',
      bylNaRozancu: false,
      tylkoRozaniec: false,
      poprzedniaWartosc: null
    },
    {
      nazwisko: 'Jakub Brytner',
      normName: 'jakub brytner',
      grupa: 'III GRUPA (ZIELONA)',
      stopien: 'Młodszy ministrant',
      stopienRanga: 2,
      status: 'OBECNY',
      domyslnyStatus: 'OBECNY',
      typ: 'DOMYSLNY',
      punkty: 3,
      obecnyPkt: 3,
      poprzedniePunktyZTejMszy: 3,
      funkcja: null,
      strona: null,
      zastepuje: null,
      opisGieldy: '',
      poprzedniaWartosc: null
    },
    {
      nazwisko: 'Franek Kik',
      normName: 'franek kik',
      grupa: 'III GRUPA (ZIELONA)',
      stopien: 'Kandydat',
      stopienRanga: 1,
      status: 'OBECNY',
      domyslnyStatus: 'OBECNY',
      typ: 'DOMYSLNY',
      punkty: 3,
      obecnyPkt: 3,
      poprzedniePunktyZTejMszy: 3,
      funkcja: null,
      strona: null,
      zastepuje: null,
      opisGieldy: '',
      poprzedniaWartosc: null
    },
    {
      nazwisko: 'Marcel Mazurkiewicz',
      normName: 'marcel mazurkiewicz',
      grupa: 'Służy dodatkowo',
      stopien: 'Młodszy ministrant',
      stopienRanga: 2,
      status: 'OBECNY',
      domyslnyStatus: 'OBECNY',
      typ: 'DODATKOWY',
      punkty: 1,
      obecnyPkt: 1,
      poprzedniePunktyZTejMszy: 1,
      funkcja: null,
      strona: null,
      zastepuje: null,
      poprzedniaWartosc: null
    }
  ];
  doc0830.zapisano = new Date().toISOString();
  await patchDoc('obecnosc/M9_11_0830', doc0830);
  console.log('obecnosc/M9_11_0830 updated successfully!');

  console.log('--- 6. Updating obecnosc/M9_03_1700 ---');
  const doc1700 = await getDoc('obecnosc/M9_03_1700');
  for (const m of doc1700.ministranci || []) {
    if (m.nazwisko && m.nazwisko.toLowerCase().includes('maciej erich')) {
      m.poprzedniaWartosc = 6;
      m.punkty = 3;
      m.poprzedniePunktyZTejMszy = 3;
    }
  }
  doc1700.zapisano = new Date().toISOString();
  await patchDoc('obecnosc/M9_03_1700', doc1700);
  console.log('obecnosc/M9_03_1700 updated successfully!');

  console.log('ALL UPDATES COMPLETE!');
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
