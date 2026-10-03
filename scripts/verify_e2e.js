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

    // Extract functions
    const rangiMatch = content.match(/var RANGI_GAMIFIKACJI = \[[\s\S]*?\];/);
    const wyznaczRangeMatch = content.match(/function wyznaczRangeGamifikacji[\s\S]*?\n    \}/);
    const wyznaczStopienMatch = content.match(/function wyznaczStopienMinistranta[\s\S]*?\n    \}/);
    const obliczGamifMatch = content.match(/function obliczGamifikacjeMinistranta[\s\S]*?\n    function otworzProfilMinistranta/);
    const generujStanMatch = content.match(/function generujStanZFirestore[\s\S]*?\n    function czyLiturgiaJuzMinela/);

    const fullCode = `
      var globalUser = { nazwisko: 'Maciej Erich', stan: docData };
      var tabelaMiesiacaDane = docData;
      var daneKolejnegoMiesiaca = null;
      function cleanTime(t) { return t || ''; }
      function czyToSamoNazwisko(a, b) { return (a||'').toLowerCase().trim() === (b||'').toLowerCase().trim(); }
      function wyznaczRotowaneGodzinyGrup(r, m) {
        return {
          'I GRUPA (CZERWONA)': '11:30',
          'II GRUPA (POMARAŃCZOWA)': '17:00',
          'III GRUPA (ZIELONA)': '08:30',
          'IV GRUPA (ŻÓŁTA)': '10:00'
        };
      }
      function dopasujGrupe(a, b) { return (a||'').toLowerCase().includes((b||'').toLowerCase()) || (b||'').toLowerCase().includes((a||'').toLowerCase()); }
      function parsujKluczMiesiaca(k) { return { rok: 2026, miesiacIdx: 9, nazwaMiesiaca: 'Październik' }; }
      function wyznaczKluczMiesiaca(d) { return 'Październik_2026'; }
      function pobierzAktywnyKluczMiesiaca() { return 'Październik_2026'; }
      function wyznaczGrupeParafialna(nazw) { return 'II GRUPA (POMARAŃCZOWA)'; }
      function czyTydzienMszaPrzeterminowana() { return false; }
      ${rangiMatch[0]}
      ${wyznaczRangeMatch[0]}
      ${wyznaczStopienMatch[0]}
      ${obliczGamifMatch[0].replace('function otworzProfilMinistranta', '')}
      ${generujStanMatch[0].replace('function czyLiturgiaJuzMinela', '')}
      return { generujStanZFirestore, obliczGamifikacjeMinistranta };
    `;

    const fns = new Function('docData', fullCode)(docData);
    const stan = fns.generujStanZFirestore('Maciej Erich', docData);
    const g = fns.obliczGamifikacjeMinistranta('Maciej Erich');

    console.log('=== TEST SUITE RESULT ===');
    console.log('1. NAJBLIŻSZA SŁUŻBA:');
    console.log(JSON.stringify(stan.najblizszaSluzba, null, 2));
    console.log('\n2. GAMIFIKACJA:');
    console.log('Stopień:', g.stopien);
    console.log('Ranga/Poziom:', g.ranga.lvl, g.ranga.nazwa);
    console.log('Całkowite XP:', g.calkowiteXp);
    console.log('Baza XP:', g.bazaXp);
    console.log('Bonus XP:', g.bonusXp, '(odznaki:', g.bonusOdznakiXp, ', stopień:', g.bonusStopienXp + ')');

    console.log('\n3. RANKING ROKU (TOP 5):');
    (stan.rankingRok || []).slice(0, 5).forEach(r => console.log(r.pozycja + '.', r.nazwisko, r.punkty, 'pkt'));

    console.log('\n4. RANKING MINUSÓW ROKU (TOP 6):');
    (stan.rankingMinusyRok || []).slice(0, 6).forEach(m => console.log(m.pozycja + '.', m.nazwisko, m.minusy, 'pkt (zdarzeń: ' + (m.szczegolyMinusow||[]).length + ')'));

    console.log('\n5. RANKING MINUSÓW MIESIĄCA (PAŹDZIERNIK):');
    (stan.rankingMinusyMiesiac || []).forEach(m => console.log(m.pozycja + '.', m.nazwisko, m.minusy, 'pkt'));
  });
});
