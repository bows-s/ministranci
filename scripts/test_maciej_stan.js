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
      function wyznaczRotowaneGodzinyGrup(r, m) {
        return {
          "I GRUPA (CZERWONA)": "11:30",
          "II GRUPA (POMARAŃCZOWA)": "17:00",
          "III GRUPA (ZIELONA)": "08:30",
          "IV GRUPA (ŻÓŁTA)": "10:00"
        };
      }
      function dopasujGrupe(a, b) {
        if (!a || !b) return false;
        return a.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(a.toLowerCase());
      }
      function parsujKluczMiesiaca(k) {
        return { rok: 2026, miesiacIdx: 9, nazwaMiesiaca: "Październik" };
      }
      function wyznaczKluczMiesiaca(d) {
        return "Październik_2026";
      }
      function pobierzAktywnyKluczMiesiaca() {
        return "Październik_2026";
      }
    `;

    const testFn = new Function(helpers + fnCode + '; return generujStanZFirestore;');
    const genStan = testFn();

    const stan = genStan('Maciej Erich', docData);
    console.log('=== STAN DLA MACIEJ ERICH ===');
    console.log('Uzytkownik:', stan.nazwisko);
    console.log('Punkty w pazdzierniku:', stan.punktyMiesiac);
    console.log('Pozycja w pazdzierniku:', stan.pozycjaMiesiac);
    console.log('Punkty caly rok (wrzesien + pazdziernik):', stan.punktyOdPoczatkuRoku);
    console.log('Pozycja caly rok:', stan.pozycjaRok);
    console.log('Najblizsza sluzba:', JSON.stringify(stan.najblizszaSluzba, null, 2));
    console.log('\nMoje dyzury tydzien (Pn-Pt):', JSON.stringify(stan.mojeDyzuryTydzien, null, 2));
    console.log('Godzina w niedziele:', stan.mojaGodzinaNiedziela);
    console.log('Aktywne zamiany na gieldzie:', stan.wolneZastepstwa.length);
  });
});
