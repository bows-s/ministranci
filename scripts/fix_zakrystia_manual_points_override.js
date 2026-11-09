const fs = require('fs');

const files = ['public/js/zakrystia.js', 'js/zakrystia.js'];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let isCrlf = content.includes('\r\n');
  let norm = content.replace(/\r\n/g, '\n');

  // 1. In fallback initialization, persist recznieUstawionePunkty
  norm = norm.replace(
    "                punktyLiturgii: dOb.punktyLiturgii || 5,\n                nazwaLiturgii: dOb.nazwaLiturgii || 'Msza św.',",
    "                punktyLiturgii: dOb.punktyLiturgii || 5,\n                recznieUstawionePunkty: (dOb.recznieUstawionePunkty !== undefined) ? dOb.recznieUstawionePunkty : (dOb.punktyLiturgii !== undefined),\n                nazwaLiturgii: dOb.nazwaLiturgii || 'Msza św.',"
  );

  // 2. In renderujTrybZakrystia, recznieUstawionePunkty must override holiday / default points
  const targetRender = `        var czyNiedziela = (zakrystiaStan.rodzajLiturgii === 'msza_niedziela' || zakrystiaStan.dzienTygodnia === 'niedziela');
        var czyDodatkowa = (zakrystiaStan.rodzajLiturgii === 'pogrzeb' || zakrystiaStan.rodzajLiturgii === 'nabozenstwo' || zakrystiaStan.rodzajLiturgii === 'msza_roza' || zakrystiaStan.czyLiturgiaDodatkowa);
        var ptsDlaObecnego = (typeof m.obecnyPkt === 'number') ? m.obecnyPkt : (zakrystiaStan.punktyLiturgii || (czyNiedziela ? 3 : 5));
        if (zakrystiaStan.rodzajLiturgii === 'nabozenstwo' || zakrystiaStan.czyLiturgiaDodatkowa || (zakrystiaStan.punktyLiturgii && zakrystiaStan.punktyLiturgii === 4)) {
          ptsDlaObecnego = (typeof m.obecnyPkt === 'number') ? m.obecnyPkt : (zakrystiaStan.punktyLiturgii || 4);
        } else if (m.typ === 'ZASTEPCA') {
          ptsDlaObecnego = (typeof m.obecnyPkt === 'number') ? m.obecnyPkt : 4;
        } else if (isSwietoL) {
          ptsDlaObecnego = juzBylSwieto ? 2 : 5;
        } else if (m.typ === 'DODATKOWY') {
          if (zakrystiaStan.recznieUstawionePunkty) {
            ptsDlaObecnego = zakrystiaStan.punktyLiturgii || 3;
          } else if (typeof m.obecnyPkt === 'number') {
            ptsDlaObecnego = m.obecnyPkt;
          } else if (czyDodatkowa) {
            ptsDlaObecnego = zakrystiaStan.punktyLiturgii || 3;
          } else {
            ptsDlaObecnego = czyNiedziela ? 1 : 2;
          }
        }`;

  const replaceRender = `        var czyNiedziela = (zakrystiaStan.rodzajLiturgii === 'msza_niedziela' || zakrystiaStan.dzienTygodnia === 'niedziela');
        var czyDodatkowa = (zakrystiaStan.rodzajLiturgii === 'pogrzeb' || zakrystiaStan.rodzajLiturgii === 'nabozenstwo' || zakrystiaStan.rodzajLiturgii === 'msza_roza' || zakrystiaStan.czyLiturgiaDodatkowa);
        var ptsDlaObecnego = (typeof m.obecnyPkt === 'number') ? m.obecnyPkt : (zakrystiaStan.punktyLiturgii || (czyNiedziela ? 3 : 5));
        if (zakrystiaStan.recznieUstawionePunkty && zakrystiaStan.punktyLiturgii) {
          ptsDlaObecnego = (typeof m.obecnyPkt === 'number') ? m.obecnyPkt : zakrystiaStan.punktyLiturgii;
        } else if (zakrystiaStan.rodzajLiturgii === 'nabozenstwo' || zakrystiaStan.czyLiturgiaDodatkowa || (zakrystiaStan.punktyLiturgii && zakrystiaStan.punktyLiturgii === 4)) {
          ptsDlaObecnego = (typeof m.obecnyPkt === 'number') ? m.obecnyPkt : (zakrystiaStan.punktyLiturgii || 4);
        } else if (m.typ === 'ZASTEPCA') {
          ptsDlaObecnego = (typeof m.obecnyPkt === 'number') ? m.obecnyPkt : 4;
        } else if (isSwietoL) {
          ptsDlaObecnego = juzBylSwieto ? 2 : 5;
        } else if (m.typ === 'DODATKOWY') {
          if (typeof m.obecnyPkt === 'number') {
            ptsDlaObecnego = m.obecnyPkt;
          } else if (czyDodatkowa) {
            ptsDlaObecnego = zakrystiaStan.punktyLiturgii || 3;
          } else {
            ptsDlaObecnego = czyNiedziela ? 1 : 2;
          }
        }`;

  if (norm.includes(targetRender)) {
    norm = norm.replace(targetRender, replaceRender);
  } else {
    console.warn(`Target render not found in ${file}`);
  }

  // 3. In wyliczPunktyMinistranta, recznieUstawionePunkty must override holiday / default points
  const targetWylicz = `            var dodajPkt = (typeof m.obecnyPkt === 'number') ? m.obecnyPkt : (zakrystiaStan.punktyLiturgii || 3);
            if (zakrystiaStan.rodzajLiturgii === 'nabozenstwo' || zakrystiaStan.czyLiturgiaDodatkowa || (zakrystiaStan.punktyLiturgii && zakrystiaStan.punktyLiturgii === 4)) {
              dodajPkt = (typeof m.obecnyPkt === 'number') ? m.obecnyPkt : (zakrystiaStan.punktyLiturgii || 4);
            } else if (isSwietoL) {
              if (m.typ === 'ZASTEPCA') {
                dodajPkt = (typeof m.obecnyPkt === 'number') ? m.obecnyPkt : 4;
              } else if (juzBylSwieto) {
                dodajPkt = 2; // Druga lub kolejna msza w święto: ZAWSZE +2 pkt!
              } else {
                dodajPkt = 5; // Pierwsza msza w święto: ZAWSZE +5 pkt!
              }
            } else if (m.typ === 'ZASTEPCA') {
              dodajPkt = (typeof m.obecnyPkt === 'number') ? m.obecnyPkt : 4;
            } else if (m.typ === 'DODATKOWY') {
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

  const replaceWylicz = `            var dodajPkt = (typeof m.obecnyPkt === 'number') ? m.obecnyPkt : (zakrystiaStan.punktyLiturgii || 3);
            if (zakrystiaStan.recznieUstawionePunkty && zakrystiaStan.punktyLiturgii) {
              dodajPkt = (typeof m.obecnyPkt === 'number') ? m.obecnyPkt : zakrystiaStan.punktyLiturgii;
            } else if (zakrystiaStan.rodzajLiturgii === 'nabozenstwo' || zakrystiaStan.czyLiturgiaDodatkowa || (zakrystiaStan.punktyLiturgii && zakrystiaStan.punktyLiturgii === 4)) {
              dodajPkt = (typeof m.obecnyPkt === 'number') ? m.obecnyPkt : (zakrystiaStan.punktyLiturgii || 4);
            } else if (isSwietoL) {
              if (m.typ === 'ZASTEPCA') {
                dodajPkt = (typeof m.obecnyPkt === 'number') ? m.obecnyPkt : 4;
              } else if (juzBylSwieto) {
                dodajPkt = 2; // Druga lub kolejna msza w święto: ZAWSZE +2 pkt!
              } else {
                dodajPkt = 5; // Pierwsza msza w święto: ZAWSZE +5 pkt!
              }
            } else if (m.typ === 'ZASTEPCA') {
              dodajPkt = (typeof m.obecnyPkt === 'number') ? m.obecnyPkt : 4;
            } else if (m.typ === 'DODATKOWY') {
              if (typeof m.obecnyPkt === 'number') {
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
