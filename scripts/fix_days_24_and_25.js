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

function getDoc(col, id) {
  return new Promise((resolve, reject) => {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${encodeURIComponent(col)}/${encodeURIComponent(id)}?key=${API_KEY}`;
    https.get(url, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(d);
          if (json.fields) {
            const out = {};
            for (const k in json.fields) out[k] = fromFirestoreValue(json.fields[k]);
            resolve(out);
          } else {
            resolve(null);
          }
        } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function patchDoc(col, id, payload, fieldPaths) {
  return new Promise((resolve, reject) => {
    const mask = fieldPaths.map(f => 'updateMask.fieldPaths=' + encodeURIComponent(f)).join('&');
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${encodeURIComponent(col)}/${encodeURIComponent(id)}?${mask}&key=${API_KEY}`;
    const parsed = new URL(url);
    const bodyFields = {};
    for (const k of fieldPaths) {
      if (payload[k] !== undefined) bodyFields[k] = toFirestoreValue(payload[k]);
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
      res.on('end', () => resolve(d));
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

function czyToSamoNazwisko(a, b) {
  if (!a || !b) return false;
  const na = a.toLowerCase().trim();
  const nb = b.toLowerCase().trim();
  return na === nb || na.indexOf(nb) !== -1 || nb.indexOf(na) !== -1;
}

async function fix() {
  console.log('1. Fixing obecnosc/M9_25_1000 for Emil Czech...');
  const obec1000 = await getDoc('obecnosc', 'M9_25_1000');
  if (obec1000 && obec1000.ministranci) {
    const emilInObec = obec1000.ministranci.find(m => czyToSamoNazwisko(m.nazwisko, 'Emil Czech'));
    if (emilInObec) {
      console.log('Found Emil Czech in M9_25_1000. Old status:', emilInObec.status, 'pts:', emilInObec.punkty);
      emilInObec.status = 'USPRAWIEDLIWIONY';
      emilInObec.domyslnyStatus = 'USPRAWIEDLIWIONY';
      emilInObec.punkty = 0;
      emilInObec.poprzedniePunktyZTejMszy = 0;
      emilInObec.opisGieldy = 'Zgłoszona nieobecność (0 pkt)';
      await patchDoc('obecnosc', 'M9_25_1000', { ministranci: obec1000.ministranci }, ['ministranci']);
      console.log('[PASS] Updated Emil Czech in obecnosc/M9_25_1000 to USPRAWIEDLIWIONY (0 pkt)');
    }
  }

  const docKeys = ['Pazdziernik_2026', 'Październik_2026'];
  for (const docKey of docKeys) {
    console.log(`\n2. Fixing stan_grafiku/${docKey}...`);
    const stan = await getDoc('stan_grafiku', docKey);
    if (!stan || !stan.wiersze) {
      console.warn('Doc not found:', docKey);
      continue;
    }

    const wiersze = stan.wiersze;

    // Day 24 (idx 23)
    // Maciej Erich: 16:15 (+2), 17:00 (+3) => 5 pkt
    // Mikołaj Erich: 16:15 (+2), 17:00 (+3) => 5 pkt
    // Ksawery Skrzypek: 16:15 (+2), 17:00 (+3) => 5 pkt
    // Rafał Danielczok: 17:00 (0 pkt, usprawiedliwiony) => 0 pkt
    const maciej = wiersze.find(w => czyToSamoNazwisko(w.nazwisko, 'Maciej Erich'));
    if (maciej && maciej.komorki[23]) {
      maciej.komorki[23].liturgie = { '16:15': 2, '17:00': 3 };
      maciej.komorki[23].wartosc = 5;
      maciej.komorki[23].maDyzur = true;
      console.log('Maciej Day 24:', JSON.stringify(maciej.komorki[23]));
    }

    const mikolaj = wiersze.find(w => czyToSamoNazwisko(w.nazwisko, 'Mikołaj Erich'));
    if (mikolaj && mikolaj.komorki[23]) {
      mikolaj.komorki[23].liturgie = { '16:15': 2, '17:00': 3 };
      mikolaj.komorki[23].wartosc = 5;
      mikolaj.komorki[23].maDyzur = true;
      console.log('Mikołaj Day 24:', JSON.stringify(mikolaj.komorki[23]));
    }

    const ksawery = wiersze.find(w => czyToSamoNazwisko(w.nazwisko, 'Ksawery Skrzypek'));
    if (ksawery && ksawery.komorki[23]) {
      ksawery.komorki[23].liturgie = { '16:15': 2, '17:00': 3 };
      ksawery.komorki[23].wartosc = 5;
      ksawery.komorki[23].maDyzur = true;
      console.log('Ksawery Day 24:', JSON.stringify(ksawery.komorki[23]));
    }

    const rafal = wiersze.find(w => czyToSamoNazwisko(w.nazwisko, 'Rafał Danielczok'));
    if (rafal && rafal.komorki[23]) {
      rafal.komorki[23].liturgie = { '17:00': 0 };
      rafal.komorki[23].wartosc = 0;
      rafal.komorki[23].czyUsprawiedliwiony = true;
      rafal.komorki[23].maDyzur = true;
      console.log('Rafał Day 24:', JSON.stringify(rafal.komorki[23]));
    }

    // Day 25 (idx 24)
    // Emil Czech: 10:00 (0 pkt, usprawiedliwiony) => 0 pkt
    const emil = wiersze.find(w => czyToSamoNazwisko(w.nazwisko, 'Emil Czech'));
    if (emil && emil.komorki[24]) {
      emil.komorki[24].liturgie = { '10:00': 0 };
      emil.komorki[24].wartosc = 0;
      emil.komorki[24].czyUsprawiedliwiony = true;
      emil.komorki[24].maDyzur = true;
      console.log('Emil Day 25:', JSON.stringify(emil.komorki[24]));
    }

    // Recalculate sums for each ministrant
    wiersze.forEach(w => {
      if (w.komorki) {
        w.suma = w.komorki.reduce((acc, c) => {
          const v = parseFloat(c.wartosc);
          return acc + (isNaN(v) ? 0 : v);
        }, 0);
        w.suma = Math.round(w.suma * 10) / 10;
      }
    });

    // Recalculate monthly ranking
    const rankingNowy = wiersze
      .filter(w => {
        if (!w || !w.nazwisko) return false;
        const n = w.nazwisko.toLowerCase().trim();
        return n !== 'kościelny' && n !== 'koscielny' && n.indexOf('pokojsk') === -1;
      })
      .map(w => ({
        nazwisko: w.nazwisko,
        punkty: w.suma || 0,
        suma: w.suma || 0,
        grupa: w.grupa
      }))
      .sort((a, b) => {
        if (b.punkty !== a.punkty) return b.punkty - a.punkty;
        return a.nazwisko.localeCompare(b.nazwisko, 'pl');
      });
    let poz = 1;
    rankingNowy.forEach((r, idx) => {
      if (idx > 0 && r.punkty < rankingNowy[idx - 1].punkty) poz = idx + 1;
      r.pozycja = poz;
      r.miejsce = poz;
    });

    // Recalculate annual ranking (rankingRok)
    const rankingRok = stan.rankingRok || [];
    rankingRok.forEach(r => {
      const matchW = wiersze.find(w => czyToSamoNazwisko(w.nazwisko, r.nazwisko));
      const mPts = matchW ? (matchW.suma || 0) : 0;
      let sumPrev = 0;
      let foundM = false;
      const matchRM = rankingNowy.find(rn => czyToSamoNazwisko(rn.nazwisko, r.nazwisko));
      const rnMiejsce = matchRM ? (matchRM.pozycja || matchRM.miejsce) : undefined;
      if (r.punktyPoMiesiacach && Array.isArray(r.punktyPoMiesiacach)) {
        r.punktyPoMiesiacach.forEach(pm => {
          if (pm.miesiac === 'Październik' || pm.miesiacIdx === 9) {
            pm.punkty = mPts;
            if (rnMiejsce) pm.pozycja = rnMiejsce;
            foundM = true;
          } else {
            sumPrev += (pm.punkty || 0);
          }
        });
      }
      if (!foundM && r.punktyPoMiesiacach) {
        r.punktyPoMiesiacach.push({ miesiac: 'Październik', miesiacIdx: 9, rok: 2026, punkty: mPts, pozycja: rnMiejsce });
      }
      r.punkty = Math.round((sumPrev + mPts) * 10) / 10;
      r.suma = r.punkty;
    });
    rankingRok.sort((a, b) => b.punkty - a.punkty);
    let pozRok = 1;
    rankingRok.forEach((r, idx) => {
      if (idx > 0 && r.punkty < rankingRok[idx - 1].punkty) pozRok = idx + 1;
      r.pozycja = pozRok;
      r.miejsce = pozRok;
    });

    // Recalculate monthly minus ranking
    const minusyMiesiacMap = {};
    wiersze.forEach(w => {
      if (!w || !w.nazwisko) return;
      const wNorm = w.nazwisko.toLowerCase().trim();
      const mList = [];
      (w.komorki || []).forEach((k, kIdx) => {
        if (typeof k.wartosc === 'number' && k.wartosc < 0) {
          mList.push({
            dzien: kIdx + 1,
            miesiac: 'Październik',
            miesiacGen: 'października',
            miesiacIdx: 9,
            rok: 2026,
            dzienTygodnia: 'dzień',
            punkty: k.wartosc
          });
        }
      });
      if (mList.length > 0) {
        minusyMiesiacMap[wNorm] = { nazwisko: w.nazwisko, grupa: w.grupa, mins: mList };
      }
    });

    const rankingMinusyMiesiac = [];
    for (const nKey in minusyMiesiacMap) {
      const itemMM = minusyMiesiacMap[nKey];
      const sumMM = itemMM.mins.reduce((acc, x) => acc + x.punkty, 0);
      rankingMinusyMiesiac.push({
        nazwisko: itemMM.nazwisko,
        normName: nKey,
        minusy: sumMM,
        szczegolyMinusow: itemMM.mins,
        grupa: itemMM.grupa,
        pozycja: 1
      });
    }
    rankingMinusyMiesiac.sort((a, b) => a.minusy - b.minusy);
    let pMM = 1;
    rankingMinusyMiesiac.forEach((m, idx) => {
      if (idx > 0 && m.minusy > rankingMinusyMiesiac[idx - 1].minusy) pMM = idx + 1;
      m.pozycja = pMM;
    });

    // Recalculate annual minus ranking
    const rankingMinusyRok = stan.rankingMinusyRok || stan.rankingMinusy || [];
    wiersze.forEach(w => {
      if (!w || !w.nazwisko) return;
      const wNorm = w.nazwisko.toLowerCase().trim();
      let rItem = rankingMinusyRok.find(it => (it.normName || it.nazwisko || '').toLowerCase().trim() === wNorm);
      if (!rItem) {
        rItem = { nazwisko: w.nazwisko, normName: wNorm, minusy: 0, szczegolyMinusow: [], grupa: w.grupa, pozycja: 1 };
        rankingMinusyRok.push(rItem);
      }
      const starszeMinusy = (rItem.szczegolyMinusow || []).filter(sm => sm.miesiac !== 'Październik' && sm.miesiacIdx !== 9);
      const biezaceMinusy = (minusyMiesiacMap[wNorm] && minusyMiesiacMap[wNorm].mins) ? minusyMiesiacMap[wNorm].mins : [];
      rItem.szczegolyMinusow = starszeMinusy.concat(biezaceMinusy);
      rItem.minusy = rItem.szczegolyMinusow.reduce((acc, sm) => acc + (sm.punkty || 0), 0);
    });
    rankingMinusyRok.sort((a, b) => a.minusy - b.minusy);
    let pMR = 1;
    rankingMinusyRok.forEach((m, idx) => {
      if (idx > 0 && m.minusy > rankingMinusyRok[idx - 1].minusy) pMR = idx + 1;
      m.pozycja = pMR;
    });

    await patchDoc('stan_grafiku', docKey, {
      wiersze: wiersze,
      ranking: rankingNowy,
      rankingMiesiac: rankingNowy,
      rankingRok: rankingRok,
      rankingMinusyMiesiac: rankingMinusyMiesiac,
      rankingMinusyRok: rankingMinusyRok,
      rankingMinusy: rankingMinusyRok
    }, ['wiersze', 'ranking', 'rankingMiesiac', 'rankingRok', 'rankingMinusyMiesiac', 'rankingMinusyRok', 'rankingMinusy']);

    console.log(`[PASS] Patched stan_grafiku/${docKey} successfully!`);
  }
  console.log('\nAll data fixed!');
}

fix().catch(console.error);
