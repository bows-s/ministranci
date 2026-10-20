const fs = require('fs');
const { PDFParse } = require('pdf-parse');

async function testParse(pdfPath) {
  const p = new PDFParse({ data: fs.readFileSync(pdfPath) });
  const res = await p.getText();
  const text = res.text;

  console.log('=== PARSING:', pdfPath, '===');

  // Regex to match Polish days of week
  const dayNames = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
  const monthNames = [
    'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
    'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'
  ];

  // Regex pattern for day header: e.g. "Niedziela 4 października", "Poniedziałek 5 października"
  const dayHeaderRegex = new RegExp(`(${dayNames.join('|')})\\s+(\\d{1,2})\\s+(${monthNames.join('|')})`, 'gi');

  const matches = [];
  let match;
  while ((match = dayHeaderRegex.exec(text)) !== null) {
    matches.push({
      full: match[0],
      dayName: match[1],
      dayNum: parseInt(match[2], 10),
      monthName: match[3],
      index: match.index
    });
  }

  console.log('Found days:', matches.length);
  const daysData = [];

  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const next = matches[i + 1];
    const dayText = text.substring(cur.index + cur.full.length, next ? next.index : (cur.index + 1200));

    // Find all times like 8.30, 10.00, 17.15, 18.00 or 8:30, 17:15
    const timeRegex = /(?:^|\s|\n)(\d{1,2})[.:](\d{2})(?!\d)/g;
    const liturgies = [];
    let tMatch;
    const timeIndices = [];
    while ((tMatch = timeRegex.exec(dayText)) !== null) {
      const h = parseInt(tMatch[1], 10);
      const m = tMatch[2];
      if (h >= 6 && h <= 21) {
        timeIndices.push({
          timeStr: `${h < 10 ? '0' + h : h}:${m}`,
          rawTime: `${tMatch[1]}.${m}`,
          index: tMatch.index
        });
      }
    }

    for (let t = 0; t < timeIndices.length; t++) {
      const tCur = timeIndices[t];
      const tNext = timeIndices[t + 1];
      const litText = dayText.substring(tCur.index, tNext ? tNext.index : dayText.length).replace(/[\r\n]+/g, ' ').trim();
      
      const isRosary = /różan|różańc/i.test(litText);
      const isSchoolMass = /szkoln/i.test(litText);
      const isMass = /msza|za †|do bożej opatrzności|w intencji/i.test(litText);

      liturgies.push({
        godzina: tCur.timeStr,
        opis: litText.substring(0, 120),
        czyRozaniec: isRosary,
        czyMszaSzkolna: isSchoolMass,
        typ: isRosary && !isMass ? 'nabozenstwo' : (isSchoolMass ? 'msza_szkolna' : 'msza')
      });
    }

    daysData.push({
      dzien: cur.dayNum,
      dzienTygodnia: cur.dayName,
      miesiac: cur.monthName,
      liturgie: liturgies
    });
  }

  console.log(JSON.stringify(daysData, null, 2));
}

async function run() {
  await testParse('gazetka_1443.pdf');
  await testParse('gazetka_1444.pdf');
}
run().catch(console.error);
