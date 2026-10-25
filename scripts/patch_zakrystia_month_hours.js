const fs = require('fs');
const path = require('path');

// 1. Patch public/js/utils.js
const utilsPath = path.join(__dirname, '..', 'public', 'js', 'utils.js');
let utilsContent = fs.readFileSync(utilsPath, 'utf8');
const hasCrlfUtils = utilsContent.includes('\r\n');
if (hasCrlfUtils) utilsContent = utilsContent.replace(/\r\n/g, '\n');

const targetUtils = `    function pobierzGodzineDlaDniaTygodnia(rok, miesiacIdx, dzien) {
      if (dzien) {
        var hD = null;
        if (typeof tabelaMiesiacaDane !== 'undefined' && tabelaMiesiacaDane && tabelaMiesiacaDane.harmonogramDni) {
          hD = tabelaMiesiacaDane.harmonogramDni[dzien] || tabelaMiesiacaDane.harmonogramDni['' + dzien];
        }
        if (!hD && typeof daneKolejnegoMiesiaca !== 'undefined' && daneKolejnegoMiesiaca && daneKolejnegoMiesiaca.harmonogramDni) {
          hD = daneKolejnegoMiesiaca.harmonogramDni[dzien] || daneKolejnegoMiesiaca.harmonogramDni['' + dzien];
        }
        if (hD && hD.msze && hD.msze.length > 0) {`;

const replacementUtils = `    function pobierzGodzineDlaDniaTygodnia(rok, miesiacIdx, dzien) {
      if (dzien) {
        var hD = null;
        var curActiveM = (typeof tabelaMiesiacaDane !== 'undefined' && tabelaMiesiacaDane && tabelaMiesiacaDane.miesiacIdx !== undefined) ? tabelaMiesiacaDane.miesiacIdx : (new Date()).getMonth();
        if (miesiacIdx === curActiveM && typeof tabelaMiesiacaDane !== 'undefined' && tabelaMiesiacaDane && tabelaMiesiacaDane.harmonogramDni) {
          hD = tabelaMiesiacaDane.harmonogramDni[dzien] || tabelaMiesiacaDane.harmonogramDni['' + dzien];
        } else if (typeof daneKolejnegoMiesiaca !== 'undefined' && daneKolejnegoMiesiaca && (daneKolejnegoMiesiaca.miesiacIdx === miesiacIdx || daneKolejnegoMiesiaca.miesiacIdx === undefined) && daneKolejnegoMiesiaca.harmonogramDni) {
          hD = daneKolejnegoMiesiaca.harmonogramDni[dzien] || daneKolejnegoMiesiaca.harmonogramDni['' + dzien];
        }
        if (hD && hD.msze && hD.msze.length > 0) {`;

if (utilsContent.includes(targetUtils)) {
  utilsContent = utilsContent.replace(targetUtils, replacementUtils);
  console.log('[OK] Patched utils.js pobierzGodzineDlaDniaTygodnia');
} else {
  console.warn('[WARN] targetUtils not found');
}

if (hasCrlfUtils) utilsContent = utilsContent.replace(/\n/g, '\r\n');
fs.writeFileSync(utilsPath, utilsContent, 'utf8');

// 2. Patch public/js/zakrystia.js
const zakrystiaPath = path.join(__dirname, '..', 'public', 'js', 'zakrystia.js');
let zakContent = fs.readFileSync(zakrystiaPath, 'utf8');
const hasCrlfZak = zakContent.includes('\r\n');
if (hasCrlfZak) zakContent = zakContent.replace(/\r\n/g, '\n');

