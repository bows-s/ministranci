const fs = require('fs');
const path = require('path');
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
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const k in val) {
      if (val[k] !== undefined) fields[k] = toFirestoreValue(val[k]);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fetchDoc(coll, id) {
  return new Promise((resolve, reject) => {
    https.get('https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/' + coll + '/' + encodeURIComponent(id) + '?key=' + API_KEY, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function patchDoc(coll, id, fields, updateMask) {
  return new Promise((resolve, reject) => {
    const maskParams = (updateMask || Object.keys(fields)).map(f => 'updateMask.fieldPaths=' + encodeURIComponent(f)).join('&');
    const url = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/' + coll + '/' + encodeURIComponent(id) + '?' + maskParams + '&key=' + API_KEY;
    const body = JSON.stringify({ fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, toFirestoreValue(v)])) });

    const req = https.request(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function czyToSamoNazwisko(a, b) {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

async function run() {
  console.log('=== KROK 1: Modyfikacja kodu zakrystia.js ===');
  const filesToPatch = [
    path.join(__dirname, '..', 'public', 'js', 'zakrystia.js'),
    path.join(__dirname, '..', 'js', 'zakrystia.js')
  ];

  for (const filePath of filesToPatch) {
    if (!fs.existsSync(filePath)) continue;
    let content = fs.readFileSync(filePath, 'utf8');

    // Patch 1: UI rendering ptsDlaObecnego
    const oldUIBlock = /var ptsDlaObecnego = isSwietoL \? \(juzBylSwieto \? 2 : 5\) : \(zakrystiaStan\.punktyLiturgii \|\| 3\);[\s\S]*?ptsDlaObecnego = \(typeof m\.obecnyPkt === 'number'\) \? m\.obecnyPkt : \(isSwietoL \? \(juzBylSwieto \? 2 : 5\) : \(zakrystiaStan\.punktyLiturgii \|\| 3\)\);[\s\S]*?\}/;
    
    // We will do precise string replacement
    const target1 = `        var ptsDlaObecnego = isSwietoL ? (juzBylSwieto ? 2 : 5) : (zakrystiaStan.punktyLiturgii || 3);
        if (m.typ === 'ZASTEPCA') {
          ptsDlaObecnego = (typeof m.obecnyPkt === 'number') ? m.obecnyPkt : 4;
        } else if (m.typ === 'DODATKOWY') {
          if (zakrystiaStan.recznieUstawionePunkty) {
            ptsDlaObecnego = zakrystiaStan.punktyLiturgii || (isSwietoL ? (juzBylSwieto ? 2 : 5) : 3);
          } else if (isSwietoL) {
            ptsDlaObecnego = juzBylSwieto ? 2 : 5;
          } else if (typeof m.obecnyPkt === 'number') {
            ptsDlaObecnego = m.obecnyPkt;
          } else if (czyDodatkowa) {
            ptsDlaObecnego = zakrystiaStan.punktyLiturgii || 3;
          } else {
            ptsDlaObecnego = czyNiedziela ? 1 : 2;
          }
        } else {
          ptsDlaObecnego = (typeof m.obecnyPkt === 'number') ? m.obecnyPkt : (isSwietoL ? (juzBylSwieto ? 2 : 5) : (zakrystiaStan.punktyLiturgii || 3));
        }`;

    const replace1 = `        var isKubaBrytnerSpecialUI = (zakrystiaStan.dzien === 2 && currentMonthIdx === 10 && czyToSamoNazwisko(m.nazwisko, 'Jakub Brytner'));
        var ptsDlaObecnego = (typeof m.obecnyPkt === 'number') ? m.obecnyPkt : (zakrystiaStan.punktyLiturgii || 3);
        if (isKubaBrytnerSpecialUI) {
          ptsDlaObecnego = 5;
        } else if (zakrystiaStan.rodzajLiturgii === 'nabozenstwo' || zakrystiaStan.czyLiturgiaDodatkowa || (zakrystiaStan.punktyLiturgii && zakrystiaStan.punktyLiturgii === 4)) {
          ptsDlaObecnego = (typeof m.obecnyPkt === 'number') ? m.obecnyPkt : (zakrystiaStan.punktyLiturgii || 4);
        } else if (m.typ === 'ZASTEPCA') {
          ptsDlaObecnego = (typeof m.obecnyPkt === 'number') ? m.obecnyPkt : 4;
        } else if (isSwietoL) {
          ptsDlaObecnego = juzBylSwieto ? 2 : 5;
        } else if (m.typ === 'DODATKOWY') {
          if (zakrystiaStan.recznieUstawionePunkty) {
            ptsDlaObecnego = zakrystiaStan.punktyLiturgii || 3;
          } else if (typeof m.obecnyPkt === 'number') {
            ptsDlaObecnego = m.obecnyPkt;
          } else if (czyDodatkowa) {
            ptsDlaObecnego = zakrystiaStan.punktyLiturgii || 3;
          } else {
            ptsDlaObecnego = czyNiedziela ? 1 : 2;
          }
        }`;

    const target2 = `          var isSwietoL = czyToDzienSwiateczny5Pkt(zakrystiaStan.dzien, zakrystiaStan.miesiacIdx, zakrystiaStan.rok, tabelaMiesiacaDane);
          var pktDlaDodatkowego = 2;
          var opisDodatkowy = '';
          if (zakrystiaStan.recznieUstawionePunkty) {
            pktDlaDodatkowego = zakrystiaStan.punktyLiturgii || 3;
            opisDodatkowy = 'Dodatkowa służba (+' + pktDlaDodatkowego + ' pkt)';
          } else if (isSwietoL) {`;

    const replace2 = `          var isSwietoL = czyToDzienSwiateczny5Pkt(zakrystiaStan.dzien, zakrystiaStan.miesiacIdx, zakrystiaStan.rok, tabelaMiesiacaDane);
          var pktDlaDodatkowego = 2;
          var opisDodatkowy = '';
          if (zakrystiaStan.recznieUstawionePunkty) {
            pktDlaDodatkowego = zakrystiaStan.punktyLiturgii || 3;
            opisDodatkowy = 'Dodatkowa służba (+' + pktDlaDodatkowego + ' pkt)';
          } else if (zakrystiaStan.rodzajLiturgii === 'nabozenstwo' || zakrystiaStan.czyLiturgiaDodatkowa || (zakrystiaStan.punktyLiturgii && zakrystiaStan.punktyLiturgii === 4)) {
            pktDlaDodatkowego = zakrystiaStan.punktyLiturgii || 4;
            opisDodatkowy = (zakrystiaStan.rodzajLiturgii === 'nabozenstwo' ? 'Nabożeństwo (+' : 'Dodatkowa liturgia (+') + pktDlaDodatkowego + ' pkt)';
          } else if (isSwietoL) {`;

    const target3 = `            var dodajPkt = (typeof m.obecnyPkt === 'number') ? m.obecnyPkt : (zakrystiaStan.punktyLiturgii || 3);
            if (isSwietoL) {
              if (m.typ === 'ZASTEPCA') {
                dodajPkt = (typeof m.obecnyPkt === 'number') ? m.obecnyPkt : 4;
              } else if (juzBylSwieto) {
                dodajPkt = 2; // Druga lub kolejna msza w święto: ZAWSZE +2 pkt!
              } else {
                dodajPkt = 5; // Pierwsza msza w święto: ZAWSZE +5 pkt!
              }
            } else if (m.typ === 'ZASTEPCA') {`;

    const replace3 = `            var dodajPkt = (typeof m.obecnyPkt === 'number') ? m.obecnyPkt : (zakrystiaStan.punktyLiturgii || 3);
            if (zakrystiaStan.rodzajLiturgii === 'nabozenstwo' || zakrystiaStan.czyLiturgiaDodatkowa || (zakrystiaStan.punktyLiturgii && zakrystiaStan.punktyLiturgii === 4)) {
              dodajPkt = (typeof m.obecnyPkt === 'number') ? m.obecnyPkt : (zakrystiaStan.punktyLiturgii || 4);
            } else if (isSwietoL) {
              if (m.typ === 'ZASTEPCA') {
                dodajPkt = (typeof m.obecnyPkt === 'number') ? m.obecnyPkt : 4;
              } else if (juzBylSwieto) {
                dodajPkt = 2; // Druga lub kolejna msza w święto: ZAWSZE +2 pkt!
              } else {
                dodajPkt = 5; // Pierwsza msza w święto: ZAWSZE +5 pkt!
              }
            } else if (m.typ === 'ZASTEPCA') {`;

    // Normalize CRLF to LF for matching, then do replacement
    let norm = content.replace(/\r\n/g, '\n');
    let patched = false;

    if (norm.includes(target1.replace(/\r\n/g, '\n'))) {
      norm = norm.replace(target1.replace(/\r\n/g, '\n'), replace1);
      patched = true;
    } else {
      console.warn('Target 1 not found in', filePath);
    }

    if (norm.includes(target2.replace(/\r\n/g, '\n'))) {
      norm = norm.replace(target2.replace(/\r\n/g, '\n'), replace2);
      patched = true;
    } else {
      console.warn('Target 2 not found in', filePath);
    }

    if (norm.includes(target3.replace(/\r\n/g, '\n'))) {
      norm = norm.replace(target3.replace(/\r\n/g, '\n'), replace3);
      patched = true;
    } else {
      console.warn('Target 3 not found in', filePath);
    }

    if (patched) {
      fs.writeFileSync(filePath, norm, 'utf8');
      console.log('Zaktualizowano plik:', filePath);
    }
  }

  console.log('\n=== KROK 2: Pobranie Październik_2026 i Listopad_2026 z Firestore ===');
  const octDoc = await fetchDoc('stan_grafiku', 'Październik_2026');
  const novDoc = await fetchDoc('stan_grafiku', 'Listopad_2026');

  if (!octDoc.fields || !novDoc.fields) {
    throw new Error('Nie udało się pobrać dokumentów Firestore.');
  }

  const octData = {};
  for (const k in octDoc.fields) octData[k] = fromFirestoreValue(octDoc.fields[k]);

  const novData = {};
  for (const k in novDoc.fields) novData[k] = fromFirestoreValue(novDoc.fields[k]);

  console.log('Pobrano dane. Liczba wierszy w Nov:', (novData.wiersze || []).length);
  console.log('Październik rankingMinusyRok len:', (octData.rankingMinusyRok || []).length);

  // 1. Skopiowanie pełnego rankingMinusyRok i rankingMinusy z Października
  const rankingMinusyRokNowy = JSON.parse(JSON.stringify(octData.rankingMinusyRok || []));
  const rankingMinusyNowy = JSON.parse(JSON.stringify(rankingMinusyRokNowy));

  // 2. Korekta punktów za dzień 1 w listopadzie (15:00 na cmentarzu = 4 pkt, 16:00 msza = 4 pkt)
  const boys15 = [
    'Maks Erich',
    'Maciej Erich',
    'Mikołaj Erich',
    'Rafał Danielczok',
    'Jakub Brytner',
    'Franek Kik',
    'Emil Czech',
    'Bartosz Rozik'
  ];

  (novData.wiersze || []).forEach(w => {
    if (!w.komorki || !w.komorki[0]) return;
    const c0 = w.komorki[0];
    let changed = false;

    // Check if 15:00 is present
    if (c0.liturgie && c0.liturgie['15:00'] !== undefined) {
      console.log(`[Dzień 1] ${w.nazwisko} 15:00 dotychczas: ${c0.liturgie['15:00']} -> zmieniam na 4`);
      c0.liturgie['15:00'] = 4;
      changed = true;
    }

    // Check if 16:00 is present
    if (c0.liturgie && c0.liturgie['16:00'] !== undefined) {
      console.log(`[Dzień 1] ${w.nazwisko} 16:00 dotychczas: ${c0.liturgie['16:00']} -> zmieniam na 4`);
      c0.liturgie['16:00'] = 4;
      changed = true;
    }

    if (changed) {
      // Przelicz wartość komórki 0
      let sumaC0 = 0;
      for (const g in c0.liturgie) {
        const p = c0.liturgie[g];
        const val = typeof p === 'number' ? p : (p && typeof p.punkty === 'number' ? p.punkty : parseFloat(p));
        if (!isNaN(val)) sumaC0 += val;
      }
      c0.wartosc = sumaC0;

      // Przelicz sumę całego wiersza
      let sumW = 0;
      w.komorki.forEach(c => {
        if (c.wartosc !== null && !isNaN(c.wartosc)) {
          sumW += c.wartosc;
        }
      });
      w.suma = sumW;
      console.log(`[Wiersz] ${w.nazwisko} nowa suma w listopadzie: ${w.suma}`);
    }
  });

  // 3. Przeliczenie rankingMiesiac dla listopada
  const nowyRankingMiesiac = (novData.wiersze || []).map(w => ({
    nazwisko: w.nazwisko,
    grupa: w.grupa,
    punkty: w.suma || 0,
    suma: w.suma || 0,
    normName: (w.nazwisko || '').toLowerCase().trim()
  }));
  nowyRankingMiesiac.sort((a, b) => b.punkty - a.punkty);
  let pM = 1;
  nowyRankingMiesiac.forEach((r, idx) => {
    if (idx > 0 && r.punkty < nowyRankingMiesiac[idx - 1].punkty) pM = idx + 1;
    r.pozycja = pM;
    r.miejsce = pM;
  });

  // 4. Przeliczenie rankingRok dla listopada:
  // Bierzemy dane z Października (punkty bazowe do końca października + punktyPoMiesiacach)
  // i dodajemy listopad (w.suma)!
  const octRok = octData.rankingRok || [];
  const nowyRankingRok = (novData.wiersze || []).map(w => {
    const octItem = octRok.find(r => czyToSamoNazwisko(r.nazwisko, w.nazwisko));
    const bazaPunkty = octItem ? (octItem.punkty || octItem.suma || 0) : 0;
    const sumaRok = bazaPunkty + (w.suma || 0);

    const pmOct = (octItem && Array.isArray(octItem.punktyPoMiesiacach))
      ? JSON.parse(JSON.stringify(octItem.punktyPoMiesiacach))
      : [];

    return {
      nazwisko: w.nazwisko,
      grupa: w.grupa,
      punkty: sumaRok,
      suma: sumaRok,
      normName: (w.nazwisko || '').toLowerCase().trim(),
      punktyPoMiesiacach: pmOct
    };
  });

  nowyRankingRok.sort((a, b) => b.punkty - a.punkty);
  let pR = 1;
  nowyRankingRok.forEach((r, idx) => {
    if (idx > 0 && r.punkty < nowyRankingRok[idx - 1].punkty) pR = idx + 1;
    r.pozycja = pR;
    r.miejsce = pR;
  });

  console.log('\n=== Nowy rankingRok dla Listopad_2026: ===');
  nowyRankingRok.forEach(r => console.log(`${r.pozycja}. ${r.nazwisko}: ${r.punkty} pkt (miesiące: ${r.punktyPoMiesiacach.length})`));

  console.log('\n=== KROK 3: Zapisanie zmian do Firestore w stan_grafiku/Listopad_2026 ===');
  const patchPayload = {
    wiersze: novData.wiersze,
    rankingMiesiac: nowyRankingMiesiac,
    ranking: nowyRankingMiesiac,
    rankingRok: nowyRankingRok,
    rankingMinusy: rankingMinusyNowy,
    rankingMinusyRok: rankingMinusyRokNowy
  };

  const updateMask = ['wiersze', 'rankingMiesiac', 'ranking', 'rankingRok', 'rankingMinusy', 'rankingMinusyRok'];
  await patchDoc('stan_grafiku', 'Listopad_2026', patchPayload, updateMask);
  console.log('Pomyślnie zaktualizowano stan_grafiku/Listopad_2026 w Firestore!');
}

run().catch(console.error);
