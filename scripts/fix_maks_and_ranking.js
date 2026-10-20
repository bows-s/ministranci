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
      if (Object.prototype.hasOwnProperty.call(val, k)) {
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

async function fixMaksAndAnnualRanking() {
  console.log('Pobieram Wrzesień_2026 i Październik_2026 z Firestore...');
  const wrz = await getDoc('Wrzesień_2026');
  const paz = await getDoc('Październik_2026');

  if (!wrz || !paz) {
    throw new Error('Nie udało się pobrać dokumentów z Firestore');
  }

  // 1. NAPRAWA MAKSA ERICHA (dyżur we wtorki zamiast poniedziałków)
  const maksRow = paz.wiersze.find(w => w.nazwisko === 'Maks Erich');
  if (maksRow) {
    maksRow.stalyDzienTygodnia = 2; // Wtorek
    maksRow.komorki.forEach((k, idx) => {
      const dzien = idx + 1;
      const dt = new Date(2026, 9, dzien);
      const dow = dt.getDay(); // 0 = Nd, 1 = Pn, 2 = Wt ...
      // Dyżury Maksa w październiku: Wtorki (6, 13, 20, 27) oraz Niedziele (4, 11, 18, 25)
      if (dow === 2 || dow === 0) {
        k.maDyzur = true;
      } else {
        k.maDyzur = false;
      }
    });
    console.log('✅ Zaktualizowano dyżur Maksa Ericha: wtorki i niedziele.');
  }

  // 2. NAPRAWA RANKINGU ROCZNEGO (przywrócenie autentycznych punktów z Wrzesień_2026)
  // We Wrzesień_2026 mamy nienaruszone sumy od Stycznia do Września w rankingRok
  const wrzRankingRok = wrz.rankingRok || [];
  const pazWiersze = paz.wiersze || [];

  const nowyRankingRok = wrzRankingRok.map(rWrz => {
    const matchingRowPaz = pazWiersze.find(w => w.nazwisko === rWrz.nazwisko);
    const pktPazdziernik = matchingRowPaz ? (matchingRowPaz.suma || 0) : 0;
    
    // Autentyczna historia miesięcy Styczeń..Wrzesień
    const pmList = (rWrz.punktyPoMiesiacach || []).filter(pm => pm.miesiac !== 'Październik' && pm.miesiacIdx !== 9);
    
    // Oblicz sumę miesięcy 1..9 (do końca września)
    let sumDoWrzesnia = 0;
    pmList.forEach(pm => {
      sumDoWrzesnia += (pm.punkty || 0);
    });

    // Dodaj Październik z rzeczywistymi punktami z tabeli
    pmList.push({
      miesiac: 'Październik',
      miesiacIdx: 9,
      rok: 2026,
      punkty: pktPazdziernik,
      pozycja: 1
    });

    const sumaRokCaly = Math.round((sumDoWrzesnia + pktPazdziernik) * 10) / 10;

    return {
      nazwisko: rWrz.nazwisko,
      normName: rWrz.nazwisko.toLowerCase().trim(),
      punkty: sumaRokCaly,
      suma: sumaRokCaly,
      grupa: matchingRowPaz ? matchingRowPaz.grupa : (rWrz.grupa || ''),
      punktyPoMiesiacach: pmList
    };
  });

  // Sortowanie rankingu rocznego
  nowyRankingRok.sort((a, b) => {
    if (b.punkty !== a.punkty) return b.punkty - a.punkty;
    return a.nazwisko.localeCompare(b.nazwisko, 'pl');
  });

  let pozR = 1;
  nowyRankingRok.forEach((r, idx) => {
    if (idx > 0 && r.punkty < nowyRankingRok[idx - 1].punkty) pozR = idx + 1;
    r.pozycja = pozR;
    r.miejsce = pozR;
  });

  console.log('\n=== ZAKTUALIZOWANY RANKING ROCZNY ===');
  nowyRankingRok.forEach(r => {
    console.log(r.pozycja + '. ' + r.nazwisko + ': ' + r.punkty + ' pkt');
  });

  // 3. ZAPIS DO FIRESTORE
  console.log('\nZapisuję zaktualizowane dane do Firestore stan_grafiku/Październik_2026...');
  await patchDoc('Październik_2026', {
    wiersze: paz.wiersze,
    rankingRok: nowyRankingRok,
    zaktualizowano: new Date().toISOString()
  });

  console.log('✅ ZAPIS W FIRESTORE ZAKOŃCZONY SUKCESEM!');
}

fixMaksAndAnnualRanking().catch(console.error);
