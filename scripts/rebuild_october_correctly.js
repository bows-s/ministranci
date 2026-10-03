const https = require('https');

const API_KEY = "AIzaSyAsgkKWXr-L3fDHQODxioVssvIGL9SQePk";
const PROJECT_ID = "makole-85f32";

const POLSKIE_MIESIACE = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
];
const SKROTY_DNI = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"];

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

// 1. Zdefiniowanie stałych dni tygodnia z grafiku parafialnego
const STALE_DNI_MINISTRANTOW = {
  "Maks Erich": 1,           // Poniedziałek
  "Jakub Brytner": 1,        // Poniedziałek
  "Ksawery Skrzypek": 2,     // Wtorek
  "Michał Kupiec": 2,        // Wtorek
  "Mikołaj Erich": 2,        // Wtorek
  "Franek Kik": 2,           // Wtorek
  "Jan Radliński": 4,        // Czwartek
  "Rafał Danielczok": 4,     // Czwartek
  "Marcel Mazurkiewicz": 4,  // Czwartek
  "Bartosz Rozik": 4,        // Czwartek
  "Mateusz Pierścieński": 5, // Piątek
  "Maciej Erich": 5,         // Piątek (DYŻUR W PIĄTEK!)
  "Emil Czech": 5,           // Piątek
  "Wiktor Kowalski": -1,     // Brak stałego dnia
  "Michał Danielczok": -1,   // Brak stałego dnia
  "Paweł Głaz": -1           // Brak stałego dnia
};

// 2. Punkty końcowe z Września 2026 (do skumulowanego rankingu rocznego)
const PUNKTY_WRZESIEN = {
  "Franek Kik": 51,
  "Emil Czech": 49,
  "Jakub Brytner": 34,
  "Ksawery Skrzypek": 27,
  "Jan Radliński": 26,
  "Rafał Danielczok": 18,
  "Bartosz Rozik": 16,
  "Maciej Erich": 14,
  "Mikołaj Erich": 5,
  "Mateusz Pierścieński": 4,
  "Maks Erich": -4,
  "Wiktor Kowalski": -4,
  "Michał Danielczok": -4,
  "Marcel Mazurkiewicz": -13,
  "Paweł Głaz": -17,
  "Michał Kupiec": -21
};

// 3. Rzeczywiste obecności i punkty zdobyte w Październiku 2026 (1-3 października)
// Dzień 1 (czwartek): Jan Radliński (+5), Rafał Danielczok (+5), Bartosz Rozik (+5), Marcel Mazurkiewicz (-5), Jakub Brytner (+2), Franek Kik (+2)
// Dzień 2 (piątek): Maciej Erich (+7), Emil Czech (+7), Mateusz Pierścieński (-5)
// Dzień 3 (sobota): Maciej Erich (+4 za mszę róży różańcowej)
const PUNKTY_PAZDZIERNIK_KOMORKI = {
  "Jan Radliński": { 1: 5 },
  "Rafał Danielczok": { 1: 5 },
  "Bartosz Rozik": { 1: 5 },
  "Marcel Mazurkiewicz": { 1: -5 },
  "Jakub Brytner": { 1: 2 },
  "Franek Kik": { 1: 2 },
  "Maciej Erich": { 2: 7, 3: 4 },
  "Emil Czech": { 2: 7 },
  "Mateusz Pierścieński": { 2: -5 }
};