const targetZakHours = `    function aktualizujGodzinyZakrystiiDlaDnia(d, wybranaGodz, optM, optR) {
      var selG = document.getElementById('sel-zakrystia-godzina');
      if (!selG) return;
      var m = (optM !== undefined && optM !== null) ? optM : ((zakrystiaStan && zakrystiaStan.miesiacIdx !== undefined) ? zakrystiaStan.miesiacIdx : (new Date()).getMonth());
      var r = optR || (zakrystiaStan && zakrystiaStan.rok) || (new Date()).getFullYear();
      var dt = new Date(r, m, d);
      var dow = dt.getDay();
      var optHtml = '';

      var hD = null;
      if (tabelaMiesiacaDane && tabelaMiesiacaDane.harmonogramDni && tabelaMiesiacaDane.harmonogramDni[d]) {
        hD = tabelaMiesiacaDane.harmonogramDni[d];
      } else if (daneKolejnegoMiesiaca && daneKolejnegoMiesiaca.harmonogramDni && daneKolejnegoMiesiaca.harmonogramDni[d]) {
        hD = daneKolejnegoMiesiaca.harmonogramDni[d];
      }

      if (hD && ((hD.msze && hD.msze.length > 0) || (hD.nabozenstwa && hD.nabozenstwa.length > 0))) {
        if (hD.msze && hD.msze.length > 0) {
          hD.msze.forEach(function(mItem) {
            var gC = cleanTime(mItem.godzina);
            var mTyp = mItem.typ || (dow === 0 ? 'msza_niedziela' : 'msza_tydzien');
            optHtml += '<option value="' + gC + '" data-rodzaj="' + mTyp + '" data-punkty="' + mItem.punkty + '" data-nazwa="' + mItem.nazwa + '">' + gC + ' (' + mItem.nazwa + ' - ' + mItem.punkty + ' pkt)</option>';
          });
        }
        if (hD.nabozenstwa && hD.nabozenstwa.length > 0) {
          hD.nabozenstwa.forEach(function(nItem) {
            var gC = cleanTime(nItem.godzina);
            if (optHtml.indexOf('value="' + gC + '"') === -1) {
              optHtml += '<option value="' + gC + '" data-rodzaj="nabozenstwo" data-punkty="' + nItem.punkty + '" data-nazwa="' + nItem.nazwa + '">' + gC + ' (' + nItem.nazwa + ' - ' + nItem.punkty + ' pkt)</option>';
            }
          });
        }
      } else {
        if (dow === 0) {
          optHtml += '<option value="08:30" data-rodzaj="msza_niedziela" data-punkty="3" data-nazwa="Msza św. niedzielna">08:30 (Msza św. niedzielna - 3 pkt)</option>';
          optHtml += '<option value="10:00" data-rodzaj="msza_niedziela" data-punkty="3" data-nazwa="Msza św. niedzielna">10:00 (Msza św. niedzielna - 3 pkt)</option>';
          optHtml += '<option value="11:30" data-rodzaj="msza_niedziela" data-punkty="3" data-nazwa="Msza św. niedzielna">11:30 (Msza św. niedzielna - 3 pkt)</option>';
        } else if (dow === 6) {
          if (d <= 7) {
            optHtml += '<option value="08:00" data-rodzaj="msza_roza" data-punkty="4" data-nazwa="Msza Róży Różańcowej">08:00 (Msza Róży Różańcowej - 4 pkt)</option>';
          }
          optHtml += '<option value="17:00" data-rodzaj="msza_niedziela" data-punkty="3" data-nazwa="Msza św. - Wigilia niedzielna">17:00 (Msza św. - Wigilia niedzielna - 3 pkt)</option>';
        } else if (dow === 4) {
          optHtml += '<option value="17:00" data-rodzaj="msza_szkolna" data-punkty="5" data-nazwa="Msza św. szkolna">17:00 (Msza św. szkolna - 5 pkt)</option>';
        } else {
          optHtml += '<option value="18:00" data-rodzaj="msza_tydzien" data-punkty="5" data-nazwa="Msza św.">18:00 (Msza św. - 5 pkt)</option>';
        }
      }`;

