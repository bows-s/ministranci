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

const PUNKTY_DNI = {
  1: { "Jan Radliński": 7, "Rafał Danielczok": 7, "Marcel Mazurkiewicz": -5, "Bartosz Rozik": 7, "Jakub Brytner": 4, "Franek Kik": 4 },
  2: { "Maciej Erich": 7, "Emil Czech": 7, "Mateusz Pierścieński": -5 },
  3: { "Maciej Erich": 4, "Ksawery Skrzypek": 3, "Rafał Danielczok": 1 },
  4: { "Maks Erich": 0, "Mateusz Pierścieński": 3, "Jan Radliński": 3, "Wiktor Kowalski": 1, "Maciej Erich": 3, "Michał Kupiec": 3, "Paweł Głaz": -5, "Mikołaj Erich": 3, "Jakub Brytner": 3, "Franek Kik": 6, "Michał Danielczok": 3, "Marcel Mazurkiewicz": -5, "Emil Czech": 6, "Bartosz Rozik": 0 },
  5: { "Jakub Brytner": 5 },
  6: { "Ksawery Skrzypek": 7, "Maciej Erich": 6, "Franek Kik": 7, "Maks Erich": 5, "Michał Kupiec": -5, "Mikołaj Erich": 1 },
  8: { "Jan Radliński": 7, "Rafał Danielczok": 7, "Bartosz Rozik": 7, "Marcel Mazurkiewicz": -5 },
  9: { "Maciej Erich": 7, "Emil Czech": 7, "Jakub Brytner": 4, "Mateusz Pierścieński": -5 },
  10: { "Maciej Erich": 5, "Ksawery Skrzypek": 5, "Rafał Danielczok": 5 }
};

const DYZURY = {
  "Maks Erich": [4, 6, 11, 13, 18, 20, 25, 27],
  "Mateusz Pierścieński": [2, 4, 9, 11, 16, 18, 23, 25, 30],
  "Jan Radliński": [1, 4, 8, 11, 15, 18, 22, 25, 29],
  "Wiktor Kowalski": [4, 11, 18, 25],
  "Maciej Erich": [2, 3, 9, 10, 16, 17, 23, 24, 30, 31],
  "Mikołaj Erich": [3, 6, 10, 13, 17, 20, 24, 27, 31],
  "Ksawery Skrzypek": [3, 6, 10, 13, 17, 20, 24, 27, 31],
  "Rafał Danielczok": [1, 3, 8, 10, 15, 17, 22, 24, 29, 31],
  "Michał Kupiec": [4, 6, 11, 13, 18, 20, 25, 27],
  "Paweł Głaz": [4, 11, 18, 25],
  "Jakub Brytner": [4, 5, 11, 12, 18, 19, 25, 26],
  "Franek Kik": [4, 6, 11, 13, 18, 20, 25, 27],
  "Michał Danielczok": [4, 11, 18, 25],
  "Marcel Mazurkiewicz": [1, 4, 8, 11, 15, 18, 22, 25, 29],
  "Emil Czech": [2, 4, 9, 11, 16, 18, 23, 25, 30],
  "Bartosz Rozik": [1, 4, 8, 11, 15, 18, 22, 25, 29]
};

const STALE_DNI = {
  "Maks Erich": 2,
  "Mateusz Pierścieński": 5,
  "Jan Radliński": 4,
  "Wiktor Kowalski": -1,
  "Maciej Erich": 5,
  "Mikołaj Erich": 2,
  "Ksawery Skrzypek": 2,
  "Rafał Danielczok": 4,
  "Michał Kupiec": 2,
  "Paweł Głaz": -1,
  "Jakub Brytner": 1,
  "Franek Kik": 2,
  "Michał Danielczok": -1,
  "Marcel Mazurkiewicz": 4,
  "Emil Czech": 5,
  "Bartosz Rozik": 4
};

