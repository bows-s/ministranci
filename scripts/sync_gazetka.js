const https = require('https');
const { PDFParse } = require('pdf-parse');
const { sendTelegramMessage } = require('./notify_telegram');

const API_KEY = "AIzaSyAsgkKWXr-L3fDHQODxioVssvIGL9SQePk";
const PROJECT_ID = "makole-85f32";
const GAZETKA_PAGE_URL = "https://jozef.tgory.pl/gazetka";

const POLISH_MONTHS_MAP = {
  'stycznia': { name: 'Styczeń', idx: 0 },
  'lutego': { name: 'Luty', idx: 1 },
  'marca': { name: 'Marzec', idx: 2 },
  'kwietnia': { name: 'Kwiecień', idx: 3 },
  'maja': { name: 'Maj', idx: 4 },
  'czerwca': { name: 'Czerwiec', idx: 5 },
  'lipca': { name: 'Lipiec', idx: 6 },
  'sierpnia': { name: 'Sierpień', idx: 7 },
  'września': { name: 'Wrzesień', idx: 8 },
  'października': { name: 'Październik', idx: 9 },
  'listopada': { name: 'Listopad', idx: 10 },
  'grudnia': { name: 'Grudzień', idx: 11 }
};

function fromFirestoreValue(val) {
  if (!val) return null;
  if ('nullValue' in val) return null;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return parseFloat(val.doubleValue);
  if ('stringValue' in val) return val.stringValue;
  if ('arrayValue' in val) return (val.arrayValue.values || []).map(fromFirestoreValue);
  if ('mapValue' in val) {
    const res = {};
    const fields = val.mapValue.fields || {};
    for (const k in fields) res[k] = fromFirestoreValue(fields[k]);
    return res;
  }
  return null;
}

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") {
    if (Number.isInteger(val)) return { integerValue: val.toString() };
    return { doubleValue: val };
  }
  if (typeof val === "string") return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === "object") {
    const fields = {};
    for (const k in val) {
      if (Object.prototype.hasOwnProperty.call(val, k)) {
        fields[k] = toFirestoreValue(val[k]);
      }
    }
    return { mapValue: { fields: fields } };
  }
  return { stringValue: String(val) };
}

