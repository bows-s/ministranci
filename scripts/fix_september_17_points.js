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

function patchDoc(docName, fieldsToUpdate) {
  return new Promise((resolve, reject) => {
    const updateMask = Object.keys(fieldsToUpdate).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
    const path = `/v1/projects/${PROJECT_ID}/databases/(default)/documents/stan_grafiku/${encodeURIComponent(docName)}?${updateMask}&key=${API_KEY}`;
    
    const firestoreFields = {};
    for (const k in fieldsToUpdate) {
      firestoreFields[k] = toFirestoreValue(fieldsToUpdate[k]);
    }
    
    const body = JSON.stringify({ fields: firestoreFields });
    
    const req = https.request({
      host: 'firestore.googleapis.com',
      path: path,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Patch failed (${res.statusCode}): ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function dryRunOrApply(applyChanges = false) {
  console.log(`=== STARTING ${applyChanges ? 'APPLY' : 'DRY-RUN'} FOR SEPTEMBER 17 POINTS FIX ===\n`);

  const wrz = await getDoc('Wrzesień_2026');
  if (!wrz || !wrz.wiersze) {
    console.error('Brak Wrzesień_2026 w Firestore!');
    return;
  }

  const DAY_IDX = 16; // 17 września = indeks 16

  // 1. Aktualizacja komórek
  const corrections = {
    "Jan Radliński": { wartosc: 5, liturgie: { "17:00": 5 }, opis: "Dyżur regularny w czwartek (+5 pkt)" },
    "Rafał Danielczok": { wartosc: 5, liturgie: { "17:00": 5 }, opis: "Dyżur regularny w czwartek (+5 pkt)" },
    "Marcel Mazurkiewicz": { wartosc: 5, liturgie: { "17:00": 5 }, opis: "Dyżur regularny w czwartek (+5 pkt)" },
    "Bartosz Rozik": { wartosc: 1, liturgie: { "17:00": 1 }, opis: "Oddany dyżur zrealizowany przez Emila Czecha (+1 pkt)" },
    "Emil Czech": { wartosc: 4, liturgie: { "17:00": 4 }, opis: "Zastępstwo za Bartosza Rozika (+4 pkt)" },
    "Jakub Brytner": { wartosc: 2, liturgie: { "17:00": 2 }, opis: "Służba dodatkowa w tygodniu (+2 pkt)" },
    "Franek Kik": { wartosc: 2, liturgie: { "17:00": 2 }, opis: "Służba dodatkowa w tygodniu (+2 pkt)" }
  };

  console.log('1. ZMIANY W KOMÓRKACH NA DZIEŃ 17 WRZEŚNIA:');
  wrz.wiersze.forEach(w => {
    const corr = corrections[w.nazwisko];
    if (corr) {
      const k = w.komorki[DAY_IDX];
      const oldVal = k ? k.wartosc : null;
      console.log(`- ${w.nazwisko}: stara wartość = ${oldVal} -> nowa wartość = ${corr.wartosc} (${corr.opis})`);
      if (k) {
        k.wartosc = corr.wartosc;
        k.liturgie = corr.liturgie;
      }
    }
  });

  // 2. Przeliczenie sum
  console.log('\n2. PRZELICZENIE SUM WIERSZY WE WRZEŚNIU:');
  wrz.wiersze.forEach(w => {
    if (w.komorki) {
      const staraSuma = w.suma;
      const nowaSuma = w.komorki.reduce((acc, c) => {
        const v = (c && typeof c.wartosc === 'number') ? c.wartosc : (c && parseFloat(c.wartosc) || 0);
        return acc + v;
      }, 0);
      w.suma = Math.round(nowaSuma * 10) / 10;
      if (staraSuma !== w.suma) {
        console.log(`- ${w.nazwisko}: suma zmieniona z ${staraSuma} na ${w.suma} (różnica: ${w.suma - staraSuma > 0 ? '+' : ''}${w.suma - staraSuma})`);
      }
    }
  });

  // 3. Przeliczenie rankingu miesięcznego
  console.log('\n3. PRZELICZENIE RANKINGU MIESIĘCZNEGO WE WRZEŚNIU:');
  const nonEligible = ['kościelny', 'koscielny', 'pokojsk'];
  const rankingNowy = wrz.wiersze
    .filter(w => {
      const n = (w.nazwisko || '').toLowerCase().trim();
      return !nonEligible.some(ne => n.includes(ne));
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

  wrz.ranking = rankingNowy;
  wrz.rankingMiesiac = rankingNowy;

  // Format rankingu do rankingiMiesiecy
  const rankingDlaArchiwum = rankingNowy.map(r => ({
    nazwisko: r.nazwisko,
    normName: (r.nazwisko || '').toLowerCase().trim(),
    punkty: r.punkty,
    pozycja: r.pozycja
  }));

  if (!wrz.rankingiMiesiecy) wrz.rankingiMiesiecy = {};
  wrz.rankingiMiesiecy['Wrzesień'] = rankingDlaArchiwum;

  console.log('Nowy TOP 7 rankingu Wrzesień:');
  rankingNowy.slice(0, 7).forEach(r => console.log(`  #${r.pozycja} ${r.nazwisko}: ${r.punkty} pkt`));

  // 4. Przeliczenie rankingRok we Wrzesień_2026
  if (wrz.rankingRok && Array.isArray(wrz.rankingRok)) {
    console.log('\n4. PRZELICZENIE RANKINGU ROCZNEGO WE WRZEŚNIU:');
    wrz.rankingRok.forEach(r => {
      const row = wrz.wiersze.find(w => w.nazwisko === r.nazwisko);
      const mPts = row ? row.suma : 0;
      let sumPrev = 0;
      let foundSep = false;
      if (r.punktyPoMiesiacach && Array.isArray(r.punktyPoMiesiacach)) {
        r.punktyPoMiesiacach.forEach(pm => {
          if (pm.miesiac === 'Wrzesień' || pm.miesiacIdx === 8) {
            pm.punkty = mPts;
            foundSep = true;
          } else {
            sumPrev += (pm.punkty || 0);
          }
        });
      }
      const staryRok = r.punkty;
      r.punkty = Math.round((sumPrev + mPts) * 10) / 10;
      r.suma = r.punkty;
      if (staryRok !== r.punkty) {
        console.log(`- ${r.nazwisko}: suma roczna z ${staryRok} na ${r.punkty}`);
      }
    });

    wrz.rankingRok.sort((a, b) => b.punkty - a.punkty);
    let pozR = 1;
    wrz.rankingRok.forEach((r, idx) => {
      if (idx > 0 && r.punkty < wrz.rankingRok[idx - 1].punkty) pozR = idx + 1;
      r.pozycja = pozR;
      r.miejsce = pozR;
    });
  }

  // 5. Aktualizacja Październik_2026 (ranking roczny przechowuje sumę Września)
  const paz = await getDoc('Październik_2026');
  if (paz && paz.rankingRok && Array.isArray(paz.rankingRok)) {
    console.log('\n5. PROPAGACJA DO RANKINGU ROCZNEGO W PAŹDZIERNIKU:');
    paz.rankingRok.forEach(r => {
      const row = wrz.wiersze.find(w => w.nazwisko === r.nazwisko);
      if (!row) return;
      const mPts = row.suma;
      let sumAll = 0;
      let foundSep = false;
      if (r.punktyPoMiesiacach && Array.isArray(r.punktyPoMiesiacach)) {
        r.punktyPoMiesiacach.forEach(pm => {
          if (pm.miesiac === 'Wrzesień' || pm.miesiacIdx === 8) {
            pm.punkty = mPts;
            foundSep = true;
          }
          sumAll += (pm.punkty || 0);
        });
      }
      const staryRok = r.punkty;
      r.punkty = Math.round(sumAll * 10) / 10;
      r.suma = r.punkty;
      if (staryRok !== r.punkty) {
        console.log(`- ${r.nazwisko}: ranking roczny w Październiku z ${staryRok} na ${r.punkty}`);
      }
    });

    paz.rankingRok.sort((a, b) => b.punkty - a.punkty);
    let pozR = 1;
    paz.rankingRok.forEach((r, idx) => {
      if (idx > 0 && r.punkty < paz.rankingRok[idx - 1].punkty) pozR = idx + 1;
      r.pozycja = pozR;
      r.miejsce = pozR;
    });

    if (!paz.rankingiMiesiecy) paz.rankingiMiesiecy = {};
    paz.rankingiMiesiecy['Wrzesień'] = rankingDlaArchiwum;
  }

  if (applyChanges) {
    console.log('\nAPPLYING CHANGES TO FIRESTORE...');
    
    // Zapis Wrzesień_2026 i Wrzesien_2026
    const wrzFields = {
      wiersze: wrz.wiersze,
      ranking: wrz.ranking,
      rankingMiesiac: wrz.rankingMiesiac,
      rankingRok: wrz.rankingRok,
      rankingiMiesiecy: wrz.rankingiMiesiecy,
      zaktualizowano: new Date().toISOString()
    };
    await patchDoc('Wrzesień_2026', wrzFields);
    console.log('✓ Zaktualizowano stan_grafiku/Wrzesień_2026');
    await patchDoc('Wrzesien_2026', wrzFields);
    console.log('✓ Zaktualizowano stan_grafiku/Wrzesien_2026');

    // Zapis Październik_2026 i Pazdziernik_2026
    if (paz && paz.rankingRok) {
      const pazFields = {
        rankingRok: paz.rankingRok,
        rankingiMiesiecy: paz.rankingiMiesiecy,
        zaktualizowano: new Date().toISOString()
      };
      await patchDoc('Październik_2026', pazFields);
      console.log('✓ Zaktualizowano stan_grafiku/Październik_2026');
      await patchDoc('Pazdziernik_2026', pazFields);
      console.log('✓ Zaktualizowano stan_grafiku/Pazdziernik_2026');
    }

    console.log('\nALL CHANGES APPLIED SUCCESSFULLY!');
  } else {
    console.log('\nDRY RUN COMPLETE - NO WRITES PERFORMED.');
  }
}

const isApply = process.argv.includes('--apply');
dryRunOrApply(isApply).catch(console.error);