const MINISTRANCI_CONFIG = [
  { nazwisko: "Maks Erich", grupa: "I GRUPA (CZERWONA)", stopien: "Lektor", stopienRanga: 4 },
  { nazwisko: "Mateusz Pierścieński", grupa: "I GRUPA (CZERWONA)", stopien: "Starszy ministrant", stopienRanga: 3 },
  { nazwisko: "Jan Radliński", grupa: "I GRUPA (CZERWONA)", stopien: "Młodszy ministrant", stopienRanga: 2 },
  { nazwisko: "Wiktor Kowalski", grupa: "I GRUPA (CZERWONA)", stopien: "Młodszy ministrant", stopienRanga: 2 },

  { nazwisko: "Maciej Erich", grupa: "II GRUPA (POMARAŃCZOWA)", stopien: "Animator", stopienRanga: 5 },
  { nazwisko: "Ksawery Skrzypek", grupa: "II GRUPA (POMARAŃCZOWA)", stopien: "Starszy ministrant", stopienRanga: 3 },
  { nazwisko: "Rafał Danielczok", grupa: "II GRUPA (POMARAŃCZOWA)", stopien: "Młodszy ministrant", stopienRanga: 2 },

  { nazwisko: "Michał Kupiec", grupa: "III GRUPA (ZIELONA)", stopien: "Lektor", stopienRanga: 4 },
  { nazwisko: "Paweł Głaz", grupa: "III GRUPA (ZIELONA)", stopien: "Kandydat", stopienRanga: 1 },
  { nazwisko: "Mikołaj Erich", grupa: "III GRUPA (ZIELONA)", stopien: "Starszy ministrant", stopienRanga: 3 },
  { nazwisko: "Jakub Brytner", grupa: "III GRUPA (ZIELONA)", stopien: "Młodszy ministrant", stopienRanga: 2 },
  { nazwisko: "Franek Kik", grupa: "III GRUPA (ZIELONA)", stopien: "Kandydat", stopienRanga: 1 },

  { nazwisko: "Michał Danielczok", grupa: "IV GRUPA (ŻÓŁTA)", stopien: "Kandydat", stopienRanga: 1 },
  { nazwisko: "Marcel Mazurkiewicz", grupa: "IV GRUPA (ŻÓŁTA)", stopien: "Młodszy ministrant", stopienRanga: 2 },
  { nazwisko: "Emil Czech", grupa: "IV GRUPA (ŻÓŁTA)", stopien: "Młodszy ministrant", stopienRanga: 2 },
  { nazwisko: "Bartosz Rozik", grupa: "IV GRUPA (ŻÓŁTA)", stopien: "Młodszy ministrant", stopienRanga: 2 }
];