async function restoreAll() {
  console.log('Pobieram Wrzesień_2026 i Październik_2026...');
  const wrz = await getDoc('Wrzesień_2026');
  const paz = await getDoc('Październik_2026');

  if (!wrz || !paz) throw new Error('Błąd odczytu dokumentów');

  const wiersze = paz.wiersze || [];
  
  // 1. Zapisz dokładne punkty i dyżury do każdej komórki
  wiersze.forEach(w => {
    const n = w.nazwisko;
    const dyzury = DYZURY[n] || [];
    w.stalyDzienTygodnia = STALE_DNI[n] !== undefined ? STALE_DNI[n] : -1;

    let sumaMiesiac = 0;
    w.komorki = (w.komorki || []).map((k, idx) => {
      const dzien = idx + 1;
      const maDyzur = dyzury.includes(dzien);
      
      let val = null;
      if (PUNKTY_DNI[dzien] && PUNKTY_DNI[dzien][n] !== undefined) {
        val = PUNKTY_DNI[dzien][n];
      }

      if (typeof val === 'number') {
        sumaMiesiac += val;
      }

      return {
        dzien: dzien,
        maDyzur: maDyzur,
        wartosc: val,
        bg: k.bg || ""
      };
    });

    w.suma = Math.round(sumaMiesiac * 10) / 10;
  });

  console.log('=== ZSUMOWANE PUNKTY PAŹDZIERNIKA (wiersze.suma) ===');
  wiersze.forEach(w => {
    const pts = w.komorki.map(k => k.wartosc !== null ? k.dzien + ':' + k.wartosc : null).filter(Boolean);
    console.log(w.nazwisko + ' | suma: ' + w.suma + ' | komórki: [' + pts.join(', ') + ']');
  });

  // 2. Ranking Miesiąca (Październik)
  const rankingMiesiac = wiersze.map(w => ({
    nazwisko: w.nazwisko,
    normName: w.nazwisko.toLowerCase().trim(),
    punkty: w.suma,
    suma: w.suma,
    grupa: w.grupa,
    pozycja: 1,
    miejsce: 1
  })).sort((a, b) => {
    if (b.punkty !== a.punkty) return b.punkty - a.punkty;
    return a.nazwisko.localeCompare(b.nazwisko, 'pl');
  });

  let pozM = 1;
  rankingMiesiac.forEach((r, idx) => {
    if (idx > 0 && r.punkty < rankingMiesiac[idx - 1].punkty) pozM = idx + 1;
    r.pozycja = pozM;
    r.miejsce = pozM;
  });

  // 3. Ranking Roku (Styczeń..Wrzesień z Wrzesień_2026 + Październik)
  const wrzRankingRok = wrz.rankingRok || [];
  const rankingRok = wrzRankingRok.map(rWrz => {
    const matchingRowPaz = wiersze.find(w => w.nazwisko === rWrz.nazwisko);
    const pktPazdziernik = matchingRowPaz ? matchingRowPaz.suma : 0;

    const pmList = (rWrz.punktyPoMiesiacach || []).filter(pm => pm.miesiac !== 'Październik' && pm.miesiacIdx !== 9);

    let sumDoWrzesnia = 0;
    pmList.forEach(pm => {
      sumDoWrzesnia += (pm.punkty || 0);
    });

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
  }).sort((a, b) => {
    if (b.punkty !== a.punkty) return b.punkty - a.punkty;
    return a.nazwisko.localeCompare(b.nazwisko, 'pl');
  });

  let pozR = 1;
  rankingRok.forEach((r, idx) => {
    if (idx > 0 && r.punkty < rankingRok[idx - 1].punkty) pozR = idx + 1;
    r.pozycja = pozR;
    r.miejsce = pozR;
  });

  console.log('\n=== TOP 5 RANKING ROK ===');
  rankingRok.slice(0, 5).forEach(r => console.log(r.pozycja + '. ' + r.nazwisko + ': ' + r.punkty + ' pkt'));

  // 4. Zabezpiecz ofertę Macieja z dnia 9 na giełdzie, by nie miała statusu wygasłej
  const gt = paz.gieldaTydzien || [];
  gt.forEach(o => {
    if (o.wystawiajacy === 'Maciej Erich' && (o.dzien === 9 || o.dzienOddawany === 9)) {
      o.status = 'ZAAKCEPTOWANA'; // Służył w tym dniu!
    }
  });

  // 5. Zapisz do Firestore
  console.log('\nZapisuję do Firestore stan_grafiku/Październik_2026...');
  await patchDoc('Październik_2026', {
    wiersze: wiersze,
    rankingMiesiac: rankingMiesiac,
    ranking: rankingMiesiac,
    rankingRok: rankingRok,
    gieldaTydzien: gt,
    zaktualizowano: new Date().toISOString()
  });

  console.log('✅ BAZA FIRESTORE ZOSTAŁA DEFINITYWNIE PRZYWRÓCONA!');
}

restoreAll().catch(console.error);
