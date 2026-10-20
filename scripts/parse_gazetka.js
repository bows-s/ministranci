const fs = require('fs');
const { PDFParse } = require('pdf-parse');

async function parseGazetkaPdf(bufferOrPath) {
  const data = typeof bufferOrPath === 'string' ? fs.readFileSync(bufferOrPath) : bufferOrPath;
  const p = new PDFParse({ data: data });
  const res = await p.getText();
  const text = res.text;

  // We only parse the INTENCJE MSZALNE section
  const startIdx = text.search(/INTENCJE\s+MSZALNE/i);
  const endIdx = text.search(/OGŁOSZENIA\s+DUSZPASTERSKIE/i);
  const intencjeText = (startIdx !== -1)
    ? text.substring(startIdx, endIdx !== -1 ? endIdx : text.length)
    : text;

  const dayNames = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
  const monthNames = [
    'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
    'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'
  ];

  const dayHeaderRegex = new RegExp(`(${dayNames.join('|')})\\s+(\\d{1,2})\\s+(${monthNames.join('|')})`, 'gi');
  const matches = [];
  let m;
  while ((m = dayHeaderRegex.exec(intencjeText)) !== null) {
    matches.push({
      dayName: m[1],
      dayNum: parseInt(m[2], 10),
      monthName: m[3],
      index: m.index,
      fullLength: m[0].length
    });
  }

  const scheduleDays = {};

  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const next = matches[i + 1];
    const block = intencjeText.substring(cur.index + cur.fullLength, next ? next.index : intencjeText.length);

    // Look for times: e.g. "8.30", "10.00", "11.30", "15.00", "17.15", "18.00"
    const timeRegex = /(?:^|\s|\n)(\d{1,2})[.:](\d{2})(?!\d)/g;
    const timeMatches = [];
    let tm;
    while ((tm = timeRegex.exec(block)) !== null) {
      const h = parseInt(tm[1], 10);
      const min = tm[2];
      if (h >= 6 && h <= 21) {
        timeMatches.push({
          hourStr: `${h < 10 ? '0' + h : h}:${min}`,
          index: tm.index
        });
      }
    }

    const msze = [];
    const nabozenstwa = [];
    let maRozaniecPoMszy = false;

    // Check if block mentions rosary after mass (e.g. Czwartek)
    if (/nabożeństwo\s+różańcowe/i.test(block) && timeMatches.length === 1 && /szkoln/i.test(block)) {
      maRozaniecPoMszy = true;
    }

    for (let t = 0; t < timeMatches.length; t++) {
      const tCur = timeMatches[t];
      const tNext = timeMatches[t + 1];
      const itemDesc = block.substring(tCur.index, tNext ? tNext.index : block.length).replace(/[\r\n\t]+/g, ' ').trim();

      const isRosary = /różan|różańc/i.test(itemDesc);
      const isSchool = /szkoln/i.test(itemDesc);

      if (isRosary) {
        nabozenstwa.push({
          godzina: tCur.hourStr,
          nazwa: 'Nabożeństwo Różańcowe',
          punkty: 2,
          typ: 'nabozenstwo'
        });
      } else {
        msze.push({
          godzina: tCur.hourStr,
          nazwa: isSchool ? 'Msza św. szkolna' : (cur.dayName === 'Niedziela' ? 'Msza św. niedzielna' : (cur.dayName === 'Sobota' && tCur.hourStr === '17:00' ? 'Msza św. (Wigilia niedzielna)' : 'Msza św.')),
          punkty: (cur.dayName === 'Niedziela' || (cur.dayName === 'Sobota' && tCur.hourStr === '17:00')) ? 3 : 5,
          typ: isSchool ? 'msza_szkolna' : 'msza'
        });
      }
    }

    if (maRozaniecPoMszy) {
      nabozenstwa.push({
        godzina: '17:45',
        nazwa: 'Nabożeństwo Różańcowe (po mszy szkolnej)',
        punkty: 2,
        typ: 'nabozenstwo'
      });
    }

    scheduleDays[cur.dayNum] = {
      dzien: cur.dayNum,
      dzienTygodnia: cur.dayName,
      miesiac: cur.monthName,
      msze: msze,
      nabozenstwa: nabozenstwa,
      wszystkieGodzinyMszy: msze.map(x => x.godzina)
    };
  }

  return scheduleDays;
}

async function run() {
  const d1 = await parseGazetkaPdf('gazetka_1443.pdf');
  const d2 = await parseGazetkaPdf('gazetka_1444.pdf');

  console.log('=== GAZETKA 1443 (4-11 Października) ===');
  for (const d in d1) {
    const item = d1[d];
    console.log(`${item.dzien} ${item.miesiac} (${item.dzienTygodnia}): msze [${item.wszystkieGodzinyMszy.join(', ')}], nabożeństwa: [${item.nabozenstwa.map(n => n.nazwa + ' ' + n.godzina).join(', ')}]`);
  }

  console.log('\n=== GAZETKA 1444 (11-18 Października) ===');
  for (const d in d2) {
    const item = d2[d];
    console.log(`${item.dzien} ${item.miesiac} (${item.dzienTygodnia}): msze [${item.wszystkieGodzinyMszy.join(', ')}], nabożeństwa: [${item.nabozenstwa.map(n => n.nazwa + ' ' + n.godzina).join(', ')}]`);
  }
}
run().catch(console.error);
