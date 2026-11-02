const fs = require('fs');
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

async function restoreOctober() {
  console.log('=== KROK 1: Pobranie stanu Październik_2026 ===');
  const rawOct = await fetchDoc('stan_grafiku', 'Październik_2026');
  const oct = {};
  for (const k in rawOct.fields) oct[k] = fromFirestoreValue(rawOct.fields[k]);

  const wiersze = oct.wiersze;

  const attendanceIds = [
    'M9_27_1715',
    'M9_27_1800',
    'M9_28_1800',
    'M9_29_1700',
    'M9_30_1715',
    'M9_30_1800'
  ];

  const noweMinusyPaz = [];

  for (const id of attendanceIds) {
    const rawAtt = await fetchDoc('obecnosc', id);
    const att = {};
    for (const k in rawAtt.fields) att[k] = fromFirestoreValue(rawAtt.fields[k]);

    const dayIdx = att.dzien - 1; // 27 -> 26, 28 -> 27, 29 -> 28, 30 -> 29
    const gKey = att.godzina;

    console.log(`Przetwarzam ${id}: Dzień ${att.dzien}, ${gKey} (${att.dataTekst})`);

    (att.ministranci || []).forEach(m => {
      const w = wiersze.find(row => czyToSamoNazwisko(row.nazwisko, m.nazwisko));
      if (!w) {
        console.warn('Nie znaleziono wiersza dla:', m.nazwisko);
        return;
      }
      const cell = w.komorki[dayIdx];
      cell.liturgie = cell.liturgie || {};

      let pts = (m.punkty !== undefined) ? m.punkty : m.obecnyPkt;
      if (m.status === 'NIEOBECNY') {
        cell.liturgie[gKey] = -5;
        noweMinusyPaz.push({
          nazwisko: w.nazwisko,
          dzien: att.dzien,
          godzina: gKey,
          punkty: -5,
          miesiac: 'Październik',
          miesiacGen: 'października',
          rok: 2026,
          dzienTygodnia: att.dzien === 27 ? 'wtorek' : (att.dzien === 29 ? 'czwartek' : 'piątek')
        });
      } else if (m.status === 'USPRAWIEDLIWIONY') {
        cell.liturgie[gKey] = 0;
        cell.czyUsprawiedliwiony = true;
      } else if (m.status === 'OBECNY') {
        cell.liturgie[gKey] = pts;
      }
    });
  }

  // Przelicz wartości komórek i sumy wierszy w październiku
  wiersze.forEach(w => {
    let nowaSuma = 0;
    w.komorki.forEach((c) => {
      if (c.liturgie && Object.keys(c.liturgie).length > 0) {
        let sumC = 0;
        for (const k in c.liturgie) sumC += c.liturgie[k];
        c.wartosc = sumC;
      }
      if (typeof c.wartosc === 'number') nowaSuma += c.wartosc;
    });
    w.suma = nowaSuma;
  });

  console.log('\n=== Nowe sumy za październik: ===');
  wiersze.forEach(w => console.log(`${w.nazwisko}: ${w.suma} pkt`));

  // Przelicz rankingMiesiac dla października
  const nowyRankingMiesiacOct = wiersze.map(w => ({
    nazwisko: w.nazwisko,
    grupa: w.grupa,
    punkty: w.suma,
    suma: w.suma,
    normName: (w.nazwisko || '').toLowerCase().trim()
  })).sort((a, b) => b.punkty - a.punkty);

  let pMO = 1;
  nowyRankingMiesiacOct.forEach((r, idx) => {
    if (idx > 0 && r.punkty < nowyRankingMiesiacOct[idx - 1].punkty) pMO = idx + 1;
    r.pozycja = pMO;
    r.miejsce = pMO;
  });

  // Zaktualizuj minusy dla października
  let rankingMinusyRokOct = oct.rankingMinusyRok || [];
  noweMinusyPaz.forEach(nm => {
    let item = rankingMinusyRokOct.find(r => czyToSamoNazwisko(r.nazwisko, nm.nazwisko));
    if (!item) {
      const wFind = wiersze.find(w => czyToSamoNazwisko(w.nazwisko, nm.nazwisko));
      item = {
        nazwisko: nm.nazwisko,
        normName: nm.nazwisko.toLowerCase().trim(),
        grupa: wFind ? wFind.grupa : '',
        minusy: 0,
        szczegolyMinusow: []
      };
      rankingMinusyRokOct.push(item);
    }
    item.szczegolyMinusow = item.szczegolyMinusow || [];
    // Sprawdź czy ten minus już przypadkiem nie istnieje
    const exists = item.szczegolyMinusow.some(s => s.dzien === nm.dzien && s.miesiac === nm.miesiac && s.godzina === nm.godzina);
    if (!exists) {
      item.szczegolyMinusow.push({
        dzien: nm.dzien,
        godzina: nm.godzina,
        miesiac: nm.miesiac,
        miesiacGen: nm.miesiacGen,
        rok: nm.rok,
        dzienTygodnia: nm.dzienTygodnia,
        punkty: nm.punkty
      });
      item.minusy = (item.minusy || 0) + nm.punkty;
      console.log(`Dodano minus dla ${nm.nazwisko}: ${nm.dzien} października (${nm.godzina}): -5 pkt`);
    }
  });

  rankingMinusyRokOct.sort((a, b) => a.minusy - b.minusy);
  let pMin = 1;
  rankingMinusyRokOct.forEach((r, idx) => {
    if (idx > 0 && r.minusy > rankingMinusyRokOct[idx - 1].minusy) pMin = idx + 1;
    r.pozycja = pMin;
  });

  // Zaktualizuj rankingRok dla października
  let rankingRokOct = oct.rankingRok || [];
  rankingRokOct.forEach(r => {
    const w = wiersze.find(row => czyToSamoNazwisko(row.nazwisko, r.nazwisko));
    if (!w) return;
    r.punktyPoMiesiacach = r.punktyPoMiesiacach || [];
    let octEntry = r.punktyPoMiesiacach.find(pm => pm.miesiac === 'Październik' || pm.miesiacIdx === 9);
    if (octEntry) {
      octEntry.punkty = w.suma;
    } else {
      octEntry = {
        miesiac: 'Październik',
        miesiacIdx: 9,
        rok: 2026,
        punkty: w.suma,
        pozycja: 1
      };
      r.punktyPoMiesiacach.push(octEntry);
    }
    // Suma punktów z całego roku do końca października
    let total = 0;
    r.punktyPoMiesiacach.forEach(pm => {
      total += (pm.punkty || 0);
    });
    r.punkty = total;
    r.suma = total;
  });

  rankingRokOct.sort((a, b) => b.punkty - a.punkty);
  let pRO = 1;
  rankingRokOct.forEach((r, idx) => {
    if (idx > 0 && r.punkty < rankingRokOct[idx - 1].punkty) pRO = idx + 1;
    r.pozycja = pRO;
    r.miejsce = pRO;
    const octEntry = (r.punktyPoMiesiacach || []).find(pm => pm.miesiac === 'Październik' || pm.miesiacIdx === 9);
    if (octEntry) {
      const posOct = nowyRankingMiesiacOct.find(m => czyToSamoNazwisko(m.nazwisko, r.nazwisko));
      octEntry.pozycja = posOct ? posOct.pozycja : 1;
    }
  });

  console.log('\n=== Zapisywanie Październik_2026 i Pazdziernik_2026 ===');
  const octPatchPayload = {
    wiersze: wiersze,
    rankingMiesiac: nowyRankingMiesiacOct,
    ranking: nowyRankingMiesiacOct,
    rankingRok: rankingRokOct,
    rankingMinusy: rankingMinusyRokOct,
    rankingMinusyRok: rankingMinusyRokOct
  };
  const octUpdateMask = ['wiersze', 'rankingMiesiac', 'ranking', 'rankingRok', 'rankingMinusy', 'rankingMinusyRok'];

  await patchDoc('stan_grafiku', 'Październik_2026', octPatchPayload, octUpdateMask);
  await patchDoc('stan_grafiku', 'Pazdziernik_2026', octPatchPayload, octUpdateMask);
  console.log('✅ Zaktualizowano Październik_2026 i Pazdziernik_2026!');

  console.log('\n=== KROK 2: Aktualizacja Listopad_2026 na podstawie nowego zamknięcia października ===');
  const rawNov = await fetchDoc('stan_grafiku', 'Listopad_2026');
  const nov = {};
  for (const k in rawNov.fields) nov[k] = fromFirestoreValue(rawNov.fields[k]);

  // Skopiuj zaktualizowane minusy roczne do listopada
  const novMinusyRok = JSON.parse(JSON.stringify(rankingMinusyRokOct));

  // Przelicz rankingRok dla listopada: baza z października + punkty z listopada
  const nowyRankingRokNov = (nov.wiersze || []).map(w => {
    const octItem = rankingRokOct.find(r => czyToSamoNazwisko(r.nazwisko, w.nazwisko));
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

  nowyRankingRokNov.sort((a, b) => b.punkty - a.punkty);
  let pRN = 1;
  nowyRankingRokNov.forEach((r, idx) => {
    if (idx > 0 && r.punkty < nowyRankingRokNov[idx - 1].punkty) pRN = idx + 1;
    r.pozycja = pRN;
    r.miejsce = pRN;
  });

  console.log('\n=== Nowy rankingRok dla Listopad_2026: ===');
  nowyRankingRokNov.forEach(r => console.log(`${r.pozycja}. ${r.nazwisko}: ${r.punkty} pkt (miesiące: ${r.punktyPoMiesiacach.length})`));

  const novPatchPayload = {
    rankingRok: nowyRankingRokNov,
    rankingMinusy: novMinusyRok,
    rankingMinusyRok: novMinusyRok
  };
  await patchDoc('stan_grafiku', 'Listopad_2026', novPatchPayload, ['rankingRok', 'rankingMinusy', 'rankingMinusyRok']);
  console.log('✅ Zaktualizowano Listopad_2026!');
}

restoreOctober().catch(console.error);
