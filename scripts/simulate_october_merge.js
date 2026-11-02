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

function getDoc(coll, id) {
  return new Promise((resolve) => {
    const url = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/' + coll + '/' + encodeURIComponent(id) + '?key=' + API_KEY;
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

function czyToSamoNazwisko(a, b) {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

async function simulate() {
  const oct = await getDoc('stan_grafiku', 'Październik_2026');
  const wiersze = JSON.parse(JSON.stringify(oct.wiersze));

  const attendanceIds = [
    'M9_27_1715',
    'M9_27_1800',
    'M9_28_1800',
    'M9_29_1700',
    'M9_30_1715',
    'M9_30_1800'
  ];

  for (const id of attendanceIds) {
    const att = await getDoc('obecnosc', id);
    const dayIdx = att.dzien - 1; // 27 -> 26, 28 -> 27, 29 -> 28, 30 -> 29
    const gKey = att.godzina;

    (att.ministranci || []).forEach(m => {
      const w = wiersze.find(row => czyToSamoNazwisko(row.nazwisko, m.nazwisko));
      if (!w) {
        console.warn('Nie znaleziono wiersza dla:', m.nazwisko);
        return;
      }
      const cell = w.komorki[dayIdx];
      cell.liturgie = cell.liturgie || {};
      
      let pts = m.punkty !== undefined ? m.punkty : m.obecnyPkt;
      if (m.status === 'NIEOBECNY') {
        cell.liturgie[gKey] = -5;
      } else if (m.status === 'USPRAWIEDLIWIONY') {
        cell.liturgie[gKey] = 0;
        cell.czyUsprawiedliwiony = true;
      } else if (m.status === 'OBECNY') {
        cell.liturgie[gKey] = pts;
      }
    });
  }

  // Przelicz wartości komórek i sumy wierszy
  console.log('=== ZMIANY PUNKTÓW W PAŹDZIERNIKU (po scaleniu 27-30 października) ===');
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
    const staraSuma = (oct.wiersze.find(ow => ow.nazwisko === w.nazwisko) || {}).suma || 0;
    const diff = nowaSuma - staraSuma;
    console.log(`${w.nazwisko}: ${staraSuma} -> ${nowaSuma} pkt (${diff >= 0 ? '+' : ''}${diff})`);
    w.suma = nowaSuma;
  });
}
simulate();
