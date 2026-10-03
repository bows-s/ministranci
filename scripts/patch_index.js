const fs = require('fs');

let html = fs.readFileSync('Index.html', 'utf8');

// 1. Pulpit buttons: anulujUsprawiedliwienieNiedziela and otworzModalOddajDyzur
const oldBtn1 = "onclick=\"anulujUsprawiedliwienieNiedziela(' + item.dzien + ')\"";
const newBtn1 = "onclick=\"anulujUsprawiedliwienieNiedziela(' + (item.dzienNiedzieli || item.dzien) + ')\"";
if (html.includes(oldBtn1)) {
  html = html.replace(oldBtn1, newBtn1);
  console.log('Patched btn1 (anulujUsprawiedliwienieNiedziela)');
} else {
  console.log('btn1 already patched or not found');
}

const oldBtn2 = "onclick=\"otworzModalOddajDyzur(' + item.dzien + ', \\'Weekend\\', \\'' + (item.godzina || '') + '\\', ' + res.rok + ', ' + res.miesiacIdx + ')\"";
const newBtn2 = "onclick=\"otworzModalOddajDyzur(' + (item.dzienNiedzieli || item.dzien) + ', \\'Weekend\\', \\'' + (item.godzina || '') + '\\', ' + res.rok + ', ' + res.miesiacIdx + ')\"";
if (html.includes(oldBtn2)) {
  html = html.replace(oldBtn2, newBtn2);
  console.log('Patched btn2 (otworzModalOddajDyzur weekend)');
} else {
  console.log('btn2 already patched or not found');
}

// 2. najblizszaSluzba Saturday 17:00 check & Sunday skip
const targetNajblizsza = 'var isSunday = (dtCheck.getDay() === 0);';
const replaceNajblizsza = `var dowCheck = dtCheck.getDay();
        var isSunday = (dowCheck === 0);
        var isSaturday = (dowCheck === 6);

        // Sprawdź czy to sobota i ministrant ma mszę niedzielną w wigilię (sobota 17:00)
        if (isSaturday) {
          var nextSunD = d + 1;
          var kNextSun = (nextSunD <= daysInMonth && userRow && userRow.komorki) ? userRow.komorki[nextSunD - 1] : null;
          var godzinaWknd = (godzinyWeekendy[nextSunD] && godzinyWeekendy[nextSunD].godzina) || mojaGodzinaNiedziela;
          if (cleanTime(godzinaWknd) === '17:00' && kNextSun && kNextSun.maDyzur) {
            var oddaneSat = mojeOddaneZastepstwa[d] || mojeOddaneZastepstwa[nextSunD];
            if (!oddaneSat || (oddaneSat.status !== "OCZEKUJE" && oddaneSat.status !== "PRZEJETE" && oddaneSat.status !== "ZREALIZOWANE")) {
              if (!(d === currentDay && (czyMszaJuzMinaDzisLocal('17:00') || (k && k.wartosc !== null && k.wartosc !== undefined && k.wartosc !== "")))) {
                najblizszaSluzba = {
                  jest: true,
                  dzien: d,
                  tekst: (d === currentDay ? 'DZIŚ • ' : (d === currentDay + 1 ? 'JUTRO • ' : '')) + d + ' ' + currentMonthNameGenitive + ' (Sb)',
                  typ: 'Msza niedzielna (sobota 17:00)',
                  godzina: '17:00'
                };
                break;
              }
            }
          }
        }`;

if (html.includes(targetNajblizsza) && !html.includes('isSaturday = (dowCheck === 6);')) {
  html = html.replace(targetNajblizsza, replaceNajblizsza);
  console.log('Patched najblizszaSluzba Saturday check');
}

const targetSunSkip = "var godzinaSluzby = isSunday ? ((godzinyWeekendy[d] && godzinyWeekendy[d].godzina) || mojaGodzinaNiedziela) : '18:00';";
const replaceSunSkip = `var godzinaSluzby = isSunday ? ((godzinyWeekendy[d] && godzinyWeekendy[d].godzina) || mojaGodzinaNiedziela) : '18:00';
          if (isSunday && cleanTime(godzinaSluzby) === '17:00') {
            continue; // W niedzielę o 17:00 nie ma mszy - odbyła się w sobotę wieczorem!
          }`;
if (html.includes(targetSunSkip) && !html.includes('W niedzielę o 17:00 nie ma mszy')) {
  html = html.replace(targetSunSkip, replaceSunSkip);
  console.log('Patched najblizszaSluzba Sunday 17:00 skip');
}

// 3. Zakrystia: aktualizujGodzinyZakrystiiDlaDnia I Sobota
const targetZkHours = `      } else if (dow === 6) {
        optHtml += '<option value="17:00">17:00</option>';`;
const replaceZkHours = `      } else if (dow === 6) {
        if (d <= 7) {
          optHtml += '<option value="08:00">08:00 (Msza Róży Różańcowej - 4 pkt)</option>';
        }
        optHtml += '<option value="17:00">17:00</option>';`;
