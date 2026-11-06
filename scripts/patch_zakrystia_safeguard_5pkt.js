const fs = require('fs');

const files = ['public/js/zakrystia.js', 'js/zakrystia.js'];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let isCrlf = content.includes('\r\n');
  let norm = content.replace(/\r\n/g, '\n');

  // 1. wybierzGodzineZakrystia safeguard
  const target1 = `          } else if (mFromH) {
            domyslnyRodzaj = (mFromH.typ && mFromH.typ !== 'nabozenstwo') ? mFromH.typ : (isHoliday5Pkt ? 'msza_swieto' : (isWeekendMass ? 'msza_niedziela' : 'msza_tydzien'));
            domyslnePkt = mFromH.punkty || (isHoliday5Pkt ? 5 : (isWeekendMass ? 3 : 5));
            domyslnaNazwa = mFromH.nazwa || (isHoliday5Pkt ? 'Uroczystość Wszystkich Świętych' : 'Msza św.');
          }`;

  const replace1 = `          } else if (mFromH) {
            domyslnyRodzaj = (mFromH.typ && mFromH.typ !== 'nabozenstwo') ? mFromH.typ : (isHoliday5Pkt ? 'msza_swieto' : (isWeekendMass ? 'msza_niedziela' : 'msza_tydzien'));
            var hPts = mFromH.punkty;
            if (hPts === 3 && dow >= 1 && dow <= 5 && !(dNum === 2 && currentMonthIdx === 10)) {
              hPts = 5;
            }
            domyslnePkt = hPts || (isHoliday5Pkt ? 5 : (isWeekendMass ? 3 : 5));
            domyslnaNazwa = mFromH.nazwa || (isHoliday5Pkt ? 'Uroczystość Wszystkich Świętych' : 'Msza św.');
          }`;

  if (norm.includes(target1)) {
    norm = norm.replace(target1, replace1);
  } else {
    console.warn(`Target 1 not found in ${file}`);
  }

  // 2. otworzModalZmianyMszy safeguard
  const target2 = `            allDayEvents.push({
              godzina: gC,
              rodzaj: mTyp,
              punkty: mItem.punkty,
              nazwa: mNazwa
            });`;

  const replace2 = `            var mPts = mItem.punkty;
            if (mPts === 3 && dow >= 1 && dow <= 5 && !(d === 2 && m === 10)) {
              mPts = 5;
            }
            allDayEvents.push({
              godzina: gC,
              rodzaj: mTyp,
              punkty: mPts,
              nazwa: mNazwa
            });`;

  if (norm.includes(target2)) {
    norm = norm.replace(target2, replace2);
  } else {
    console.warn(`Target 2 not found in ${file}`);
  }

  if (isCrlf) norm = norm.replace(/\n/g, '\r\n');
  fs.writeFileSync(file, norm, 'utf8');
  console.log(`Successfully patched safeguard in ${file}`);
});
