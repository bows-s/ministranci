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

function getDoc(docName) {
  return new Promise((resolve) => {
    const url = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/stan_grafiku/' + encodeURIComponent(docName) + '?key=' + API_KEY;
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const fields = json.fields || {};
          const docData = {};
          for (const k in fields) docData[k] = fromFirestoreValue(fields[k]);
          resolve(docData);
        } catch(e) { resolve(null); }
      });
    });
  });
}

function patchDoc(docName, updateFields) {
  return new Promise((resolve, reject) => {
    const mask = Object.keys(updateFields).map(k => 'updateMask.fieldPaths=' + encodeURIComponent(k)).join('&');
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/stan_grafiku/${encodeURIComponent(docName)}?${mask}&key=${API_KEY}`;
    const fields = {};
    for (const k in updateFields) {
      if (Object.prototype.hasOwnProperty.call(updateFields, k)) {
        fields[k] = toFirestoreValue(updateFields[k]);
      }
    }
    const payload = JSON.stringify({ fields: fields });
    const parsedUrl = new URL(url);
    const req = https.request({
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ sukces: true });
        } else {
          reject(new Error(`Błąd zapisu Firestore HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

const ORDERED_NAMES = [
  // I GRUPA (CZERWONA)
  "Maks Erich", "Mateusz Pierścieński", "Wiktor Kowalski", "Jan Radliński",
  // II GRUPA (POMARAŃCZOWA)
  "Maciej Erich", "Mikołaj Erich", "Ksawery Skrzypek", "Rafał Danielczok",
  // III GRUPA (ZIELONA)
  "Michał Kupiec", "Paweł Głaz", "Jakub Brytner", "Franek Kik",
  // IV GRUPA (ŻÓŁTA)
  "Michał Danielczok", "Emil Czech", "Bartosz Rozik", "Marcel Mazurkiewicz"
];

function normName(s) {
  return String(s || '').toLowerCase().replace(/ł/g, 'l').replace(/ą/g, 'a').replace(/ę/g, 'e').replace(/ś/g, 's').replace(/ć/g, 'c').replace(/ż/g, 'z').replace(/ź/g, 'z').replace(/ń/g, 'n').replace(/ó/g, 'o').replace(/\s+/g, ' ').trim();
}

function czyTenSam(a, b) {
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

async function fixDoc(docName) {
  console.log(`\n================== PRZETWARZANIE ${docName} ==================`);
  const data = await getDoc(docName);
  if (!data || !data.wiersze) {
    console.error(`Nie udało się pobrać dokumentu ${docName}`);
    return;
  }

  // 1. Zaktualizuj grupę Mikołaja Ericha w wierszach
  let mikolajFound = false;
  const wierszeMap = new Map();
  for (const w of data.wiersze) {
    if (czyTenSam(w.nazwisko, 'Mikołaj Erich')) {
      w.grupa = 'II GRUPA (POMARAŃCZOWA)';
      mikolajFound = true;
      console.log(`✓ Zaktualizowano grupę Mikołaj Erich na: ${w.grupa}`);
    }
    wierszeMap.set(normName(w.nazwisko), w);
  }

  // Posortuj wiersze wg ORDERED_NAMES
  const posortowaneWiersze = [];
  for (const name of ORDERED_NAMES) {
    const key = normName(name);
    if (wierszeMap.has(key)) {
      posortowaneWiersze.push(wierszeMap.get(key));
      wierszeMap.delete(key);
    } else {
      // Szukanie częściowe
      let foundK = null;
      for (const [k, v] of wierszeMap.entries()) {
        if (czyTenSam(k, name)) {
          foundK = k;
          posortowaneWiersze.push(v);
          break;
        }
      }
      if (foundK) wierszeMap.delete(foundK);
    }
  }
  // Pozostałe (jeśli jakieś są)
  for (const v of wierszeMap.values()) {
    posortowaneWiersze.push(v);
  }

  // 2. Zaktualizuj ranking, rankingMiesiac i rankingRok dla Mikołaja Ericha
  if (Array.isArray(data.ranking)) {
    data.ranking.forEach(r => {
      if (czyTenSam(r.nazwisko, 'Mikołaj Erich')) {
        r.grupa = 'II GRUPA (POMARAŃCZOWA)';
      }
    });
  }
  if (Array.isArray(data.rankingMiesiac)) {
    data.rankingMiesiac.forEach(r => {
      if (czyTenSam(r.nazwisko, 'Mikołaj Erich')) {
        r.grupa = 'II GRUPA (POMARAŃCZOWA)';
      }
    });
  }
  if (Array.isArray(data.rankingRok)) {
    data.rankingRok.forEach(r => {
      if (czyTenSam(r.nazwisko, 'Mikołaj Erich')) {
        r.grupa = 'II GRUPA (POMARAŃCZOWA)';
      }
    });
  }

  // 3. Jakub Brytner - wolne zastępstwo na dzień 19
  const wolne = Array.isArray(data.wolneZastepstwa) ? [...data.wolneZastepstwa] : [];
  const zamiany = Array.isArray(data.zamianyZastepstwa) ? [...data.zamianyZastepstwa] : [];

  const maWolne19 = wolne.some(z => Number(z.dzien) === 19 && czyTenSam(z.oddajacy, 'Jakub Brytner') && z.status === 'OCZEKUJE');
  const nowaOferta19 = {
    id: 'oferta_19_brytner_wolny',
    dzien: 19,
    oddajacy: 'Jakub Brytner',
    godzina: '18:00',
    typ: 'Tydzień',
    status: 'OCZEKUJE',
    punkty: 4,
    rok: 2026,
    miesiacIdx: 9,
    utworzono: 1791900000000,
    przejmujacy: ''
  };

  if (!maWolne19) {
    wolne.push(nowaOferta19);
    console.log(`✓ Dodano ofertę wolnego zastępstwa na dzień 19 (Jakub Brytner) do wolneZastepstwa`);
  } else {
    console.log(`ℹ Oferta na dzień 19 (Jakub Brytner) już istnieje w wolneZastepstwa`);
  }

  const maZamiany19 = zamiany.some(z => Number(z.dzien) === 19 && czyTenSam(z.oddajacy, 'Jakub Brytner') && z.status === 'OCZEKUJE');
  if (!maZamiany19) {
    zamiany.push(nowaOferta19);
    console.log(`✓ Dodano ofertę wolnego zastępstwa na dzień 19 (Jakub Brytner) do zamianyZastepstwa`);
  } else {
    console.log(`ℹ Oferta na dzień 19 (Jakub Brytner) już istnieje w zamianyZastepstwa`);
  }

  // 4. Zapisz do Firestore
  const patchData = {
    wiersze: posortowaneWiersze,
    ranking: data.ranking,
    rankingMiesiac: data.rankingMiesiac,
    rankingRok: data.rankingRok,
    wolneZastepstwa: wolne,
    zamianyZastepstwa: zamiany,
    zaktualizowano: new Date().toISOString()
  };

  await patchDoc(docName, patchData);
  console.log(`✅ Zapisano pomyślnie ${docName}!`);
}

async function main() {
  await fixDoc('Październik_2026');
  await fixDoc('Pazdziernik_2026');
  console.log('\n🎉 Wszystkie dokumenty zaktualizowane pomyślnie!');
}

main().catch(err => {
  console.error('BŁĄD:', err);
  process.exit(1);
});