const replacementZakHours = `    function aktualizujGodzinyZakrystiiDlaDnia(d, wybranaGodz, optM, optR) {
      var selG = document.getElementById('sel-zakrystia-godzina');
      if (!selG) return;
      var curStan = zakrystiaStan || {};
      var curActiveM = (tabelaMiesiacaDane && tabelaMiesiacaDane.miesiacIdx !== undefined) ? tabelaMiesiacaDane.miesiacIdx : (new Date()).getMonth();
      var m = (optM !== undefined && optM !== null) ? optM : ((curStan.miesiacIdx !== undefined) ? curStan.miesiacIdx : curActiveM);
      var r = optR || curStan.rok || (new Date()).getFullYear();
      var dt = new Date(r, m, d);
      var dow = dt.getDay();
      var optHtml = '';

      var hD = null;
      var tabelaZrodlowa = null;
      if (m === curActiveM) {
        tabelaZrodlowa = tabelaMiesiacaDane;
      } else {
        if (daneKolejnegoMiesiaca && (daneKolejnegoMiesiaca.miesiacIdx === m || (daneKolejnegoMiesiaca.miesiacIdx === undefined && m === (curActiveM + 1) % 12))) {
          tabelaZrodlowa = daneKolejnegoMiesiaca;
        } else {
          try {
            var nDocKey = (typeof wyznaczKluczMiesiaca === 'function') ? wyznaczKluczMiesiaca(new Date(r, m, 1)) : ('Listopad_' + r);
            var rawNext = localStorage.getItem('min_cached_tabela_' + nDocKey);
            if (rawNext) {
              tabelaZrodlowa = JSON.parse(rawNext);
              daneKolejnegoMiesiaca = tabelaZrodlowa;
            }
          } catch(eNext) {}
        }
      }

      if (tabelaZrodlowa && tabelaZrodlowa.harmonogramDni) {
        hD = tabelaZrodlowa.harmonogramDni[d] || tabelaZrodlowa.harmonogramDni['' + d] || null;
      }

      if (hD && ((hD.msze && hD.msze.length > 0) || (hD.nabozenstwa && hD.nabozenstwa.length > 0))) {
        if (hD.msze && hD.msze.length > 0) {
          hD.msze.forEach(function(mItem) {
            var gC = cleanTime(mItem.godzina);
            var mTyp = mItem.typ || (dow === 0 ? 'msza_niedziela' : 'msza_tydzien');
            optHtml += '<option value="' + gC + '" data-rodzaj="' + mTyp + '" data-punkty="' + mItem.punkty + '" data-nazwa="' + mItem.nazwa + '">' + gC + ' (' + mItem.nazwa + ' - ' + mItem.punkty + ' pkt)</option>';
          });
        }
        if (hD.nabozenstwa && hD.nabozenstwa.length > 0) {
          hD.nabozenstwa.forEach(function(nItem) {
            var gC = cleanTime(nItem.godzina);
            if (optHtml.indexOf('value="' + gC + '"') === -1) {
              optHtml += '<option value="' + gC + '" data-rodzaj="nabozenstwo" data-punkty="' + nItem.punkty + '" data-nazwa="' + nItem.nazwa + '">' + gC + ' (' + nItem.nazwa + ' - ' + nItem.punkty + ' pkt)</option>';
            }
          });
        }
      } else {
        // Sprawdź czy to święto / uroczystość (np. 1 listopada - Wszystkich Świętych)
        var litInfo = (typeof wyznaczDaneLiturgiczne === 'function') ? wyznaczDaneLiturgiczne(dt) : null;
        var isHoliday = (d === 1 && m === 10) || (litInfo && (litInfo.ranga === 'Uroczystość' || (litInfo.nazwa && litInfo.nazwa.indexOf('Wszystkich Świętych') !== -1)));

        if (d === 1 && m === 10) {
          // Uroczystość Wszystkich Świętych (1 listopada)
          optHtml += '<option value="08:30" data-rodzaj="msza_swieto" data-punkty="5" data-nazwa="Uroczystość Wszystkich Świętych">08:30 (Uroczystość Wszystkich Świętych - 5 pkt)</option>';
          optHtml += '<option value="10:00" data-rodzaj="msza_swieto" data-punkty="5" data-nazwa="Uroczystość Wszystkich Świętych">10:00 (Uroczystość Wszystkich Świętych - 5 pkt)</option>';
          optHtml += '<option value="11:30" data-rodzaj="msza_swieto" data-punkty="5" data-nazwa="Uroczystość Wszystkich Świętych">11:30 (Uroczystość Wszystkich Świętych - 5 pkt)</option>';
          optHtml += '<option value="15:00" data-rodzaj="msza_swieto" data-punkty="5" data-nazwa="Uroczystość Wszystkich Świętych">15:00 (Uroczystość Wszystkich Świętych - 5 pkt)</option>';
          optHtml += '<option value="16:00" data-rodzaj="msza_swieto" data-punkty="5" data-nazwa="Uroczystość Wszystkich Świętych">16:00 (Uroczystość Wszystkich Świętych - 5 pkt)</option>';
        } else if (dow === 0 || isHoliday) {
          var sunPts = isHoliday ? 5 : 3;
          var sunName = isHoliday ? (litInfo ? litInfo.nazwa : 'Uroczystość Wszystkich Świętych') : 'Msza św. niedzielna';
          var sunType = isHoliday ? 'msza_swieto' : 'msza_niedziela';
          optHtml += '<option value="08:30" data-rodzaj="' + sunType + '" data-punkty="' + sunPts + '" data-nazwa="' + sunName + '">08:30 (' + sunName + ' - ' + sunPts + ' pkt)</option>';
          optHtml += '<option value="10:00" data-rodzaj="' + sunType + '" data-punkty="' + sunPts + '" data-nazwa="' + sunName + '">10:00 (' + sunName + ' - ' + sunPts + ' pkt)</option>';
          optHtml += '<option value="11:30" data-rodzaj="' + sunType + '" data-punkty="' + sunPts + '" data-nazwa="' + sunName + '">11:30 (' + sunName + ' - ' + sunPts + ' pkt)</option>';
        } else if (dow === 6) {
          if (d <= 7) {
            optHtml += '<option value="08:00" data-rodzaj="msza_roza" data-punkty="4" data-nazwa="Msza Róży Różańcowej">08:00 (Msza Róży Różańcowej - 4 pkt)</option>';
          }
          optHtml += '<option value="17:00" data-rodzaj="msza_niedziela" data-punkty="3" data-nazwa="Msza św. - Wigilia niedzielna">17:00 (Msza św. - Wigilia niedzielna - 3 pkt)</option>';
        } else if (dow === 4) {
          optHtml += '<option value="17:00" data-rodzaj="msza_szkolna" data-punkty="5" data-nazwa="Msza św. szkolna">17:00 (Msza św. szkolna - 5 pkt)</option>';
        } else {
          optHtml += '<option value="18:00" data-rodzaj="msza_tydzien" data-punkty="5" data-nazwa="Msza św.">18:00 (Msza św. - 5 pkt)</option>';
        }
      }`;

