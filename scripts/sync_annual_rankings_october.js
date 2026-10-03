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
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/stan_grafiku/${encodeURIComponent(docName)}?key=${API_KEY}`;
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

function czyTenSam(a, b) {
  if (!a || !b) return false;
  return a.toLowerCase().trim() === b.toLowerCase().trim();
}

async function fixOctoberFirestore() {
  console.log('Pobieram dane z Wrzesień_2026 i Październik_2026...');
  const wrz = await getDoc('Wrzesień_2026');
  const paz = await getDoc('Październik_2026');

  if (!wrz || !paz) {
    console.error('Błąd pobierania dokumentów!');
    return;
  }

  // 1. Sprawdzamy punkty i minusy zdobyte w Październiku z wierszy
  const pazPunkty = {};
  const pazMinusy = {};
  paz.wiersze.forEach(w => {
    let sum = 0;
    const mins = [];
    (w.komorki || []).forEach((k, idx) => {
      if (typeof k.wartosc === 'number') {
        sum += k.wartosc;
        if (k.wartosc < 0) {
          mins.push({ dzien: idx + 1, punkty: k.wartosc });
        }
      }
    });
    pazPunkty[w.nazwisko] = sum;
    if (mins.length > 0) pazMinusy[w.nazwisko] = mins;
  });

  // 2. Ranking Miesiąca (Październik)
  const rankingMiesiac = paz.wiersze.map(w => {
    return {
      nazwisko: w.nazwisko,
      punkty: pazPunkty[w.nazwisko] || 0,
      suma: pazPunkty[w.nazwisko] || 0,
      grupa: w.grupa,
      pozycja: 1,
      miejsce: 1
    };
  }).sort((a, b) => {
    if (b.punkty !== a.punkty) return b.punkty - a.punkty;
    return a.nazwisko.localeCompare(b.nazwisko, 'pl');
  });

  let pozMies = 1;
  rankingMiesiac.forEach((r, idx) => {
    if (idx > 0 && r.punkty < rankingMiesiac[idx - 1].punkty) pozMies = idx + 1;
    r.pozycja = pozMies;
    r.miejsce = pozMies;
  });

  // 3. Ranking Całego Roku (Październik - z zachowaniem historii od Stycznia!)
  const prevRok = wrz.rankingRok || [];
  const rankingRok = paz.wiersze.map(w => {
    const prevItem = prevRok.find(p => czyTenSam(p.nazwisko, w.nazwisko));
    const mOctPts = pazPunkty[w.nazwisko] || 0;
    const prevPmList = (prevItem && prevItem.punktyPoMiesiacach) ? JSON.parse(JSON.stringify(prevItem.punktyPoMiesiacach)) : [];
    
    // Oblicz sumę miesięcy poprzednich (Styczeń..Wrzesień)
    let sumPoprzednie = 0;
    prevPmList.forEach(pm => {
      if (pm.miesiac !== 'Październik' && pm.miesiacIdx !== 9) {
        sumPoprzednie += (pm.punkty || 0);
      }
    });

    const nowyPmList = prevPmList.filter(pm => pm.miesiac !== 'Październik' && pm.miesiacIdx !== 9);
    nowyPmList.push({
      miesiac: 'Październik',
      miesiacIdx: 9,
      rok: 2026,
      punkty: mOctPts
    });

    const totalPunkty = Math.round((sumPoprzednie + mOctPts) * 10) / 10;
    return {
      nazwisko: w.nazwisko,
      normName: w.nazwisko.toLowerCase().trim(),
      punkty: totalPunkty,
      suma: totalPunkty,
      grupa: w.grupa,
      punktyPoMiesiacach: nowyPmList
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

  // 4. Ranking Minusów Miesiąca (Październik)
  const dniNazwyMinus = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
  const rankingMinusyMiesiac = [];
  paz.wiersze.forEach(w => {
    const mins = pazMinusy[w.nazwisko] || [];
    if (mins.length > 0) {
      let sumMins = 0;
      const szcze = mins.map(om => {
        sumMins += om.punkty;
        const dt = new Date(2026, 9, om.dzien);
        return {
          dzien: om.dzien,
          miesiac: 'Październik',
          miesiacGen: 'października',
          miesiacIdx: 9,
          rok: 2026,
          dzienTygodnia: dniNazwyMinus[dt.getDay()],
          punkty: om.punkty
        };
      });
      rankingMinusyMiesiac.push({
        nazwisko: w.nazwisko,
        minusy: sumMins,
        szczegolyMinusow: szcze,
        grupa: w.grupa,
        pozycja: 1
      });
    }
  });

  rankingMinusyMiesiac.sort((a, b) => a.minusy - b.minusy);
  let pozMM = 1;
  rankingMinusyMiesiac.forEach((m, idx) => {
    if (idx > 0 && m.minusy > rankingMinusyMiesiac[idx - 1].minusy) pozMM = idx + 1;
    m.pozycja = pozMM;
  });

  // 5. Ranking Minusów Roku (Cały rok z historią od Stycznia!)
  const prevMinusyRok = wrz.rankingMinusyRok || [];
  const rankingMinusyRok = paz.wiersze.map(w => {
    const prevMItem = prevMinusyRok.find(p => czyTenSam(p.nazwisko, w.nazwisko));
    const prevSzczegoly = (prevMItem && prevMItem.szczegolyMinusow) ? JSON.parse(JSON.stringify(prevMItem.szczegolyMinusow)) : [];
    
    // Filtrujemy tylko miesiące przed Październikiem
    const filteredSzczegoly = prevSzczegoly.filter(s => s.miesiac !== 'Październik' && s.miesiacIdx !== 9);
    
    // Dodajemy minusy z Października
    const octMins = pazMinusy[w.nazwisko] || [];
    octMins.forEach(om => {
      const dt = new Date(2026, 9, om.dzien);
      filteredSzczegoly.push({
        dzien: om.dzien,
        miesiac: 'Październik',
        miesiacGen: 'października',
        miesiacIdx: 9,
        rok: 2026,
        dzienTygodnia: dniNazwyMinus[dt.getDay()],
        punkty: om.punkty
      });
    });

    let totalMinusy = 0;
    filteredSzczegoly.forEach(s => totalMinusy += (s.punkty || 0));

    return {
      nazwisko: w.nazwisko,
      minusy: totalMinusy,
      szczegolyMinusow: filteredSzczegoly,
      grupa: w.grupa
    };
  }).sort((a, b) => {
    if (a.minusy !== b.minusy) return a.minusy - b.minusy;
    return a.nazwisko.localeCompare(b.nazwisko, 'pl');
  });

  let pozMR = 1;
  rankingMinusyRok.forEach((m, idx) => {
    if (idx > 0 && m.minusy > rankingMinusyRok[idx - 1].minusy) pozMR = idx + 1;
    m.pozycja = pozMR;
  });

  // 6. Rankingi wszystkich miesięcy (Styczeń..Październik)
  const rankingiMiesiecy = wrz.rankingiMiesiecy ? JSON.parse(JSON.stringify(wrz.rankingiMiesiecy)) : {};
  rankingiMiesiecy["Październik"] = rankingMiesiac.map(r => ({
    nazwisko: r.nazwisko,
    normName: r.nazwisko.toLowerCase().trim(),
    punkty: r.punkty,
    pozycja: r.pozycja
  }));

  console.log('Zapisuję skumulowane dane do Październik_2026 w Firestore...');
  await patchDoc('Październik_2026', {
    rankingMiesiac: rankingMiesiac,
    ranking: rankingMiesiac,
    rankingRok: rankingRok,
    rankingMinusy: rankingMinusyRok,
    rankingMinusyRok: rankingMinusyRok,
    rankingMinusyMiesiac: rankingMinusyMiesiac,
    rankingiMiesiecy: rankingiMiesiecy,
    zaktualizowano: new Date().toISOString()
  });

  console.log('✅ ZAPIS W FIRESTORE ZAKOŃCZONY SUKCESEM!');
  console.log('\nPrzykładowe wyniki z Październik_2026:');
  console.log('Maciej Erich punkty roczne:', rankingRok.find(r => r.nazwisko === 'Maciej Erich').punkty, 'pkt');
  console.log('Marcel Mazurkiewicz minusy roczne:', rankingMinusyRok.find(m => m.nazwisko === 'Marcel Mazurkiewicz').minusy, 'pkt');
  console.log('Michał Kupiec minusy roczne:', rankingMinusyRok.find(m => m.nazwisko === 'Michał Kupiec').minusy, 'pkt');
  console.log('Mateusz Pierścieński minusy roczne:', rankingMinusyRok.find(m => m.nazwisko === 'Mateusz Pierścieński').minusy, 'pkt');
  console.log('Liczba ministrantów w rankingMinusyRok:', rankingMinusyRok.length);
}

fixOctoberFirestore().catch(console.error);