async function zbudujPrawidlowyPazdziernik() {
  console.log('=== BUDOWANIE PRAWIDŁOWEGO GRAFIKU DLA PAŹDZIERNIKA 2026 ===');

  const rok = 2026;
  const miesiacIdx = 9; // Październik
  const dniWNowym = 31;

  // 1. Dni nagłówka
  const dniNaglowek = [];
  for (let d = 1; d <= dniWNowym; d++) {
    const dt = new Date(rok, miesiacIdx, d);
    const dow = dt.getDay(); // 0 = Nd, 1 = Pn, ..., 6 = Sb
    dniNaglowek.push({
      dzien: d,
      skrotDnia: SKROTY_DNI[dow],
      czySobota: dow === 6,
      czyNiedziela: dow === 0
    });
  }

  // 2. Rotacja grup w Październiku 2026:
  // Wrzesień baza: I=10:00, II=11:30, III=17:00, IV=08:30 (shift 0)
  // Październik (+1 miesiąc, shift 1):
  // I (CZERWONA) -> 11:30
  // II (POMARAŃCZOWA) -> 17:00
  // III (ZIELONA) -> 08:30
  // IV (ŻÓŁTA) -> 10:00
  const rotowaneGodziny = {
    "I GRUPA (CZERWONA)": "11:30",
    "II GRUPA (POMARAŃCZOWA)": "17:00",
    "III GRUPA (ZIELONA)": "08:30",
    "IV GRUPA (ŻÓŁTA)": "10:00"
  };

  // 3. Wiersze ministrantów
  const wiersze = [];
  let lp = 1;

  for (const m of MINISTRANCI_CONFIG) {
    const stalyDzien = STALE_DNI_MINISTRANTOW[m.nazwisko] !== undefined ? STALE_DNI_MINISTRANTOW[m.nazwisko] : -1;
    const punktyOkt = PUNKTY_PAZDZIERNIK_KOMORKI[m.nazwisko] || {};

    const komorki = [];
    let sumaOkt = 0;

    for (let d = 1; d <= dniWNowym; d++) {
      const dt = new Date(rok, miesiacIdx, d);
      const dow = dt.getDay();

      // Dyżur przypada:
      // - w niedziele (dow === 0)
      // - w stały dzień tygodnia (dow >= 1 && dow <= 5 && dow === stalyDzien)
      const maDyzur = (dow === 0 || (dow >= 1 && dow <= 5 && dow === stalyDzien));
      const val = (punktyOkt[d] !== undefined) ? punktyOkt[d] : null;

      if (typeof val === 'number') {
        sumaOkt += val;
      }

      komorki.push({
        dzien: d,
        maDyzur: maDyzur,
        wartosc: val,
        bg: ""
      });
    }

    wiersze.push({
      lp: lp++,
      nazwisko: m.nazwisko,
      grupa: m.grupa,
      stopien: m.stopien,
      stopienRanga: m.stopienRanga,
      stalyDzienTygodnia: stalyDzien,
      ostatniaZmianaDnia: null,
      komorki: komorki,
      suma: sumaOkt
    });
  }

  // 4. Ranking miesięczny (tylko punkty z października!)
  const rankingMiesiac = wiersze.map(w => ({
    nazwisko: w.nazwisko,
    normName: w.nazwisko.toLowerCase(),
    punkty: w.suma,
    suma: w.suma,
    grupa: w.grupa
  })).sort((a, b) => b.punkty - a.punkty);

  let pozM = 1;
  rankingMiesiac.forEach((r, idx) => {
    if (idx > 0 && r.punkty < rankingMiesiac[idx - 1].punkty) pozM = idx + 1;
    r.pozycja = pozM;
    r.miejsce = pozM;
  });

  // 5. Ranking roczny (punkty wrzesień + punkty październik)
  const rankingRok = wiersze.map(w => {
    const pWrz = PUNKTY_WRZESIEN[w.nazwisko] || 0;
    const pOkt = w.suma;
    const lacznie = pWrz + pOkt;
    return {
      nazwisko: w.nazwisko,
      normName: w.nazwisko.toLowerCase(),
      punkty: lacznie,
      suma: lacznie,
      grupa: w.grupa
    };
  }).sort((a, b) => b.punkty - a.punkty);

  let pozR = 1;
  rankingRok.forEach((r, idx) => {
    if (idx > 0 && r.punkty < rankingRok[idx - 1].punkty) pozR = idx + 1;
    r.pozycja = pozR;
    r.miejsce = pozR;
  });

  // 6. Ranking minusów w październiku
  const rankingMinusy = [];
  wiersze.forEach(w => {
    let minusyCount = 0;
    w.komorki.forEach(c => {
      if (typeof c.wartosc === 'number' && c.wartosc < 0) {
        minusyCount += Math.abs(c.wartosc);
      }
    });
    if (minusyCount > 0) {
      rankingMinusy.push({
        nazwisko: w.nazwisko,
        punkty: -minusyCount,
        grupa: w.grupa
      });
    }
  });
  rankingMinusy.sort((a, b) => a.punkty - b.punkty); // Najwięcej minusów pierwsze

  // 7. Złożenie kompletnego, czystego stanu grafiku dla Październik 2026
  const stanGrafikuPazdziernik = {
    nazwaMiesiaca: "Październik",
    rok: 2026,
    miesiacIdx: 9,
    dniNaglowek: dniNaglowek,
    grupy: [
      { nazwa: "I GRUPA (CZERWONA)", godzinaNiedziela: rotowaneGodziny["I GRUPA (CZERWONA)"] },
      { nazwa: "II GRUPA (POMARAŃCZOWA)", godzinaNiedziela: rotowaneGodziny["II GRUPA (POMARAŃCZOWA)"] },
      { nazwa: "III GRUPA (ZIELONA)", godzinaNiedziela: rotowaneGodziny["III GRUPA (ZIELONA)"] },
      { nazwa: "IV GRUPA (ŻÓŁTA)", godzinaNiedziela: rotowaneGodziny["IV GRUPA (ŻÓŁTA)"] }
    ],
    wiersze: wiersze,
    ranking: rankingMiesiac,
    rankingMiesiac: rankingMiesiac,
    rankingRok: rankingRok,
    rankingMinusy: rankingMinusy,
    rankingiMiesiecy: {
      "Wrzesień": Object.entries(PUNKTY_WRZESIEN).map(([nazwisko, punkty]) => ({ nazwisko, punkty }))
    },
    // Giełda i zamiany są CZYSTE na październik (żadnych zaszłości z września!)
    gieldaTydzien: [],
    gieldaNiedziele: [],
    zamianyZastepstwa: [],
    wolneZastepstwa: [],
    liturgieDodatkowe: [],
    historiaWpisow: [
      {
        czas: "03.10.2026 08:30",
        dzien: "3 października",
        godzina: "08:00",
        liturgia: "Msza Róży Różańcowej",
        nazwisko: "Maciej Erich",
        punkty: 4,
        status: "OBECNY (Msza Róży Różańcowej +4 pkt)",
        typ: "DODATKOWY",
        wpisal: "Kościelny",
        zastepuje: "-"
      },
      {
        czas: "02.10.2026 18:45",
        dzien: "2 października",
        godzina: "18:00",
        liturgia: "Msza św. z nabożeństwem różańcowym",
        nazwisko: "Maciej Erich",
        punkty: 7,
        status: "OBECNY (Msza + różaniec +7 pkt)",
        typ: "REGULARNY",
        wpisal: "Kościelny",
        zastepuje: "-"
      },
      {
        czas: "02.10.2026 18:45",
        dzien: "2 października",
        godzina: "18:00",
        liturgia: "Msza św. z nabożeństwem różańcowym",
        nazwisko: "Emil Czech",
        punkty: 7,
        status: "OBECNY (Msza + różaniec +7 pkt)",
        typ: "REGULARNY",
        wpisal: "Kościelny",
        zastepuje: "-"
      },
      {
        czas: "02.10.2026 18:45",
        dzien: "2 października",
        godzina: "18:00",
        liturgia: "Msza św.",
        nazwisko: "Mateusz Pierścieński",
        punkty: -5,
        status: "NIEOBECNY (-5 pkt)",
        typ: "REGULARNY",
        wpisal: "Kościelny",
        zastepuje: "-"
      }
    ],
    zaktualizowano: new Date().toISOString()
  };

  console.log(`\nZapisywanie czystego, prawidłowego Październik_2026 do Firestore...`);
  await zapiszDokument('stan_grafiku', 'Październik_2026', stanGrafikuPazdziernik);
  console.log(`✓ SUKCES! Zapisano prawidłowy Październik_2026 do bazy Firestore.`);

  // Wypisz dla weryfikacji Macieja Ericha
  const maciej = wiersze.find(w => w.nazwisko === "Maciej Erich");
  console.log(`\nWeryfikacja Maciej Erich:`);
  console.log(`- Stały dzień: ${maciej.stalyDzienTygodnia} (5 = Piątek)`);
  console.log(`- Suma punktów w październiku: ${maciej.suma} pkt`);
  const dyzuryMacieja = maciej.komorki.filter(c => c.maDyzur).map(c => c.dzien);
  console.log(`- Dni dyżurów w październiku:`, dyzuryMacieja.join(', '));
  console.log(`  (Niedziele: 4, 11, 18, 25 oraz Piątki: 2, 9, 16, 23, 30)`);
}

zbudujPrawidlowyPazdziernik()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Błąd:', err);
    process.exit(1);
  });
