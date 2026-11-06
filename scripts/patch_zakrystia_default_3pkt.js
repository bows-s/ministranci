const fs = require('fs');

const files = ['public/js/zakrystia.js', 'js/zakrystia.js'];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let isCrlf = content.includes('\r\n');
  let norm = content.replace(/\r\n/g, '\n');

  // 1. wybierzGodzineZakrystia domyslnePkt
  norm = norm.replace(
    "var domyslnePkt = isHoliday5Pkt ? 5 : (isWeekendMass ? 3 : 5);",
    "var domyslnePkt = isHoliday5Pkt ? 5 : 3;"
  );
  norm = norm.replace(
    "domyslnePkt = mFromH.punkty || (isHoliday5Pkt ? 5 : (isWeekendMass ? 3 : 5));",
    "domyslnePkt = mFromH.punkty || (isHoliday5Pkt ? 5 : 3);"
  );

  // 2. Fallback doc initialization
  norm = norm.replace(
    "punktyLiturgii: dOb.punktyLiturgii || 5,",
    "punktyLiturgii: dOb.punktyLiturgii || 3,"
  );

  // 3. renderujTrybZakrystia curPts
  norm = norm.replace(
    "var curPts = (zakrystiaStan && zakrystiaStan.punktyLiturgii) ? zakrystiaStan.punktyLiturgii : ((zakrystiaStan && zakrystiaStan.dzienTygodnia === 'niedziela') ? 3 : 5);",
    "var curPts = (zakrystiaStan && zakrystiaStan.punktyLiturgii) ? zakrystiaStan.punktyLiturgii : 3;"
  );

  // 4. renderujTrybZakrystia ptsDlaObecnego
  const targetPtsDlaObecnego = `        var czyDodatkowa = (zakrystiaStan.rodzajLiturgii === 'pogrzeb' || zakrystiaStan.rodzajLiturgii === 'nabozenstwo' || zakrystiaStan.rodzajLiturgii === 'msza_roza' || zakrystiaStan.czyLiturgiaDodatkowa);
        var isKubaBrytnerSpecialUI = (zakrystiaStan.dzien === 2 && currentMonthIdx === 10 && czyToSamoNazwisko(m.nazwisko, 'Jakub Brytner'));
        var ptsDlaObecnego = (typeof m.obecnyPkt === 'number') ? m.obecnyPkt : (zakrystiaStan.punktyLiturgii || 3);
        if (isKubaBrytnerSpecialUI) {
          ptsDlaObecnego = 5;
        } else if (zakrystiaStan.rodzajLiturgii === 'nabozenstwo' || zakrystiaStan.czyLiturgiaDodatkowa || (zakrystiaStan.punktyLiturgii && zakrystiaStan.punktyLiturgii === 4)) {`;

  const replacePtsDlaObecnego = `        var czyDodatkowa = (zakrystiaStan.rodzajLiturgii === 'pogrzeb' || zakrystiaStan.rodzajLiturgii === 'nabozenstwo' || zakrystiaStan.rodzajLiturgii === 'msza_roza' || zakrystiaStan.czyLiturgiaDodatkowa);
        var ptsDlaObecnego = (typeof m.obecnyPkt === 'number') ? m.obecnyPkt : (zakrystiaStan.punktyLiturgii || 3);
        if (zakrystiaStan.rodzajLiturgii === 'nabozenstwo' || zakrystiaStan.czyLiturgiaDodatkowa || (zakrystiaStan.punktyLiturgii && zakrystiaStan.punktyLiturgii === 4)) {`;

  if (norm.includes(targetPtsDlaObecnego)) {
    norm = norm.replace(targetPtsDlaObecnego, replacePtsDlaObecnego);
  } else {
    console.warn(`Target ptsDlaObecnego not found in ${file}`);
  }

  // 5. otworzModalZmianyMszy default points for school & weekday mass
  norm = norm.replace(
    'optHtml += \'<option value="17:00" data-rodzaj="msza_szkolna" data-punkty="5" data-nazwa="Msza św. szkolna">17:00 (Msza św. szkolna - 5 pkt)</option>\';',
    'optHtml += \'<option value="17:00" data-rodzaj="msza_szkolna" data-punkty="3" data-nazwa="Msza św. szkolna">17:00 (Msza św. szkolna - 3 pkt)</option>\';'
  );
  norm = norm.replace(
    'optHtml += \'<option value="18:00" data-rodzaj="msza_tydzien" data-punkty="5" data-nazwa="Msza św.">18:00 (Msza św. - 5 pkt)</option>\';',
    'optHtml += \'<option value="18:00" data-rodzaj="msza_tydzien" data-punkty="3" data-nazwa="Msza św.">18:00 (Msza św. - 3 pkt)</option>\';'
  );

  // 6. otworzModalDodajMinistranta sort order
  const targetSort = `      // Sortuj hierarchicznie: Dyżurny z poniedziałku (Kuba Brytner) na samej górze -> Animatorzy -> Lektorzy -> Starsi -> Młodsi -> Kandydaci
      dostepni.sort(function(a, b) {
        var isKubaA = (zakrystiaStan && zakrystiaStan.dzien === 2 && zakrystiaStan.miesiacIdx === 10 && czyToSamoNazwisko(a, 'Jakub Brytner'));
        var isKubaB = (zakrystiaStan && zakrystiaStan.dzien === 2 && zakrystiaStan.miesiacIdx === 10 && czyToSamoNazwisko(b, 'Jakub Brytner'));
        if (isKubaA) return -1;
        if (isKubaB) return 1;
        var stA = wyznaczStopienMinistranta(a, wRows);
        var stB = wyznaczStopienMinistranta(b, wRows);
        if (stB.ranga !== stA.ranga) return stB.ranga - stA.ranga;
        return a.localeCompare(b, 'pl');
      });`;

  const replaceSort = `      // Sortuj hierarchicznie: Animatorzy -> Lektorzy -> Starsi -> Młodsi -> Kandydaci
      dostepni.sort(function(a, b) {
        var stA = wyznaczStopienMinistranta(a, wRows);
        var stB = wyznaczStopienMinistranta(b, wRows);
        if (stB.ranga !== stA.ranga) return stB.ranga - stA.ranga;
        return a.localeCompare(b, 'pl');
      });`;

  if (norm.includes(targetSort)) {
    norm = norm.replace(targetSort, replaceSort);
  } else {
    console.warn(`Target sort not found in ${file}`);
  }

  // 7. otworzModalDodajMinistranta item badge
  const targetBadge = `                        ((zakrystiaStan && zakrystiaStan.dzien === 2 && zakrystiaStan.miesiacIdx === 10 && czyToSamoNazwisko(name, 'Jakub Brytner')) ? '<span style="color:#22c55e; font-weight:700;">• Dyżurny poniedziałkowy (+5 pkt)</span>' : '') +`;
  if (norm.includes(targetBadge)) {
    norm = norm.replace(targetBadge, '');
  } else {
    console.warn(`Target badge not found in ${file}`);
  }

  // 8. zakrystiaDodajDodatkowychMinistrantow
  const targetDodaj = `          } else {
            var isKubaBrytnerSpecial = (zakrystiaStan.dzien === 2 && zakrystiaStan.miesiacIdx === 10 && czyToSamoNazwisko(name, 'Jakub Brytner'));
            pktDlaDodatkowego = isKubaBrytnerSpecial ? 5 : (zakrystiaStan.punktyLiturgii || 3);
            opisDodatkowy = isKubaBrytnerSpecial ? 'Dyżurny poniedziałkowy (+5 pkt)' : ('Dodatkowa służba (+' + pktDlaDodatkowego + ' pkt)');
          }`;

  const replaceDodaj = `          } else {
            pktDlaDodatkowego = zakrystiaStan.punktyLiturgii || 3;
            opisDodatkowy = 'Dodatkowa służba (+' + pktDlaDodatkowego + ' pkt)';
          }`;

  if (norm.includes(targetDodaj)) {
    norm = norm.replace(targetDodaj, replaceDodaj);
  } else {
    console.warn(`Target dodaj not found in ${file}`);
  }

  // 9. wyliczPunktyMinistranta
  const targetWylicz = `            } else if (m.typ === 'DODATKOWY') {
              var isKubaBrytnerSpecial = (zakrystiaStan.dzien === 2 && zakrystiaStan.miesiacIdx === 10 && czyToSamoNazwisko(m.nazwisko, 'Jakub Brytner'));
              if (isKubaBrytnerSpecial) {
                dodajPkt = 5;
              } else if (zakrystiaStan.recznieUstawionePunkty) {
                dodajPkt = zakrystiaStan.punktyLiturgii || 3;
              } else if (typeof m.obecnyPkt === 'number') {
                dodajPkt = m.obecnyPkt;
              } else if (czyDodatkowa) {
                dodajPkt = zakrystiaStan.punktyLiturgii || 3;
              } else {
                var juzBylNaDyz = czyMinistrantBylNaSwoimDyzurzeWeekendowym(wM, zakrystiaStan.dzien, dowNum, tabelaDoModyfikacji);
                dodajPkt = czyNiedziela ? (juzBylNaDyz ? 2 : 1) : 2;
              }
            }`;

  const replaceWylicz = `            } else if (m.typ === 'DODATKOWY') {
              if (zakrystiaStan.recznieUstawionePunkty) {
                dodajPkt = zakrystiaStan.punktyLiturgii || 3;
              } else if (typeof m.obecnyPkt === 'number') {
                dodajPkt = m.obecnyPkt;
              } else if (czyDodatkowa) {
                dodajPkt = zakrystiaStan.punktyLiturgii || 3;
              } else {
                var juzBylNaDyz = czyMinistrantBylNaSwoimDyzurzeWeekendowym(wM, zakrystiaStan.dzien, dowNum, tabelaDoModyfikacji);
                dodajPkt = czyNiedziela ? (juzBylNaDyz ? 2 : 1) : 2;
              }
            }`;

  if (norm.includes(targetWylicz)) {
    norm = norm.replace(targetWylicz, replaceWylicz);
  } else {
    console.warn(`Target wylicz not found in ${file}`);
  }

  if (isCrlf) norm = norm.replace(/\n/g, '\r\n');
  fs.writeFileSync(file, norm, 'utf8');
  console.log(`Successfully patched ${file}`);
});
