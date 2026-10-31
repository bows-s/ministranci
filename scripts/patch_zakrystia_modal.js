const fs = require('fs');
let code = fs.readFileSync('public/js/zakrystia.js', 'utf8');

const oldModalFnStart = 'function otworzModalZmienMsze() {';
const oldModalFnEnd = 'function zamknijModalZmienMsze() {';

const idxStart = code.indexOf(oldModalFnStart);
const idxEnd = code.indexOf(oldModalFnEnd);

if (idxStart === -1 || idxEnd === -1) {
  console.error('Target functions not found!');
  process.exit(1);
}

const newModalFn = `function otworzModalZmienMsze() {
      var selD = document.getElementById('sel-zakrystia-dzien');
      var selG = document.getElementById('sel-zakrystia-godzina');
      if (!selD || !selG) return;
      var curStan = zakrystiaStan || {};
      var curR = curStan.rok || (new Date()).getFullYear();
      var curM = (curStan.miesiacIdx !== undefined && curStan.miesiacIdx !== null) ? curStan.miesiacIdx : (new Date()).getMonth();
      var domyslnyD = (curStan.dzien !== undefined && curStan.dzien !== null) ? curStan.dzien : (new Date()).getDate();
      var domyslnyM = curM;
      var daysInMonth = (tabelaMiesiacaDane && tabelaMiesiacaDane.dniNaglowek) ? tabelaMiesiacaDane.dniNaglowek.length : new Date(curR, curM + 1, 0).getDate();
      selD.innerHTML = '';

      var matchedSelection = false;

      // 1. Dni bieżącego miesiąca
      for (var d = 1; d <= daysInMonth; d++) {
        var opt = document.createElement('option');
        opt.value = d + '|' + curM + '|' + curR;
        var dayName = pobierzDzienTygodnia(curR, curM, d);
        opt.innerText = d + ' ' + (polishMonthsGenitive[curM] || '') + ' (' + dayName + ')';
        if (d === domyslnyD && curM === domyslnyM) {
          opt.selected = true;
          matchedSelection = true;
        }
        selD.appendChild(opt);
      }

      // 2. Dni kolejnego miesiąca (pierwsze 14 dni)
      var nextM = (curM + 1) % 12;
      var nextR = (nextM === 0) ? curR + 1 : curR;
      for (var nd = 1; nd <= 14; nd++) {
        var optN = document.createElement('option');
        optN.value = nd + '|' + nextM + '|' + nextR;
        var dayNameN = pobierzDzienTygodnia(nextR, nextM, nd);
        optN.innerText = nd + ' ' + (polishMonthsGenitive[nextM] || '') + ' (' + dayNameN + ')';
        if (!matchedSelection && nd === domyslnyD && nextM === domyslnyM) {
          optN.selected = true;
          matchedSelection = true;
        }
        selD.appendChild(optN);
      }

      function handleDzienChange() {
        var val = selD.value || (selD.options[selD.selectedIndex] && selD.options[selD.selectedIndex].value) || '';
        var parts = val.split('|');
        var dVal = parseInt(parts[0], 10) || domyslnyD || 1;
        var mVal = parts.length > 1 ? parseInt(parts[1], 10) : curM;
        var rVal = parts.length > 2 ? parseInt(parts[2], 10) : curR;

        // Natychmiastowa, synchroniczna aktualizacja godzin - zero opóźnień i brak starych mszy z października!
        aktualizujGodzinyZakrystiiDlaDnia(dVal, null, mVal, rVal);

        // Tło asynchroniczne - dociągnięcie ewentualnych specyficznych danych z bazy dla innego miesiąca
        if (mVal !== curM && (!daneKolejnegoMiesiaca || daneKolejnegoMiesiaca.miesiacIdx !== mVal) && typeof dbFirestore !== 'undefined' && dbFirestore) {
          var nKey = (typeof wyznaczKluczMiesiaca === 'function') ? wyznaczKluczMiesiaca(new Date(rVal, mVal, 1)) : ('Listopad_' + rVal);
          dbFirestore.collection('stan_grafiku').doc(nKey).get().then(function(snapN) {
            if (snapN.exists) {
              daneKolejnegoMiesiaca = snapN.data();
              daneKolejnegoMiesiaca.docId = nKey;
              try { localStorage.setItem('min_cached_tabela_' + nKey, JSON.stringify(daneKolejnegoMiesiaca)); } catch(e) {}
              // Odśwież godziny po załadowaniu danych z bazy
              aktualizujGodzinyZakrystiiDlaDnia(dVal, null, mVal, rVal);
            }
          }).catch(function() {});
        }
      }

      selD.onchange = handleDzienChange;
      selD.oninput = handleDzienChange;

      var curParts = (selD.value || (selD.options[selD.selectedIndex] && selD.options[selD.selectedIndex].value) || '').split('|');
      var selDNum = parseInt(curParts[0], 10) || domyslnyD || 1;
      var selMNum = curParts.length > 1 ? parseInt(curParts[1], 10) : curM;
      var selRNum = curParts.length > 2 ? parseInt(curParts[2], 10) : curR;
      aktualizujGodzinyZakrystiiDlaDnia(selDNum, curStan.godzina, selMNum, selRNum);
      document.getElementById('modal-zmien-msze').style.display = 'flex';
    }

    `;

code = code.substring(0, idxStart) + newModalFn + code.substring(idxEnd);
fs.writeFileSync('public/js/zakrystia.js', code, 'utf8');
console.log('Successfully patched otworzModalZmienMsze in public/js/zakrystia.js');
