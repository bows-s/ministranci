const fs = require('fs');
const { PDFParse } = require('pdf-parse');

async function parseGazetka(pdfPath) {
  const p = new PDFParse({ data: fs.readFileSync(pdfPath) });
  const text = (await p.getText()).text;

  // Split into INTENCJE MSZALNE section
  const startIdx = text.search(/INTENCJE\s+MSZALNE/i);
  const endIdx = text.search(/OGŁOSZENIA\s+DUSZPASTERSKIE/i);
  const section = (startIdx !== -1)
    ? text.substring(startIdx, endIdx !== -1 ? endIdx : text.length)
    : text;

  const dayNames = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
  const monthNames = [
    'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
    'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'
  ];

  // Regex for day header (case insensitive, robust)
  const headerRegex = new RegExp(`(?:^|[\\r\\n])\\s*(${dayNames.join('|')})\\s+(\\d{1,2})\\s+(${monthNames.join('|')})`, 'gi');

  const days = [];
  let hMatch;
  while ((hMatch = headerRegex.exec(section)) !== null) {
    days.push({
      dayName: hMatch[1],
      dayNum: parseInt(hMatch[2], 10),
      monthName: hMatch[3],
      index: hMatch.index,
      fullLen: hMatch[0].length
    });
  }

  const result = {};

  for (let i = 0; i < days.length; i++) {
    const cur = days[i];
    const next = days[i + 1];
    const block = section.substring(cur.index + cur.fullLen, next ? next.index : section.length);

    // Split block into entries by time
    // E.g. "8.30", "10.00", "17.15", "18.00"
    const timeRegex = /(?:^|[\r\n\s])(\d{1,2})[.:](\d{2})(?!\d)/g;
    const timeHits = [];
    let tm;
    while ((tm = timeRegex.exec(block)) !== null) {
      const hour = parseInt(tm[1], 10);
      const min = tm[2];
      if (hour >= 6 && hour <= 21) {
        timeHits.push({
          timeStr: `${hour < 10 ? '0' + hour : hour}:${min}`,
          index: tm.index
        });
      }
    }

    const msze = [];
    const nabozenstwa = [];
    let hasSeparateRosaryMention = false;

    // Check if block has "Nabożeństwo Różańcowe" on its own line without time
    if (/nabożeństwo\s+różańcowe/i.test(block)) {
      // Is there a time entry specifically for rosary?
      // If not, it's after the mass (like on Thursday)
      hasSeparateRosaryMention = true;
    }

    for (let t = 0; t < timeHits.length; t++) {
      const tCur = timeHits[t];
      const tNext = timeHits[t + 1];
      const entryText = block.substring(tCur.index, tNext ? tNext.index : block.length).replace(/[\r\n\t]+/g, ' ').trim();

      // Check first words of entryText (after time)
      const textAfterTime = entryText.replace(/^\d{1,2}[.:]\d{2}\s*/, '').trim();

      const isDevotion = /^(?:nabożeństwo|różaniec|droga\s+krzyżowa|gorzkie\s+żale)/i.test(textAfterTime);
      const isSchoolMass = /szkoln/i.test(textAfterTime);

      if (isDevotion) {
        nabozenstwa.push({
          godzina: tCur.timeStr,
          nazwa: 'Nabożeństwo Różańcowe',
          punkty: 2,
          typ: 'nabozenstwo'
        });
      } else {
        const isVigil = (cur.dayName.toLowerCase() === 'sobota' && tCur.timeStr === '17:00');
        const isSun = (cur.dayName.toLowerCase() === 'niedziela');
        msze.push({
          godzina: tCur.timeStr,
          nazwa: isSchoolMass ? 'Msza św. szkolna' : (isSun ? 'Msza św. niedzielna' : (isVigil ? 'Msza św. (Wigilia niedzielna)' : 'Msza św.')),
          punkty: (isSun || isVigil) ? 3 : 5,
          typ: isSchoolMass ? 'msza_szkolna' : 'msza'
        });
      }
    }

    // If Thursday or day with mass where rosary is mentioned but has no dedicated time:
    if (hasSeparateRosaryMention && nabozenstwa.length === 0 && msze.length > 0) {
      // It's after mass! E.g. Czwartek 17:00 -> Różaniec po mszy szkolnej (17:45)
      nabozenstwa.push({
        godzina: '17:45',
        nazwa: 'Nabożeństwo Różańcowe (po mszy)',
        punkty: 2,
        typ: 'nabozenstwo',
        poMszy: true
      });
    }

    result[cur.dayNum] = {
      dzien: cur.dayNum,
      dzienTygodnia: cur.dayName,
      miesiac: cur.monthName,
      msze: msze,
      nabozenstwa: nabozenstwa,
      godzinyMszy: msze.map(m => m.godzina)
    };
  }

  return result;
}

async function test() {
  console.log('--- TEST 1443 ---');
  const r1 = await parseGazetka('gazetka_1443.pdf');
  for (const d in r1) {
    const x = r1[d];
    console.log(`${x.dzien} ${x.miesiac} (${x.dzienTygodnia}): MSZE: [${x.godzinyMszy.join(', ')}] | NABOŻEŃSTWA: [${x.nabozenstwa.map(n => n.nazwa + ' ' + n.godzina).join(', ')}]`);
  }

  console.log('\n--- TEST 1444 ---');
  const r2 = await parseGazetka('gazetka_1444.pdf');
  for (const d in r2) {
    const x = r2[d];
    console.log(`${x.dzien} ${x.miesiac} (${x.dzienTygodnia}): MSZE: [${x.godzinyMszy.join(', ')}] | NABOŻEŃSTWA: [${x.nabozenstwa.map(n => n.nazwa + ' ' + n.godzina).join(', ')}]`);
  }
}
test().catch(console.error);
