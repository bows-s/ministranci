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

function getDoc(collection, docName) {
  return new Promise((resolve, reject) => {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${encodeURIComponent(collection)}/${encodeURIComponent(docName)}?key=${API_KEY}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            return reject(new Error(json.error.message));
          }
          const fields = json.fields || {};
          const docData = {};
          for (const k in fields) docData[k] = fromFirestoreValue(fields[k]);
          resolve(docData);
        } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function patchDoc(collection, docName, updateFields) {
  return new Promise((resolve, reject) => {
    const mask = Object.keys(updateFields).map(k => 'updateMask.fieldPaths=' + encodeURIComponent(k)).join('&');
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${encodeURIComponent(collection)}/${encodeURIComponent(docName)}?${mask}&key=${API_KEY}`;
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

async function fixPoints() {
  console.log('1. Pobieranie obecnosc/M9_11_1130...');
  const obec = await getDoc('obecnosc', 'M9_11_1130');
  if (!obec) throw new Error('Brak dokumentu obecnosc/M9_11_1130');

  console.log('Aktualna lista w obecnosc/M9_11_1130:');
  (obec.ministranci || []).forEach(m => {
    console.log(` - ${m.nazwisko} (${m.typ}): obecnyPkt=${m.obecnyPkt}, punkty=${m.punkty}`);
    if (m.typ === 'DODATKOWY' && m.status === 'OBECNY') {
      m.punkty = 3;
      m.obecnyPkt = 3;
      m.poprzedniePunktyZTejMszy = 3;
    }
  });
  obec.recznieUstawionePunkty = true;

  console.log('Zapisywanie poprawionego obecnosc/M9_11_1130...');
  await patchDoc('obecnosc', 'M9_11_1130', {
    ministranci: obec.ministranci,
    recznieUstawionePunkty: true
  });
  console.log('obecnosc/M9_11_1130 zaktualizowany!');

  console.log('2. Pobieranie stan_grafiku/Październik_2026...');
  const tabela = await getDoc('stan_grafiku', 'Październik_2026');
  if (!tabela) throw new Error('Brak dokumentu stan_grafiku/Październik_2026');

  const wiersze = tabela.wiersze || [];
  const colIdx = 10; // Dzień 11 (indeks 10)

  // Popraw punkty dla dodatkowych w dniu 11 (11.10.2026):
  // Maciej Erich: powinien mieć 3 pkt (był 1)
  // Emil Czech: powinien mieć 3 pkt (był 1)
  // Mikołaj Erich: powinien mieć 3 pkt (był 1)
  // Bartosz Rozik: był na 10:00 (3 pkt) i na 11:30 (3 pkt) -> łącznie 6 pkt (było 4)
  wiersze.forEach(w => {
    const n = (w.nazwisko || '').toLowerCase().trim();
    if (w.komorki && w.komorki[colIdx]) {
      if (n.includes('maciej erich')) {
        console.log(`Maciej Erich komórka d11: ${w.komorki[colIdx].wartosc} -> 3`);
        w.komorki[colIdx].wartosc = 3;
      } else if (n.includes('emil czech')) {
        console.log(`Emil Czech komórka d11: ${w.komorki[colIdx].wartosc} -> 3`);
        w.komorki[colIdx].wartosc = 3;
      } else if (n.includes('mikołaj erich') || n.includes('mikolaj erich')) {
        console.log(`Mikołaj Erich komórka d11: ${w.komorki[colIdx].wartosc} -> 3`);
        w.komorki[colIdx].wartosc = 3;
      } else if (n.includes('bartosz rozik')) {
        console.log(`Bartosz Rozik komórka d11: ${w.komorki[colIdx].wartosc} -> 6`);
        w.komorki[colIdx].wartosc = 6;
      }
    }

    // Przelicz sumę wiersza
    if (w.komorki) {
      w.suma = w.komorki.reduce((acc, c) => {
        const v = parseFloat(c.wartosc);
        return acc + (isNaN(v) ? 0 : v);
      }, 0);
      w.suma = Math.round(w.suma * 10) / 10;
    }
  });

  // Przelicz ranking miesięczny
  const rankingMiesiac = wiersze
    .filter(w => w.nazwisko && w.suma !== undefined)
    .map(w => ({
      nazwisko: w.nazwisko,
      punkty: w.suma,
      suma: w.suma,
      grupa: w.grupa
    }))
    .sort((a, b) => b.punkty - a.punkty);

  let pozM = 1;
  rankingMiesiac.forEach((r, idx) => {
    if (idx > 0 && r.punkty < rankingMiesiac[idx - 1].punkty) pozM = idx + 1;
    r.pozycja = pozM;
    r.miejsce = pozM;
  });

  // Przelicz ranking roczny
  const rankingRok = tabela.rankingRok || [];
  rankingRok.forEach(r => {
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
        if (pm.miesiac === "Październik" || pm.miesiacIdx === 9) {
          pm.punkty = mPts;
          foundM = true;
        } else {
          sumPrev += (pm.punkty || 0);
        }
      });
      if (!foundM) {
        r.punktyPoMiesiacach.push({
          miesiac: "Październik",
          miesiacIdx: 9,
          punkty: mPts
        });
      }
    }
    r.punkty = sumPrev + mPts;
    r.suma = sumPrev + mPts;
  });

  rankingRok.sort((a, b) => b.punkty - a.punkty);
  let pozR = 1;
  rankingRok.forEach((r, idx) => {
    if (idx > 0 && r.punkty < rankingRok[idx - 1].punkty) pozR = idx + 1;
    r.pozycja = pozR;
    r.miejsce = pozR;
  });

  // Popraw historię wpisów
  const hist = tabela.historiaWpisow || [];
  hist.forEach(h => {
    if ((h.dzien && (h.dzien.includes('11') || h.dzien.includes('11.10'))) && h.godzina === '11:30') {
      const hn = (h.nazwisko || '').toLowerCase().trim();
      if (hn.includes('maciej erich') || hn.includes('emil czech') || hn.includes('mikołaj erich') || hn.includes('mikolaj erich') || hn.includes('bartosz rozik')) {
        h.punkty = 3;
      }
    }
  });

  console.log('Zapisywanie zaktualizowanego stan_grafiku/Październik_2026...');
  await patchDoc('stan_grafiku', 'Październik_2026', {
    wiersze: wiersze,
    ranking: rankingMiesiac,
    rankingMiesiac: rankingMiesiac,
    rankingRok: rankingRok,
    historiaWpisow: hist,
    zaktualizowano: new Date().toISOString()
  });

  console.log('Sukces! Zaktualizowano punkty, sumy i rankingi w Firestore.');
}

fixPoints().catch(err => {
  console.error('Błąd:', err);
  process.exit(1);
});