function getDoc(collection, docName) {
  return new Promise((resolve) => {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${encodeURIComponent(docName)}?key=${API_KEY}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (!json.fields) return resolve(null);
          const fields = json.fields;
          const docData = {};
          for (const k in fields) docData[k] = fromFirestoreValue(fields[k]);
          resolve(docData);
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

function patchDoc(collection, docName, dataToPatch, fieldPaths) {
  return new Promise((resolve, reject) => {
    const mask = fieldPaths.map(f => 'updateMask.fieldPaths=' + encodeURIComponent(f)).join('&');
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${encodeURIComponent(docName)}?${mask}&key=${API_KEY}`;
    const parsed = new URL(url);

    const bodyFields = {};
    for (const k of fieldPaths) {
      if (dataToPatch[k] !== undefined) {
        bodyFields[k] = toFirestoreValue(dataToPatch[k]);
      }
    }
    const bodyStr = JSON.stringify({ fields: bodyFields });

    const req = https.request({
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname + parsed.search,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    }, (res) => {
      let resData = '';
      res.on('data', c => resData += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(resData));
        } else {
          reject(new Error(`Błąd Firestore (${res.statusCode}): ${resData}`));
        }
      });
    });

    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function fetchGazetkiList() {
  console.log(`[1/4] Pobieranie listy gazetek ze strony: ${GAZETKA_PAGE_URL}...`);
  const res = await fetch(GAZETKA_PAGE_URL);
  if (!res.ok) throw new Error(`Nie udało się pobrać strony gazetki (status ${res.status})`);
  const html = await res.text();

  const rowRegex = /<div class="gazetka-row">([\s\S]*?)<\/div>\s*<\/div>/g;
  let match;
  const list = [];
  while ((match = rowRegex.exec(html)) !== null) {
    const chunk = match[1];
    const dateMatch = chunk.match(/<span class="gazetka-row-date">([^<]+)<\/span>/);
    const pdfMatch = chunk.match(/href="(https:\/\/jozef\.tgory\.pl\/uploads\/[^\"]+\.pdf)"/);
    if (dateMatch && pdfMatch) {
      const dateText = dateMatch[1].trim();
      const pdfUrl = pdfMatch[1];
      const nrMatch = pdfUrl.match(/U_NAS_(\d+)/i);
      const nr = nrMatch ? parseInt(nrMatch[1], 10) : null;
      list.push({ dateText, pdfUrl, nr });
    }
  }

  console.log(`      Znaleziono ${list.length} wydań gazetek:`);
  list.forEach(item => {
    console.log(`      - Wydanie ${item.nr || '?'}: ${item.dateText} -> ${item.pdfUrl}`);
  });

  return list;
}

async function parseGazetkaPdf(pdfUrl) {
  console.log(`\n[2/4] Pobieranie i analiza PDF: ${pdfUrl}...`);
  const res = await fetch(pdfUrl);
  if (!res.ok) throw new Error(`Błąd pobierania PDF (${res.status}): ${pdfUrl}`);
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const p = new PDFParse({ data: buffer });
  const text = (await p.getText()).text;

  // Odcinamy sekcję przed ogłoszeniami (ogłoszenia zaczynają się zazwyczaj od '-- 2 of 4 --' lub 'OGŁOSZENIA')
  const p2Idx = text.indexOf('-- 2 of 4 --');
  const oglIdx = text.search(/OGŁOSZENIA\s+DUSZPASTERSKIE/i);
  let cutoff = text.length;
  if (p2Idx !== -1) cutoff = Math.min(cutoff, p2Idx);
  if (oglIdx !== -1) cutoff = Math.min(cutoff, oglIdx);

  const section = text.substring(0, cutoff);

  const dayNames = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
  const monthNames = Object.keys(POLISH_MONTHS_MAP);

  const dayRegex = new RegExp(`(${dayNames.join('|')})\\s+(\\d{1,2})\\s+(${monthNames.join('|')})`, 'gi');
  const dayMatches = [];
  let dm;
  while ((dm = dayRegex.exec(section)) !== null) {
    dayMatches.push({
      dayName: dm[1],
      dayNum: parseInt(dm[2], 10),
      monthStr: dm[3].toLowerCase(),
      index: dm.index,
      fullLength: dm[0].length
    });
  }

  const daysResult = [];

  for (let i = 0; i < dayMatches.length; i++) {
    const cur = dayMatches[i];
    const next = dayMatches[i + 1];
    const block = section.substring(cur.index + cur.fullLength, next ? next.index : section.length);

    // Szukamy godzin: 8.30, 10.00, 15.00, 17.15, 18.00 itp.
    const timeRegex = /(?:^|[\r\n\s])(\d{1,2})[.:](\d{2})(?!\d)/g;
    const timeHits = [];
    let tm;
    while ((tm = timeRegex.exec(block)) !== null) {
      const h = parseInt(tm[1], 10);
      const min = tm[2];
      if (h >= 6 && h <= 21) {
        timeHits.push({
          timeStr: `${h < 10 ? '0' + h : h}:${min}`,
          index: tm.index
        });
      }
    }

    const msze = [];
    const nabozenstwa = [];
    let maOsobnyRozaniec = /nabożeństwo\s+różańcowe/i.test(block);

    for (let t = 0; t < timeHits.length; t++) {
      const tCur = timeHits[t];
      const tNext = timeHits[t + 1];
      const itemDesc = block.substring(tCur.index, tNext ? tNext.index : block.length).replace(/[\r\n\t]+/g, ' ').trim();
      const descAfterTime = itemDesc.replace(/^\d{1,2}[.:]\d{2}\s*/, '').trim();

      const isRosary = /^(?:nabożeństwo\s+różańcowe|różaniec)/i.test(descAfterTime);
      const isSchoolMass = /szkoln/i.test(descAfterTime);

      if (isRosary) {
        // Sprawdź czy to osobne nabożeństwo bez mszy (np. niedziela o 15:00, brak mszy w pobliżu):
        // Za osobną fatygę i przyjście do kościoła tylko na to nabożeństwo zamiast 2 przyznajemy 3 punkty!
        const [curH, curM] = tCur.timeStr.split(':').map(Number);
        const curMins = curH * 60 + curM;
        const isAttachedToMass = timeHits.some(th => {
          if (th.timeStr === tCur.timeStr) return false;
          const [thH, thM] = th.timeStr.split(':').map(Number);
          const diffM = Math.abs((thH * 60 + thM) - curMins);
          return diffM <= 75; // czy jest msza w przedziale 75 minut
        });
        const isStandalone = !isAttachedToMass;

        nabozenstwa.push({
          godzina: tCur.timeStr,
          nazwa: 'Nabożeństwo Różańcowe',
          punkty: isStandalone ? 3 : 2,
          typ: 'nabozenstwo',
          samodzielne: isStandalone
        });
      } else {
        const isSun = (cur.dayName.toLowerCase() === 'niedziela');
        const isVigil = (cur.dayName.toLowerCase() === 'sobota' && tCur.timeStr === '17:00');
        const isWszystkichSwietych = (cur.dayNum === 1 && cur.monthStr === 'listopada');
        const isHoliday5Pkt = isWszystkichSwietych || (cur.dayNum === 6 && cur.monthStr === 'stycznia') || (cur.dayNum === 3 && cur.monthStr === 'maja') || (cur.dayNum === 15 && cur.monthStr === 'sierpnia') || (cur.dayNum === 25 && cur.monthStr === 'grudnia') || (cur.dayNum === 26 && cur.monthStr === 'grudnia');

        let nazwaMszy = 'Msza św.';
        let pts = 3;
        let typMszy = 'msza';

        if (isHoliday5Pkt) {
          pts = 5;
          typMszy = 'msza_swieto';
          nazwaMszy = isWszystkichSwietych ? 'Uroczystość Wszystkich Świętych' : 'Msza św. świąteczna';
        } else if (isSchoolMass) {
          nazwaMszy = 'Msza św. szkolna';
          typMszy = 'msza_szkolna';
          pts = 3;
        } else if (isSun) {
          nazwaMszy = 'Msza św. niedzielna';
          typMszy = 'msza_niedziela';
          pts = 3;
        } else if (isVigil) {
          nazwaMszy = 'Msza św. (Wigilia niedzielna)';
          typMszy = 'msza_niedziela';
          pts = 3;
        }

        msze.push({
          godzina: tCur.timeStr,
          nazwa: nazwaMszy,
          punkty: pts,
          typ: typMszy
        });
      }
    }

    const monthInfo = POLISH_MONTHS_MAP[cur.monthStr];
    const isPaździernik = (cur.monthStr === 'października' || (monthInfo && monthInfo.idx === 9));
    const dayNameLow = cur.dayName.toLowerCase();

    // W październiku nabożeństwo różańcowe odbywa się codziennie!
    // W czwartki: po mszy szkolnej o 17:00 -> 17:45 (często nie ma osobnego wpisu intencji w gazetce, bo intencja jest tylko do mszy).
    // W soboty: o 16:15 przed mszą 17:00.
    // W niedziele: o 15:00.
    // W pozostałe dni robocze: o 17:15 przed mszą 18:00.
    if (isPaździernik && nabozenstwa.length === 0) {
      if (dayNameLow === 'czwartek') {
        nabozenstwa.push({
          godzina: '17:45',
          nazwa: 'Nabożeństwo Różańcowe (po mszy szkolnej)',
          punkty: 2,
          typ: 'nabozenstwo',
          poMszy: true
        });
      } else if (dayNameLow === 'sobota') {
        nabozenstwa.push({
          godzina: '16:15',
          nazwa: 'Nabożeństwo Różańcowe',
          punkty: 2,
          typ: 'nabozenstwo'
        });
      } else if (dayNameLow === 'niedziela') {
        nabozenstwa.push({
          godzina: '15:00',
          nazwa: 'Nabożeństwo Różańcowe',
          punkty: 3,
          typ: 'nabozenstwo',
          samodzielne: true
        });
      } else {
        nabozenstwa.push({
          godzina: '17:15',
          nazwa: 'Nabożeństwo Różańcowe',
          punkty: 2,
          typ: 'nabozenstwo'
        });
      }
    } else if (maOsobnyRozaniec && nabozenstwa.length === 0 && msze.length > 0) {
      nabozenstwa.push({
        godzina: '17:45',
        nazwa: 'Nabożeństwo Różańcowe (po mszy)',
        punkty: 2,
        typ: 'nabozenstwo',
        poMszy: true
      });
    }

    const isWszystkichSwietych = (cur.dayNum === 1 && cur.monthStr === 'listopada');
    daysResult.push({
      dzien: cur.dayNum,
      dzienTygodnia: cur.dayName,
      miesiacNazwa: monthInfo ? monthInfo.name : cur.monthStr,
      miesiacIdx: monthInfo ? monthInfo.idx : 9,
      czySwieto: isWszystkichSwietych,
      nazwaSwieta: isWszystkichSwietych ? 'Uroczystość Wszystkich Świętych' : null,
      punktyZaObecnosc: isWszystkichSwietych ? 5 : 3,
      msze: msze,
      nabozenstwa: nabozenstwa,
      godzinyMszy: msze.map(m => m.godzina)
    });
  }

  return daysResult;
}

async function syncAllBulletins() {
  console.log("==================================================================");
  console.log("🤖 AUTOMATYCZNY SYNCHRONIZATOR GRAFIKU Z GAZETKĄ PARAFIALNĄ");
  console.log("   Parafia św. Józefa Robotnika w Tarnowskich Górach");
  console.log("==================================================================");

  const bulletins = await fetchGazetkiList();
  if (bulletins.length === 0) {
    console.log("⚠️ Nie znaleziono żadnych gazetek na stronie parafii.");
    return;
  }

  // Pobieramy wszystkie dostępne wydania ze strony (np. 1442, 1443, 1444), aby objąć cały bieżący okres
  const toProcess = bulletins;

  const allParsedDays = {};
  const processedIssues = [];

  for (const b of toProcess) {
    try {
      const days = await parseGazetkaPdf(b.pdfUrl);
      processedIssues.push(b.nr ? `Nr ${b.nr} (${b.dateText})` : b.dateText);
      for (const d of days) {
        const key = `${d.miesiacNazwa}_${d.dzien}`;
        allParsedDays[key] = d;
      }
    } catch (err) {
      console.error(`❌ Błąd przetwarzania gazetki ${b.pdfUrl}:`, err.message);
    }
  }

  console.log(`\n[3/4] Podsumowanie sparsowanego harmonogramu:`);
  for (const k in allParsedDays) {
    const d = allParsedDays[k];
    const mszeStr = d.msze.map(m => `${m.godzina} (${m.nazwa}, ${m.punkty}pkt)`).join(', ');
    const nabStr = d.nabozenstwa.map(n => `${n.godzina} (${n.nazwa}, ${n.punkty}pkt)`).join(', ');
    console.log(`      📅 ${d.dzien} ${d.miesiacNazwa} (${d.dzienTygodnia}):`);
    console.log(`         - Msze: ${mszeStr || 'brak'}`);
    if (nabStr) console.log(`         - Nabożeństwa: ${nabStr}`);
  }

  // Zapisujemy do Firestore
  console.log(`\n[4/4] Zapisywanie do bazy danych Firestore...`);

  // Dzielimy dni wg dokumentów miesięcznych, np. Październik_2026
  const monthsMap = {};
  const nowYear = 2026;

  for (const k in allParsedDays) {
    const d = allParsedDays[k];
    const docKey = `${d.miesiacNazwa}_${nowYear}`;
    if (!monthsMap[docKey]) monthsMap[docKey] = {};
    monthsMap[docKey][d.dzien] = {
      dzien: d.dzien,
      dzienTygodnia: d.dzienTygodnia,
      msze: d.msze,
      nabozenstwa: d.nabozenstwa,
      godzinyMszy: d.godzinyMszy
    };
  }

  for (const docKey in monthsMap) {
    console.log(`      Pobieranie stanu dokumentu stan_grafiku/${docKey}...`);
    const existingDoc = await getDoc('stan_grafiku', docKey) || {};
    const existingHarmonogram = existingDoc.harmonogramDni || {};

    // Scalamy nowe dni z istniejącymi
    const mergedHarmonogram = Object.assign({}, existingHarmonogram, monthsMap[docKey]);

    const patchPayload = {
      harmonogramDni: mergedHarmonogram,
      ostatniaSynchronizacjaGazetki: new Date().toISOString(),
      zsynchronizowaneWydania: processedIssues
    };

    console.log(`      Aktualizacja dokumentu ${docKey} (dni: ${Object.keys(mergedHarmonogram).join(', ')})...`);
    await patchDoc('stan_grafiku', docKey, patchPayload, ['harmonogramDni', 'ostatniaSynchronizacjaGazetki', 'zsynchronizowaneWydania']);
    console.log(`      ✅ Zaktualizowano pomyślnie stan_grafiku/${docKey}!`);

    // Zaktualizuj również wersję bez polskich znaków (alias, np. Pazdziernik_2026)
    const asciiKey = docKey.replace(/ź/g, 'z').replace(/ł/g, 'l').replace(/ą/g, 'a').replace(/ę/g, 'e').replace(/ś/g, 's').replace(/ć/g, 'c').replace(/ż/g, 'z').replace(/ń/g, 'n').replace(/ó/g, 'o');
    if (asciiKey !== docKey) {
      await patchDoc('stan_grafiku', asciiKey, patchPayload, ['harmonogramDni', 'ostatniaSynchronizacjaGazetki', 'zsynchronizowaneWydania']).catch(() => {});
      console.log(`      ✅ Zaktualizowano pomyślnie alias stan_grafiku/${asciiKey}!`);
    }
  }

  // Zapisujemy także centralną kopię w konfiguracja/harmonogram_liturgiczny
  console.log(`      Aktualizacja konfiguracja/harmonogram_liturgiczny...`);
  await patchDoc('konfiguracja', 'harmonogram_liturgiczny', {
    harmonogram: monthsMap,
    ostatniaSynchronizacja: new Date().toISOString(),
    zsynchronizowaneWydania: processedIssues
  }, ['harmonogram', 'ostatniaSynchronizacja', 'zsynchronizowaneWydania']);
  console.log(`      ✅ Zaktualizowano pomyślnie konfiguracja/harmonogram_liturgiczny!`);

  console.log("\n🎉 Synchronizacja z gazetką parafialną zakończona sukcesem!");
  await sendTelegramMessage(`📰 <b>Synchronizacja Gazetki Parafialnej</b>\n\n✅ Zsynchronizowano wydania: ${processedIssues.join(', ') || 'brak nowych'}\n📅 Dni w harmonogramie: ${Object.keys(monthsMap).join(', ')}`);
}

if (require.main === module) {
  syncAllBulletins().catch(err => {
    console.error("FATAL ERROR:", err);
    process.exit(1);
  });
}

module.exports = { syncAllBulletins, parseGazetkaPdf, fetchGazetkiList };
