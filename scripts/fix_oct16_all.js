const https = require('https');
const API_KEY = "AIzaSyAsgkKWXr-L3fDHQODxioVssvIGL9SQePk";
const PROJECT_ID = "makole-85f32";

function normName(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ł/g, 'l')
    .replace(/ą/g, 'a')
    .replace(/ę/g, 'e')
    .replace(/ś/g, 's')
    .replace(/ć/g, 'c')
    .replace(/ż/g, 'z')
    .replace(/ź/g, 'z')
    .replace(/ń/g, 'n')
    .replace(/ó/g, 'o')
    .replace(/\s+/g, ' ')
    .trim();
}

function czyDokladnieTenSamMinistrant(a, b) {
  const na = normName(a);
  const nb = normName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const ta = na.split(' ');
  const tb = nb.split(' ');
  if (ta.length >= 2 && tb.length >= 2) {
    return ta[0] === tb[0] && ta[ta.length - 1] === tb[tb.length - 1];
  }
  return false;
}

function fromFirestoreValue(val) {
  if (!val) return null;
  if ('nullValue' in val) return null;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return parseFloat(val.doubleValue);
  if ('stringValue' in val) return val.stringValue;
  if ('timestampValue' in val) return val.timestampValue;
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

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function saveDoc(docName, dataObj) {
  return new Promise((resolve, reject) => {
    const fields = {};
    for (const k in dataObj) {
      if (dataObj[k] !== undefined) {
        fields[k] = toFirestoreValue(dataObj[k]);
      }
    }
    const body = JSON.stringify({ fields: fields });
    const options = {
      hostname: 'firestore.googleapis.com',
      path: '/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/stan_grafiku/' + encodeURIComponent(docName) + '?key=' + API_KEY,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) reject(new Error(JSON.stringify(json.error)));
          else resolve(json);
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function runRepair() {
  console.log("1. Pobieranie stan_grafiku/Październik_2026 oraz obecnosc...");
  const urlStan = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/stan_grafiku/' + encodeURIComponent('Październik_2026') + '?key=' + API_KEY;
  const jsonStan = await fetchJson(urlStan);
  const fieldsStan = jsonStan.fields || {};
  const stan = {};
  for (const k in fieldsStan) stan[k] = fromFirestoreValue(fieldsStan[k]);

  let allObecDocs = [];
  let pageToken = '';
  while (true) {
    const urlObec = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/obecnosc?pageSize=200' + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : '') + '&key=' + API_KEY;
    const jsonObec = await fetchJson(urlObec);
    if (jsonObec.documents) allObecDocs = allObecDocs.concat(jsonObec.documents);
    if (jsonObec.nextPageToken) pageToken = jsonObec.nextPageToken;
    else break;
  }

  const docs = allObecDocs.filter(d => d.name.split('/').pop().startsWith('M9_'));
  const obecnosci = [];
  for (const d of docs) {
    const fields = d.fields || {};
    const obj = { _id: d.name.split('/').pop() };
    for (const k in fields) obj[k] = fromFirestoreValue(fields[k]);
    obecnosci.push(obj);
  }

  obecnosci.sort((a, b) => {
    if (a.dzien !== b.dzien) return a.dzien - b.dzien;
    return (a.godzina || '').localeCompare(b.godzina || '');
  });

  console.log(`Pobrano ${obecnosci.length} dokumentów obecnosc M9_*.`);

  // Build attendance lookup: day -> map of exact row.nazwisko -> { [godzina]: points }
  const attLookup = {};
  for (let d = 1; d <= 31; d++) attLookup[d] = {};

  obecnosci.forEach(o => {
    const d = Number(o.dzien);
    const g = String(o.godzina || '').trim();
    (o.ministranci || []).forEach(m => {
      const row = stan.wiersze.find(w => czyDokladnieTenSamMinistrant(w.nazwisko, m.nazwisko));
      if (!row) {
        console.warn(`UWAGA: Nie znaleziono wiersza dla "${m.nazwisko}" w dniu ${d}`);
        return;
      }
      const rName = row.nazwisko;
      attLookup[d][rName] = attLookup[d][rName] || {};

      let pkt = (typeof m.punkty === 'number') ? m.punkty : (m.obecnyPkt || 5);
      if (m.bylNaRozancu && typeof m.punkty !== 'number') {
        pkt += 2;
      }
      if (m.status === 'NIEOBECNY') {
        pkt = (o.rodzajLiturgii === 'nabozenstwo' || m.typ === 'DODATKOWY') ? 0 : -5;
      } else if (m.status === 'ODDANY') {
        pkt = 1;
      } else if (m.status === 'USPRAWIEDLIWIONY') {
        pkt = 0;
      }

      if (!(m.status === 'NIEOBECNY' && (o.rodzajLiturgii === 'nabozenstwo' || m.typ === 'DODATKOWY'))) {
        if (m.bylNaRozancu && typeof m.punkty !== 'number') {
          attLookup[d][rName]['17:15'] = 2;
          attLookup[d][rName][g] = (m.obecnyPkt || 5);
        } else {
          attLookup[d][rName][g] = pkt;
        }
      }

      if (m.typ === 'ZASTEPCA' && m.zastepuje && m.status === 'OBECNY') {
        const oddRow = stan.wiersze.find(w => czyDokladnieTenSamMinistrant(w.nazwisko, m.zastepuje));
        if (oddRow) {
          attLookup[d][oddRow.nazwisko] = attLookup[d][oddRow.nazwisko] || {};
          attLookup[d][oddRow.nazwisko][g] = 1;
        }
      }
    });
  });

  // Apply to cells in stan.wiersze
  stan.wiersze.forEach(w => {
    for (let d = 1; d <= 31; d++) {
      const cell = w.komorki[d - 1];
      const attDay = (attLookup[d] && attLookup[d][w.nazwisko]) ? attLookup[d][w.nazwisko] : null;

      let litMap = {};
      if (attDay && Object.keys(attDay).length > 0) {
        if (w.nazwisko === 'Wiktor Kowalski' && d === 4) {
          litMap = { '10:00': 1 };
        } else if (w.nazwisko === 'Ksawery Skrzypek' && d === 3) {
          litMap = { '17:00': 3 };
        } else {
          litMap = Object.assign({}, attDay);
        }
      } else if (d <= 15) {
        // For days 1..15, if there was an earlier manual/duty entry NOT on D14/D15 phantom Maks Erich:
        if (w.nazwisko === 'Maks Erich' && (d === 14 || d === 15)) {
          litMap = {};
          cell.wartosc = null;
        } else if (typeof cell.wartosc === 'number') {
          litMap = (cell.liturgie && Object.keys(cell.liturgie).length > 0) ? Object.assign({}, cell.liturgie) : { 'dyzur': cell.wartosc };
        }
      } else {
        // Future days (16..31): preserve 0 for excused/handed-off duties (e.g. Emil Czech D16, D18)
        if (cell.wartosc === 0 || cell.wartosc === '0') {
          litMap = (cell.liturgie && Object.keys(cell.liturgie).length > 0) ? Object.assign({}, cell.liturgie) : { 'dyzur': 0 };
        } else {
          litMap = {};
          cell.wartosc = null;
        }
      }

      cell.liturgie = litMap;
      const keys = Object.keys(litMap);
      if (keys.length > 0) {
        cell.wartosc = keys.reduce((acc, k) => acc + Number(litMap[k]), 0);
      } else if (cell.wartosc === 0 || cell.wartosc === '0') {
        cell.wartosc = 0;
      } else {
        cell.wartosc = null;
      }
    }

    w.suma = w.komorki.reduce((acc, c) => {
      const v = parseFloat(c.wartosc);
      return acc + (isNaN(v) ? 0 : v);
    }, 0);
    w.suma = Math.round(w.suma * 10) / 10;
  });

  // Revert Franek Kik's acceptance of Emil Czech's Oct 16 18:00 substitution
  console.log("\n2. Wycofywanie zastępstwa oferta_16_1791903381563 (Emil Czech -> Franek Kik, 16.10 18:00)...");
  if (Array.isArray(stan.zamianyZastepstwa)) {
    stan.zamianyZastepstwa.forEach(z => {
      if (z.id === 'oferta_16_1791903381563' || (Number(z.dzien) === 16 && czyDokladnieTenSamMinistrant(z.oddajacy, 'Emil Czech'))) {
        console.log("   zamianyZastepstwa przed:", JSON.stringify(z));
        z.status = 'OCZEKUJE';
        z.przejmujacy = '';
        delete z.czasPrzejecia;
        console.log("   zamianyZastepstwa po:   ", JSON.stringify(z));
      }
    });
  }
  if (Array.isArray(stan.wolneZastepstwa)) {
    stan.wolneZastepstwa.forEach(z => {
      if (z.id === 'oferta_16_1791903381563' || (Number(z.dzien) === 16 && czyDokladnieTenSamMinistrant(z.oddajacy, 'Emil Czech'))) {
        console.log("   wolneZastepstwa przed:", JSON.stringify(z));
        z.status = 'OCZEKUJE';
        z.przejmujacy = '';
        delete z.czasPrzejecia;
        console.log("   wolneZastepstwa po:   ", JSON.stringify(z));
      }
    });
  }

  // Recalculate monthly ranking
  const rankingNowy = stan.wiersze
    .filter(w => w && w.nazwisko && normName(w.nazwisko).indexOf('pokojsk') === -1)
    .map(w => ({
      nazwisko: w.nazwisko,
      punkty: w.suma,
      suma: w.suma,
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
  stan.ranking = rankingNowy;
  stan.rankingMiesiac = rankingNowy;

  // Recalculate yearly ranking
  if (Array.isArray(stan.rankingRok)) {
    const curMName = stan.nazwaMiesiaca || "Październik";
    const curMIdx = (stan.miesiacIdx !== undefined) ? stan.miesiacIdx : 9;
    const curRok = stan.rok || 2026;
    stan.rankingRok.forEach(r => {
      const matchW = stan.wiersze.find(w => czyDokladnieTenSamMinistrant(w.nazwisko, r.nazwisko));
      const mPts = matchW ? (matchW.suma || 0) : 0;
      const matchRM = rankingNowy.find(rn => czyDokladnieTenSamMinistrant(rn.nazwisko, r.nazwisko));
      const rnMiejsce = matchRM ? matchRM.pozycja : undefined;
      let sumPrev = 0;
      let foundM = false;
      if (Array.isArray(r.punktyPoMiesiacach)) {
        r.punktyPoMiesiacach.forEach(pm => {
          if (pm.miesiac === curMName || pm.miesiacIdx === curMIdx) {
            pm.punkty = mPts;
            if (rnMiejsce) pm.pozycja = rnMiejsce;
            foundM = true;
          } else {
            sumPrev += (pm.punkty || 0);
          }
        });
      }
      if (!foundM && Array.isArray(r.punktyPoMiesiacach)) {
        r.punktyPoMiesiacach.push({ miesiac: curMName, miesiacIdx: curMIdx, rok: curRok, punkty: mPts, pozycja: rnMiejsce });
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

  // Recalculate minus rankings (miesiac and rok)
  const curMNameZ = stan.nazwaMiesiaca || "Październik";
  const curMIdxZ = (stan.miesiacIdx !== undefined) ? stan.miesiacIdx : 9;
  const curRokZ = stan.rok || 2026;
  const dniNazwyMinusZ = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];
  const mGenMinusZ = "października";

  if (!Array.isArray(stan.rankingMinusyRok)) {
    stan.rankingMinusyRok = Array.isArray(stan.rankingMinusy) ? stan.rankingMinusy : [];
  }

  const minusyMiesiacMapZ = {};
  stan.wiersze.forEach(w => {
    if (!w || !w.nazwisko) return;
    const wNorm = w.nazwisko.toLowerCase().trim();
    const mList = [];
    (w.komorki || []).forEach((k, kIdx) => {
      if (k && typeof k.wartosc === "number" && k.wartosc < 0) {
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
    let sumMM = 0;
    itemMM.mins.forEach(x => { sumMM += x.punkty; });
    nowyRMM.push({
      nazwisko: itemMM.nazwisko,
      normName: nKey,
      minusy: sumMM,
      szczegolyMinusow: itemMM.mins,
      grupa: itemMM.grupa,
      pozycja: 1
    });
  }
  nowyRMM.sort((a, b) => a.minusy - b.minusy);
  let pMM = 1;
  nowyRMM.forEach((m, idx) => {
    if (idx > 0 && m.minusy > nowyRMM[idx - 1].minusy) pMM = idx + 1;
    m.pozycja = pMM;
  });
  stan.rankingMinusyMiesiac = nowyRMM;

  stan.wiersze.forEach(w => {
    if (!w || !w.nazwisko) return;
    const wNorm = w.nazwisko.toLowerCase().trim();
    let rItem = stan.rankingMinusyRok.find(it => czyDokladnieTenSamMinistrant(it.normName || it.nazwisko, w.nazwisko));
    if (!rItem) {
      rItem = { nazwisko: w.nazwisko, normName: wNorm, minusy: 0, szczegolyMinusow: [], grupa: w.grupa, pozycja: 1 };
      stan.rankingMinusyRok.push(rItem);
    }
    const starszeMinusy = (rItem.szczegolyMinusow || []).filter(sm => sm.miesiac !== curMNameZ && sm.miesiacIdx !== curMIdxZ);
    const biezaceMinusy = (minusyMiesiacMapZ[wNorm] && minusyMiesiacMapZ[wNorm].mins) ? minusyMiesiacMapZ[wNorm].mins : [];
    rItem.szczegolyMinusow = starszeMinusy.concat(biezaceMinusy);
    let totalM = 0;
    rItem.szczegolyMinusow.forEach(sm => { totalM += (sm.punkty || 0); });
    rItem.minusy = totalM;
  });
  stan.rankingMinusyRok.sort((a, b) => a.minusy - b.minusy);
  let pMR = 1;
  stan.rankingMinusyRok.forEach((m, idx) => {
    if (idx > 0 && m.minusy > stan.rankingMinusyRok[idx - 1].minusy) pMR = idx + 1;
    m.pozycja = pMR;
  });
  stan.rankingMinusy = stan.rankingMinusyRok;

  console.log('\n--- Zweryfikowany stan ministrantów (Październik 2026) ---');
  stan.wiersze.forEach(w => {
    const d14 = w.komorki[13];
    const d15 = w.komorki[14];
    const d16 = w.komorki[15];
    console.log(`${w.nazwisko.padEnd(22)} | Suma: ${String(w.suma).padStart(4)} | D14: ${String(d14.wartosc).padStart(4)} ${JSON.stringify(d14.liturgie)} | D15: ${String(d15.wartosc).padStart(4)} ${JSON.stringify(d15.liturgie)} | D16: ${String(d16.wartosc).padStart(4)}`);
  });

  console.log('\n3. Zapisywanie naprawionego grafiku do stan_grafiku/Październik_2026 oraz stan_grafiku/Pazdziernik_2026...');
  await saveDoc('Październik_2026', stan);
  await saveDoc('Pazdziernik_2026', stan);
  console.log('✅ SUKCES! Oba dokumenty w Firestore zostały naprawione i zsynchronizowane!');
}

runRepair().catch(err => {
  console.error('BŁĄD:', err);
  process.exit(1);
});
