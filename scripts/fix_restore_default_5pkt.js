const fs = require('fs');

const files = ['public/js/zakrystia.js', 'js/zakrystia.js'];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let isCrlf = content.includes('\r\n');
  let norm = content.replace(/\r\n/g, '\n');

  // 1. wybierzGodzineZakrystia domyslnePkt - weekday is 5, weekend is 3
  norm = norm.replace(
    "var domyslnePkt = isHoliday5Pkt ? 5 : 3;",
    "var domyslnePkt = isHoliday5Pkt ? 5 : (isWeekendMass ? 3 : 5);"
  );
  norm = norm.replace(
    "domyslnePkt = mFromH.punkty || (isHoliday5Pkt ? 5 : 3);",
    "domyslnePkt = mFromH.punkty || (isHoliday5Pkt ? 5 : (isWeekendMass ? 3 : 5));"
  );

  // 2. Fallback doc initialization - default is 5
  norm = norm.replace(
    "punktyLiturgii: dOb.punktyLiturgii || 3,",
    "punktyLiturgii: dOb.punktyLiturgii || 5,"
  );

  // 3. renderujTrybZakrystia curPts - 3 for Sunday, 5 for weekday
  norm = norm.replace(
    "var curPts = (zakrystiaStan && zakrystiaStan.punktyLiturgii) ? zakrystiaStan.punktyLiturgii : 3;",
    "var curPts = (zakrystiaStan && zakrystiaStan.punktyLiturgii) ? zakrystiaStan.punktyLiturgii : ((zakrystiaStan && zakrystiaStan.dzienTygodnia === 'niedziela') ? 3 : 5);"
  );

  // 4. renderujTrybZakrystia ptsDlaObecnego - 3 for Sunday, 5 for weekday
  norm = norm.replace(
    "var ptsDlaObecnego = (typeof m.obecnyPkt === 'number') ? m.obecnyPkt : (zakrystiaStan.punktyLiturgii || 3);",
    "var ptsDlaObecnego = (typeof m.obecnyPkt === 'number') ? m.obecnyPkt : (zakrystiaStan.punktyLiturgii || (czyNiedziela ? 3 : 5));"
  );

  // 5. otworzModalZmianyMszy default points for school & weekday mass - 5 pkt
  norm = norm.replace(
    'optHtml += \'<option value="17:00" data-rodzaj="msza_szkolna" data-punkty="3" data-nazwa="Msza św. szkolna">17:00 (Msza św. szkolna - 3 pkt)</option>\';',
    'optHtml += \'<option value="17:00" data-rodzaj="msza_szkolna" data-punkty="5" data-nazwa="Msza św. szkolna">17:00 (Msza św. szkolna - 5 pkt)</option>\';'
  );
  norm = norm.replace(
    'optHtml += \'<option value="18:00" data-rodzaj="msza_tydzien" data-punkty="3" data-nazwa="Msza św.">18:00 (Msza św. - 3 pkt)</option>\';',
    'optHtml += \'<option value="18:00" data-rodzaj="msza_tydzien" data-punkty="5" data-nazwa="Msza św.">18:00 (Msza św. - 5 pkt)</option>\';'
  );

  if (isCrlf) norm = norm.replace(/\n/g, '\r\n');
  fs.writeFileSync(file, norm, 'utf8');
  console.log(`Successfully restored default 5 pkt in ${file}`);
});
