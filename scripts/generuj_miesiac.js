const https = require('https');

const API_KEY = "AIzaSyAsgkKWXr-L3fDHQODxioVssvIGL9SQePk";
const PROJECT_ID = "makole-85f32";

const POLSKIE_MIESIACE = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
];
const SKROTY_DNI = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"];

// Stałe uroczystości i święta nakazane / specjalne (z podwyższoną punktacją, np. 5 pkt za Wszystkich Świętych)
const SWIETA_LITURGICZNE_STALE = {
  "01-01": { nazwa: "Uroczystość Świętej Bożej Rodzicielki", punkty: 5, porzadekNiedzielny: true },
  "01-06": { nazwa: "Uroczystość Objawienia Pańskiego (Trzech Króli)", punkty: 5, porzadekNiedzielny: true },
  "05-01": { nazwa: "Św. Józefa Rzemieślnika", punkty: 4, porzadekNiedzielny: false },
  "05-03": { nazwa: "Uroczystość NMP Królowej Polski", punkty: 5, porzadekNiedzielny: true },
  "08-15": { nazwa: "Uroczystość Wniebowzięcia NMP", punkty: 5, porzadekNiedzielny: true },
  "11-01": { nazwa: "Uroczystość Wszystkich Świętych", punkty: 5, porzadekNiedzielny: true },
  "11-02": { nazwa: "Wspomnienie Wszystkich Wiernych Zmarłych (Zaduszki)", punkty: 4, porzadekNiedzielny: false },
  "11-11": { nazwa: "Narodowe Święto Niepodległości", punkty: 4, porzadekNiedzielny: false },
  "12-25": { nazwa: "Uroczystość Narodzenia Pańskiego (Boże Narodzenie)", punkty: 5, porzadekNiedzielny: true },
  "12-26": { nazwa: "Święto św. Szczepana", punkty: 5, porzadekNiedzielny: true }
};

function pobierzInformacjeOSwiecie(rok, mIdx, dzien) {
  const mm = String(mIdx + 1).padStart(2, '0');
  const dd = String(dzien).padStart(2, '0');
  const kluczStaly = `${mm}-${dd}`;
  if (SWIETA_LITURGICZNE_STALE[kluczStaly]) {
    return SWIETA_LITURGICZNE_STALE[kluczStaly];
  }

  // Obliczenie Wielkanocy dla świąt ruchomych
  const a = rok % 19;
  const b = Math.floor(rok / 100);
  const c = rok % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const easterMonth = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const easterDay = ((h + l - 7 * m + 114) % 31) + 1;
  const easterDate = new Date(rok, easterMonth, easterDay, 12, 0, 0);

  const curDate = new Date(rok, mIdx, dzien, 12, 0, 0);
  const diffDays = Math.round((curDate - easterDate) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    return { nazwa: "Poniedziałek Wielkanocny", punkty: 5, porzadekNiedzielny: true };
  }
  if (diffDays === 60) {
    return { nazwa: "Uroczystość Najświętszego Ciała i Krwi Chrystusa (Boże Ciało)", punkty: 5, porzadekNiedzielny: true };
  }
  return null;
}

// Zamiana obiektów JS na format Firestore REST API v1
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

// Odczyt formatu Firestore REST API v1 na zwykły obiekt JS
function fromFirestoreValue(val) {
  if (!val) return null;
  if ('nullValue' in val) return null;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return parseFloat(val.doubleValue);
  if ('stringValue' in val) return val.stringValue;
  if ('arrayValue' in val) {
    return (val.arrayValue.values || []).map(fromFirestoreValue);
  }
  if ('mapValue' in val) {
    const res = {};
    const fields = val.mapValue.fields || {};
    for (const k in fields) {
      res[k] = fromFirestoreValue(fields[k]);
    }
    return res;
  }
  return null;
}

