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

function getDoc(col, docId) {
  return new Promise((resolve) => {
    const url = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/' + col + '/' + encodeURIComponent(docId) + '?key=' + API_KEY;
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

async function inspect() {
  const wrz = await getDoc('stan_grafiku', 'Wrzesień_2026');
  
  console.log('=== ZAMIANY / ZASTĘPSTWA DLA DNI 10 I 24 WRZEŚNIA ===');
  const allZ = [].concat(wrz.zamianyZastepstwa || [], wrz.wolneZastepstwa || []);
  allZ.filter(z => z && (z.dzien === 10 || z.dzien === 24)).forEach(z => console.log(JSON.stringify(z)));

  console.log('\n=== OBECNOSC/10_1700 ===');
  const ob10 = await getDoc('obecnosc', '10_1700');
  if (ob10) {
    console.log('Data:', ob10.dataTekst, 'Liturgia:', ob10.nazwaLiturgii, 'Punkty:', ob10.punktyLiturgii);
    (ob10.ministranci || []).forEach(m => console.log(`- ${m.nazwisko}: status=${m.status}, typ=${m.typ}, obecnyPkt=${m.obecnyPkt}, punkty=${m.punkty}, zastepuje=${m.zastepuje}, opisGieldy=${m.opisGieldy}`));
  }

  console.log('\n=== OBECNOSC/24_1700 ===');
  const ob24 = await getDoc('obecnosc', '24_1700');
  if (ob24) {
    console.log('Data:', ob24.dataTekst, 'Liturgia:', ob24.nazwaLiturgii, 'Punkty:', ob24.punktyLiturgii);
    (ob24.ministranci || []).forEach(m => console.log(`- ${m.nazwisko}: status=${m.status}, typ=${m.typ}, obecnyPkt=${m.obecnyPkt}, punkty=${m.punkty}, zastepuje=${m.zastepuje}, opisGieldy=${m.opisGieldy}`));
  }

  console.log('\n=== HISTORIA WPISÓW DLA DNI 10 I 24 WRZEŚNIA ===');
  (wrz.historiaWpisow || []).filter(h => h.dzien && (h.dzien.includes('10') || h.dzien.includes('24') || h.dzien.includes('Sep 10') || h.dzien.includes('Sep 24'))).forEach(h => {
    console.log(h);
  });

  console.log('\n=== AKTUALNE KOMÓRKI W WIERSZACH (Dzień 3 - idx 2, Dzień 10 - idx 9, Dzień 24 - idx 23) ===');
  wrz.wiersze.forEach(w => {
    const k3 = w.komorki[2];
    const k10 = w.komorki[9];
    const k24 = w.komorki[23];
    const v3 = k3 ? k3.wartosc : null;
    const v10 = k10 ? k10.wartosc : null;
    const v24 = k24 ? k24.wartosc : null;
    if (v3 !== null || v10 !== null || v24 !== null || (k3 && k3.maDyzur) || (k10 && k10.maDyzur) || (k24 && k24.maDyzur)) {
      console.log(`${w.nazwisko} (${w.grupa}): D3={wartosc:${v3}, maDyzur:${k3 ? k3.maDyzur : false}}, D10={wartosc:${v10}, maDyzur:${k10 ? k10.maDyzur : false}}, D24={wartosc:${v24}, maDyzur:${k24 ? k24.maDyzur : false}}`);
    }
  });
}

inspect();