if (html.includes(targetZkHours)) {
  html = html.replace(targetZkHours, replaceZkHours);
  console.log('Patched aktualizujGodzinyZakrystiiDlaDnia');
}

// 4. Zakrystia: budujZakrystie initial time and I Sobota rose detection
const targetInitSat = `            } else if (dow === 6) {
              gStr = "17:00";`;
const replaceInitSat = `            } else if (dow === 6) {
              if (dNum <= 7 && now.getHours() < 12) {
                gStr = "08:00";
              } else {
                gStr = "17:00";
              }`;
if (html.includes(targetInitSat)) {
  html = html.replace(targetInitSat, replaceInitSat);
  console.log('Patched budujZakrystie initial Saturday hour');
}

const targetDomyslny = `        var isWeekendMass = (dow === 0) || (dow === 6 && gStr === "17:00");
        var dSun = (dow === 6) ? (dNum + 1) : dNum;
        var sunColIdx = dSun - 1;

        var domyslnyRodzaj = isWeekendMass ? 'msza_niedziela' : 'msza_tydzien';
        var domyslnePkt = isWeekendMass ? 3 : 5;
        var domyslnaNazwa = isWeekendMass ? (dow === 6 ? 'Msza w niedzielę (sobota 17:00)' : 'Msza w niedzielę') : 'Msza w tygodniu';`;

const replaceDomyslny = `        var isFirstSatRose = (dow === 6 && dNum <= 7 && cleanTime(gStr) === "08:00");
        var isWeekendMass = (dow === 0) || (dow === 6 && cleanTime(gStr) === "17:00");
        var dSun = (dow === 6) ? (dNum + 1) : dNum;
        var sunColIdx = dSun - 1;

        var domyslnyRodzaj = isFirstSatRose ? 'nabozenstwo' : (isWeekendMass ? 'msza_niedziela' : 'msza_tydzien');
        var domyslnePkt = isFirstSatRose ? 4 : (isWeekendMass ? 3 : 5);
        var domyslnaNazwa = isFirstSatRose ? 'Msza Róży Różańcowej (Msza + Różaniec)' : (isWeekendMass ? (dow === 6 ? 'Msza w niedzielę (sobota 17:00)' : 'Msza w niedzielę') : 'Msza w tygodniu');`;

if (html.includes(targetDomyslny)) {
  html = html.replace(targetDomyslny, replaceDomyslny);
  console.log('Patched budujZakrystie default points for I Sobota');
}

// 5. otworzModalOddajDyzur formatting for Saturday vigil
const targetModalDataStr = 'var dataStr = formatujDateDnia(dzien, stanOdd, targetRok, targetMiesiacIdx);';
const replaceModalDataStr = `var realModalD = dzien;
      if (isWeekend && cleanTime(godzina) === '17:00') {
        var dowM = new Date(targetRok, targetMiesiacIdx, dzien).getDay();
        realModalD = (dowM === 0) ? (dzien - 1) : dzien;
      }
      var dataStr = formatujDateDnia(realModalD, stanOdd, targetRok, targetMiesiacIdx);`;
if (html.includes(targetModalDataStr)) {
  html = html.replace(targetModalDataStr, replaceModalDataStr);
  console.log('Patched otworzModalOddajDyzur dataStr');
}

// 6. wykonajOddajDyzur Saturday targetIdx
const targetWykonajIdx = `            if (isWeekend && cleanTime(godz) === '17:00') {
              // Rzeczywista msza jest w sobotę o 17:00 (dOdd to niedziela)! Wpisujemy 0 w sobotę:
              targetIdx = dOdd - 2;
              // Niedziela ma pozostać pusta / czysta
              if (row.komorki[dOdd - 1] && (row.komorki[dOdd - 1].wartosc === 0 || row.komorki[dOdd - 1].wartosc === '0')) {
                row.komorki[dOdd - 1].wartosc = null;
              }
            }`;
const replaceWykonajIdx = `            if (isWeekend && cleanTime(godz) === '17:00') {
              var dowOdd = new Date(data.rok, data.miesiacIdx, dOdd).getDay();
              targetIdx = (dowOdd === 0) ? (dOdd - 2) : (dOdd - 1);
              var sunIdx = (dowOdd === 0) ? (dOdd - 1) : dOdd;
              if (row.komorki[sunIdx] && (row.komorki[sunIdx].wartosc === 0 || row.komorki[sunIdx].wartosc === '0')) {
                row.komorki[sunIdx].wartosc = null;
              }
            }`;
if (html.includes(targetWykonajIdx)) {
  html = html.replace(targetWykonajIdx, replaceWykonajIdx);
  console.log('Patched wykonajOddajDyzur targetIdx');
}

fs.writeFileSync('Index.html', html, 'utf8');
console.log('Index.html successfully updated!');