if (zakContent.includes(targetZakHours)) {
  zakContent = zakContent.replace(targetZakHours, replacementZakHours);
  console.log('[OK] Patched zakrystia.js aktualizujGodzinyZakrystiiDlaDnia');
} else {
  console.warn('[WARN] targetZakHours not found');
}

// In otworzModalZmienMsze update selD.onchange to also fetch next month if needed
const targetOnChange = `      selD.onchange = function() {
        var parts = this.value.split('|');
        var dVal = parseInt(parts[0], 10);
        var mVal = parts.length > 1 ? parseInt(parts[1], 10) : curM;
        var rVal = parts.length > 2 ? parseInt(parts[2], 10) : curR;
        aktualizujGodzinyZakrystiiDlaDnia(dVal, null, mVal, rVal);
      };`;

const replacementOnChange = `      selD.onchange = async function() {
        var parts = this.value.split('|');
        var dVal = parseInt(parts[0], 10);
        var mVal = parts.length > 1 ? parseInt(parts[1], 10) : curM;
        var rVal = parts.length > 2 ? parseInt(parts[2], 10) : curR;
        if (mVal !== curM && (!daneKolejnegoMiesiaca || daneKolejnegoMiesiaca.miesiacIdx !== mVal) && typeof dbFirestore !== 'undefined' && dbFirestore) {
          var nKey = (typeof wyznaczKluczMiesiaca === 'function') ? wyznaczKluczMiesiaca(new Date(rVal, mVal, 1)) : ('Listopad_' + rVal);
          try {
            var snapN = await dbFirestore.collection('stan_grafiku').doc(nKey).get();
            if (snapN.exists) {
              daneKolejnegoMiesiaca = snapN.data();
              daneKolejnegoMiesiaca.docId = nKey;
              try { localStorage.setItem('min_cached_tabela_' + nKey, JSON.stringify(daneKolejnegoMiesiaca)); } catch(e) {}
            }
          } catch(e) {}
        }
        aktualizujGodzinyZakrystiiDlaDnia(dVal, null, mVal, rVal);
      };`;

if (zakContent.includes(targetOnChange)) {
  zakContent = zakContent.replace(targetOnChange, replacementOnChange);
  console.log('[OK] Patched selD.onchange in zakrystia.js');
} else {
  console.warn('[WARN] targetOnChange not found');
}

if (hasCrlfZak) zakContent = zakContent.replace(/\n/g, '\r\n');
fs.writeFileSync(zakrystiaPath, zakContent, 'utf8');
console.log('Patch complete.');
