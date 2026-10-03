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

    let content = fs.readFileSync('Index.html', 'utf8');

    const startIdx = content.indexOf('function generujStanZFirestore(');
    const endIdx = content.indexOf('function czyLiturgiaJuzMinela(');
    const fnCode = content.substring(startIdx, endIdx);

    const helpers = `
      var tabelaMiesiacaDane = null;
      var daneKolejnegoMiesiaca = null;
      function cleanTime(t) { return t || ''; }
      function czyToSamoNazwisko(a, b) { return (a||'').toLowerCase().trim() === (b||'').toLowerCase().trim(); }
      function wyznaczRotowaneGodzinyGrup(r, m) {
        return {
          "I GRUPA (CZERWONA)": "11:30",
          "II GRUPA (POMARAŃCZOWA)": "17:00",
          "III GRUPA (ZIELONA)": "08:30",
          "IV GRUPA (ŻÓŁTA)": "10:00"
        };
      }
      function dopasujGrupe(a, b) { return (a||'').toLowerCase().includes((b||'').toLowerCase()) || (b||'').toLowerCase().includes((a||'').toLowerCase()); }
      function parsujKluczMiesiaca(k) { return { rok: 2026, miesiacIdx: 9, nazwaMiesiaca: "Październik" }; }
      function wyznaczKluczMiesiaca(d) { return "Październik_2026"; }
      function pobierzAktywnyKluczMiesiaca() { return "Październik_2026"; }
      var RANGI_GAMIFIKACJI = [
        { lvl: 1, nazwa: 'Debiutant', minXp: 0, kolor: '#a1a1aa', bg: 'rgba(161,161,170,0.1)' },
        { lvl: 2, nazwa: 'Dyżurny', minXp: 75, kolor: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
        { lvl: 3, nazwa: 'Stały Bywalec', minXp: 200, kolor: '#34d399', bg: 'rgba(52,211,153,0.1)' },
        { lvl: 4, nazwa: 'Doświadczony', minXp: 400, kolor: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
        { lvl: 5, nazwa: 'Weteran Ołtarza', minXp: 700, kolor: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
        { lvl: 6, nazwa: 'Mistrz Liturgii', minXp: 1100, kolor: '#f43f5e', bg: 'rgba(244,63,94,0.1)' },
        { lvl: 7, nazwa: 'Legenda Zakrystii', minXp: 1600, kolor: '#e879f9', bg: 'rgba(232,121,249,0.15)' }
      ];
      function wyznaczRangeGamifikacji(xp) {
        var xpVal = Math.max(0, parseInt(xp, 10) || 0);
        for (var i = RANGI_GAMIFIKACJI.length - 1; i >= 0; i--) {
          var r = RANGI_GAMIFIKACJI[i];
          if (xpVal >= r.minXp) {
            var nastepna = (i < RANGI_GAMIFIKACJI.length - 1) ? RANGI_GAMIFIKACJI[i + 1] : null;
            return {
              ranga: r,
              lvl: r.lvl,
              nazwa: r.nazwa,
              kolor: r.kolor,
              bg: r.bg,
              procent: 50,
              brakujeDoNast: nastepna ? (nastepna.minXp - xpVal) : 0,
              nastepnaNazwa: nastepna ? nastepna.nazwa : '',
              zakresKonca: nastepna ? nastepna.minXp : 2000
            };
          }
        }
        return { ranga: RANGI_GAMIFIKACJI[0], lvl: 1, nazwa: 'Debiutant' };
      }
    `;

    const testFn = new Function(helpers + fnCode + '; return generujStanZFirestore;');
    const genStan = testFn();

    const stan = genStan('Maciej Erich', docData);
    console.log('=== WYNIK DLA MACIEJA ERICHA BEZPOŚREDNIO Z Index.html ===');
    console.log('Użytkownik:', stan.nazwisko);
    console.log('Stopień:', stan.stopien);
    console.log('Grupa:', stan.grupa);
    console.log('Poziom (Gamifikacja):', stan.ranga.lvl, '-', stan.ranga.nazwa);
    console.log('XP Całkowite:', stan.calkowiteXp);
    console.log('Baza XP (służby):', stan.bazaXp);
    console.log('Bonus XP (odznaki + stopień):', stan.bonusXp, '(odznaki:', stan.bonusOdznakiXp, ', stopień:', stan.bonusStopienXp + ')');
    console.log('Punkty w październiku:', stan.punktyMiesiac);
    console.log('Najbliższa służba:');
    console.log(JSON.stringify(stan.najblizszaSluzba, null, 2));
  });
});
