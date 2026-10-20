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

const url = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/stan_grafiku/Pa%C5%BAdziernik_2026?key=' + API_KEY;
https.get(url, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const json = JSON.parse(data);
    const fields = json.fields || {};
    const docData = {};
    for (const k in fields) docData[k] = fromFirestoreValue(fields[k]);

    const content = fs.readFileSync('Index.html', 'utf8');
    const startIdx = content.indexOf('function generujStanZFirestore(');
    const endIdx = content.indexOf('function czyLiturgiaJuzMinela(');
    const fnCode = content.substring(startIdx, endIdx);

    const helpers = `
      var tabelaMiesiacaDane = null;
      var daneKolejnegoMiesiaca = null;
      function cleanTime(t) { return t || ''; }
      function czyToSamoNazwisko(a, b) {
        if (!a || !b) return false;
        return a.toLowerCase().trim() === b.toLowerCase().trim();
      }
      function wyznaczRotowaneGodzinyGrup() { return {}; }
      function dopasujGrupe() { return false; }
      function parsujKluczMiesiaca() { return {}; }
      function wyznaczKluczMiesiaca() { return "Październik_2026"; }
      function pobierzAktywnyKluczMiesiaca() { return "Październik_2026"; }
      function czyTydzienMszaPrzeterminowana() { return false; }
      function czyWeekendMszaPrzeterminowana() { return false; }
    `;

    const testFn = new Function(helpers + fnCode + '; return generujStanZFirestore;');
    const genStan = testFn();

    // SYMULACJA: docData.rankingMiesiac ma stare dane (np. 10 zamiast 46)!
    docData.rankingMiesiac = [{ nazwisko: 'Maciej Erich', punkty: 10, pozycja: 5 }];

    (docData.wiersze || []).forEach(w => {
      const stan = genStan(w.nazwisko, docData);
      console.log(w.nazwisko + ': w.suma=' + w.suma + ', stan.punktyMiesiac=' + stan.punktyMiesiac + ', stan.pozycjaMiesiac=' + stan.pozycjaMiesiac + ', stan.punktyRok=' + stan.punktyOdPoczatkuRoku + ', stan.pozycjaRok=' + stan.pozycjaRok);
    });
  });
});