function pobierzDokument(kolekcja, docId) {
  return new Promise((resolve, reject) => {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${encodeURIComponent(kolekcja)}/${encodeURIComponent(docId)}?key=${API_KEY}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            const fields = json.fields || {};
            const plain = {};
            for (const k in fields) {
              plain[k] = fromFirestoreValue(fields[k]);
            }
            resolve({ exists: true, data: plain });
          } catch (e) {
            reject(e);
          }
        } else if (res.statusCode === 404) {
          resolve({ exists: false, data: null });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

function zapiszDokument(kolekcja, docId, obiektDanych) {
  return new Promise((resolve, reject) => {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${encodeURIComponent(kolekcja)}/${encodeURIComponent(docId)}?key=${API_KEY}`;
    const fields = {};
    for (const k in obiektDanych) {
      if (Object.prototype.hasOwnProperty.call(obiektDanych, k)) {
        fields[k] = toFirestoreValue(obiektDanych[k]);
      }
    }
    const payload = JSON.stringify({ fields: fields });
    const parsedUrl = new URL(url);
    const req = https.request({
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ sukces: true });
        } else {
          reject(new Error(`Błąd zapisu Firestore HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// Algorytm rotacji godzin dla 4 grup (liniowy, odporny na zmianę roku)
function wyznaczRotowaneGodzinyGrup(rok, miesiacIdx) {
  const godzinyKolejnosc = ["08:30", "10:00", "11:30", "17:00"];
  // Baza: Wrzesień 2026 (rok = 2026, miesiacIdx = 8)
  // IV GRUPA (ŻÓŁTA) -> 08:30 (idx 0)
  // I GRUPA (CZERWONA) -> 10:00 (idx 1)
  // II GRUPA (POMARAŃCZOWA) -> 11:30 (idx 2)
  // III GRUPA (ZIELONA) -> 17:00 (idx 3)
  const r = parseInt(rok, 10);
  const m = parseInt(miesiacIdx, 10);
  const diffMiesiace = (r - 2026) * 12 + (m - 8);
  const shift = ((diffMiesiace % 4) + 4) % 4;

  return {
    "I GRUPA (CZERWONA)": godzinyKolejnosc[(1 + shift) % 4],
    "II GRUPA (POMARAŃCZOWA)": godzinyKolejnosc[(2 + shift) % 4],
    "III GRUPA (ZIELONA)": godzinyKolejnosc[(3 + shift) % 4],
    "IV GRUPA (ŻÓŁTA)": godzinyKolejnosc[(0 + shift) % 4]
  };
}

async function generujMiesiac(docelowyKlucz, forceOverwrite = false) {
  let docelowaNazwa = docelowyKlucz;
  let targetRok = 2026;
  let targetMIdx = 9; // Październik domyślnie

  if (docelowyKlucz) {
    const parts = docelowyKlucz.split('_');
    const mName = parts[0];
    const yVal = parseInt(parts[1], 10);
    const mIdx = POLSKIE_MIESIACE.findIndex(m => m.toLowerCase() === mName.toLowerCase());
    if (mIdx !== -1 && !isNaN(yVal)) {
      targetMIdx = mIdx;
      targetRok = yVal;
      docelowaNazwa = POLSKIE_MIESIACE[mIdx] + '_' + yVal;
    }
  }

  console.log(`\n=== ROZPOCZYNAM GENEROWANIE MIESIĄCA: ${docelowaNazwa} ===`);

  // 1. Zabezpieczenie idempotentności: sprawdzenie czy miesiąc już istnieje
  const checkIstniejacy = await pobierzDokument('stan_grafiku', docelowaNazwa);
  if (checkIstniejacy.exists && !forceOverwrite) {
    console.log(`⚠️ UWAGA: Dokument stan_grafiku/${docelowaNazwa} JUŻ ISTNIEJE w Firestore!`);
    console.log(`🔒 ZABLOKOWANO NADPISANIE: Dane o obecnościach, punktach i zamianach są chronione. Użyj forceOverwrite aby nadpisać.`);
    return { sukces: false, juzIstnieje: true };
  }

  // 2. Pobranie danych bazowych (Wrzesień 2026 lub poprzedni miesiąc)
  let bMIdx = (targetMIdx === 0) ? 11 : targetMIdx - 1;
  let bRok = (targetMIdx === 0) ? targetRok - 1 : targetRok;
  let bazowyKlucz = POLSKIE_MIESIACE[bMIdx] + '_' + bRok;

  console.log(`Pobieranie danych wzorcowych z: stan_grafiku/${bazowyKlucz}...`);
  let bazaDoc = await pobierzDokument('stan_grafiku', bazowyKlucz);
  if (!bazaDoc.exists) {
    console.log(`Nie znaleziono ${bazowyKlucz}, próba odczytu Wrzesień_2026...`);
    bazaDoc = await pobierzDokument('stan_grafiku', 'Wrzesień_2026');
  }

  if (!bazaDoc.exists || !bazaDoc.data || !bazaDoc.data.wiersze) {
    throw new Error('Brak danych wzorcowych w Firestore do wygenerowania nowego miesiąca!');
  }

  const baza = bazaDoc.data;

  // 3. Obliczenie dni docelowego miesiąca oraz świąt i uroczystości
  const dniWNowym = new Date(targetRok, targetMIdx + 1, 0).getDate();
  const dniNaglowek = [];
  const dniSwiateczneMap = {};

  for (let d = 1; d <= dniWNowym; d++) {
    const dt = new Date(targetRok, targetMIdx, d);
    const dow = dt.getDay(); // 0 = Nd, 1 = Pn, ..., 6 = Sb
    const swieto = pobierzInformacjeOSwiecie(targetRok, targetMIdx, d);
    if (swieto) dniSwiateczneMap[d] = swieto;

    dniNaglowek.push({
      dzien: d,
      skrotDnia: SKROTY_DNI[dow],
      czySobota: dow === 6,
      czyNiedziela: dow === 0,
      czySwieto: !!swieto,
      nazwaSwieta: swieto ? swieto.nazwa : null,
      punktyZaObecnosc: swieto ? swieto.punkty : (dow === 0 ? 3 : 3)
    });
  }

  // 4. Rotacja godzin niedzielnych
  const rotowaneGodziny = wyznaczRotowaneGodzinyGrup(targetRok, targetMIdx);
  console.log(`Rotacja godzin niedzielnych dla ${docelowaNazwa}:`, rotowaneGodziny);

  // 5. Lista nieaktywnych ministrantów (którzy zrezygnowali)
  const nieaktywni = ["Mateusz Pokojski"];

  // 6. Przeniesienie wierszy ministrantów i stałych dyżurów
  const noweWiersze = [];
  let lp = 1;

  for (const w of baza.wiersze) {
    if (!w.nazwisko) continue;
    if (nieaktywni.some(n => w.nazwisko.toLowerCase().includes(n.toLowerCase()))) {
      console.log(`Pominięto nieaktywnego ministranta: ${w.nazwisko}`);
      continue;
    }

    // Ustalenie stałego dnia tygodnia z poprzedniego miesiąca (Pn-Pt)
    let stalyDzienTygodnia = (w.stalyDzienTygodnia !== undefined && w.stalyDzienTygodnia > 0) ? w.stalyDzienTygodnia : -1;
    if (stalyDzienTygodnia === -1 && w.komorki && w.komorki.length) {
      for (let dayIdx = 0; dayIdx < w.komorki.length; dayIdx++) {
        const dtPrev = new Date(baza.rok || 2026, baza.miesiacIdx !== undefined ? baza.miesiacIdx : 8, dayIdx + 1);
        const dowPrev = dtPrev.getDay();
        if (dowPrev >= 1 && dowPrev <= 5 && w.komorki[dayIdx] && w.komorki[dayIdx].maDyzur) {
          stalyDzienTygodnia = dowPrev;
          break;
        }
      }
    }

    // Generowanie komórek na nowy miesiąc
    const noweKomorki = [];
    for (let d = 1; d <= dniWNowym; d++) {
      const dtNowy = new Date(targetRok, targetMIdx, d);
      const dowNowy = dtNowy.getDay();
      const swietoInfo = dniSwiateczneMap[d];
      let maDyzur = false;

      if (dowNowy === 0 || (swietoInfo && swietoInfo.porzadekNiedzielny)) {
        // Każdy ministrant ma dyżur w niedzielę lub w święto z porządkiem niedzielnym (w godzinie swojej grupy)
        maDyzur = true;
      } else if (dowNowy >= 1 && dowNowy <= 5 && dowNowy === stalyDzienTygodnia) {
        // Stały dyżur w tygodniu
        maDyzur = true;
      }

      noweKomorki.push({
        maDyzur: maDyzur,
        wartosc: null
      });
    }

    noweWiersze.push({
      lp: lp++,
      nazwisko: w.nazwisko,
      grupa: w.grupa || "Ogólna",
      stopien: w.stopien || "Ministrant",
      stopienRanga: w.stopienRanga || 1,
      stalyDzienTygodnia: stalyDzienTygodnia,
      ostatniaZmianaDnia: w.ostatniaZmianaDnia || null,
      komorki: noweKomorki,
      suma: 0
    });
  }

  // 7. Przeniesienie skumulowanego rankingu rocznego
  const rankingRokPrzeniesiony = [];
  const prevRok = baza.rankingRok || baza.rankingMiesiac || [];
  for (const nw of noweWiersze) {
    const prevItem = prevRok.find(p => p.nazwisko && p.nazwisko.toLowerCase() === nw.nazwisko.toLowerCase());
    rankingRokPrzeniesiony.push({
      nazwisko: nw.nazwisko,
      punkty: prevItem ? (prevItem.punkty || prevItem.suma || 0) : 0,
      grupa: nw.grupa
    });
  }
  rankingRokPrzeniesiony.sort((a, b) => b.punkty - a.punkty);
  let poz = 1;
  rankingRokPrzeniesiony.forEach((r, idx) => {
    if (idx > 0 && r.punkty < rankingRokPrzeniesiony[idx - 1].punkty) poz = idx + 1;
    r.pozycja = poz;
  });

  // 8. Złożenie kompletnego dokumentu stanu grafiku
  const nowyStanGrafiku = {
    nazwaMiesiaca: POLSKIE_MIESIACE[targetMIdx],
    rok: targetRok,
    miesiacIdx: targetMIdx,
    dniNaglowek: dniNaglowek,
    grupy: [
      { nazwa: "I GRUPA (CZERWONA)", godzinaNiedziela: rotowaneGodziny["I GRUPA (CZERWONA)"] },
      { nazwa: "II GRUPA (POMARAŃCZOWA)", godzinaNiedziela: rotowaneGodziny["II GRUPA (POMARAŃCZOWA)"] },
      { nazwa: "III GRUPA (ZIELONA)", godzinaNiedziela: rotowaneGodziny["III GRUPA (ZIELONA)"] },
      { nazwa: "IV GRUPA (ŻÓŁTA)", godzinaNiedziela: rotowaneGodziny["IV GRUPA (ŻÓŁTA)"] }
    ],
    wiersze: noweWiersze,
    ranking: noweWiersze.map((w, idx) => ({ nazwisko: w.nazwisko, suma: 0, miejsce: 1, grupa: w.grupa })),
    rankingMiesiac: noweWiersze.map((w, idx) => ({ nazwisko: w.nazwisko, punkty: 0, pozycja: 1, grupa: w.grupa })),
    rankingRok: rankingRokPrzeniesiony,
    rankingMinusy: [],
    rankingiMiesiecy: baza.rankingiMiesiecy || [],
    gieldaTydzien: [],
    gieldaNiedziele: [],
    zamianyZastepstwa: [],
    wolneZastepstwa: [],
    liturgieDodatkowe: [],
    historiaWpisow: [],
    zaktualizowano: new Date().toISOString()
  };

  // 9. Zapis do bazy Firestore
  console.log(`Zapisywanie nowego grafiku do Firestore: stan_grafiku/${docelowaNazwa}...`);
  await zapiszDokument('stan_grafiku', docelowaNazwa, nowyStanGrafiku);

  // Alias bez polskich znaków
  const asciiKey = docelowaNazwa.replace(/ź/g, 'z').replace(/ł/g, 'l').replace(/ą/g, 'a').replace(/ę/g, 'e').replace(/ś/g, 's').replace(/ć/g, 'c').replace(/ż/g, 'z').replace(/ń/g, 'n').replace(/ó/g, 'o');
  if (asciiKey !== docelowaNazwa) {
    await zapiszDokument('stan_grafiku', asciiKey, nowyStanGrafiku).catch(() => {});
  }

  console.log(`✓ SUKCES! Wygenerowano i zapisano miesiąc: ${docelowaNazwa} (${dniWNowym} dni, ${noweWiersze.length} ministrantów).`);
  return { sukces: true, docId: docelowaNazwa };
}

// Uruchomienie z linii poleceń
if (require.main === module) {
  const target = process.argv[2] || 'Październik_2026';
  const force = process.argv.includes('--force');
  generujMiesiac(target, force)
    .then(res => {
      console.log('Wynik operacji:', res);
      process.exit(0);
    })
    .catch(err => {
      console.error('Błąd generowania:', err);
      process.exit(1);
    });
}

module.exports = { generujMiesiac, wyznaczRotowaneGodzinyGrup };
