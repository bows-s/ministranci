const https = require('https');
const API_KEY = "AIzaSyAsgkKWXr-L3fDHQODxioVssvIGL9SQePk";
const PROJECT_ID = "makole-85f32";

const SKROTY_DNI = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"];
const DNI_NAZWY_MINUS = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];

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

function getDoc(docName) {
  return new Promise((resolve) => {
    const url = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/stan_grafiku/' + encodeURIComponent(docName) + '?key=' + API_KEY;
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const fields = json.fields || {};
          const docData = {};
          for (const k in fields) docData[k] = fromFirestoreValue(fields[k]);
          resolve(docData);
        } catch(e) { resolve(null); }
      });
    });
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

function czyTenSam(a, b) {
  if (!a || !b) return false;
  return a.toLowerCase().trim() === b.toLowerCase().trim();
}

const STALE_DNI_MINISTRANTOW = {
  "Maks Erich": 2,           // Wtorek (zaktualizowany)
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

const PUNKTY_PAZDZIERNIK_KOMORKI = {
  "Jan Radliński": { 1: 5, 4: 3 },
  "Rafał Danielczok": { 1: 5, 3: 1 },
  "Bartosz Rozik": { 1: 5, 4: 0 },
  "Marcel Mazurkiewicz": { 1: -5, 4: -5 },
  "Jakub Brytner": { 1: 2, 4: 3 },
  "Franek Kik": { 1: 2, 4: 3 },
  "Maciej Erich": { 2: 7, 3: 9 },
  "Ksawery Skrzypek": { 3: 3 },
  "Emil Czech": { 2: 7, 4: 3 },
  "Mateusz Pierścieński": { 2: -5, 4: 3 },
  "Maks Erich": { 4: 0 },
  "Wiktor Kowalski": { 4: -4 },
  "Michał Kupiec": { 4: 3 },
  "Paweł Głaz": { 4: -5 },
  "Mikołaj Erich": { 4: 3 },
  "Michał Danielczok": { 4: 3 }
};

const MINUSY_PAZDZIERNIK = {
  "Marcel Mazurkiewicz": [
    { dzien: 1, punkty: -5 },
    { dzien: 4, punkty: -5 }
  ],
  "Mateusz Pierścieński": [
    { dzien: 2, punkty: -5 }
  ],
  "Paweł Głaz": [
    { dzien: 4, punkty: -5 }
  ],
  "Wiktor Kowalski": [
    { dzien: 4, punkty: -5 }
  ]
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

async function main() {
  console.log('Pobieram pełną bazę z Wrzesień_2026...');
  const wrz = await getDoc('Wrzesień_2026');
  if (!wrz || !wrz.rankingRok) {
    throw new Error('Nie udało się pobrać Wrzesień_2026!');
  }

  const rok = 2026;
  const miesiacIdx = 9; // Październik
  const dniWNowym = 31;

  // 1. Dni nagłówka
  const dniNaglowek = [];
  for (let d = 1; d <= dniWNowym; d++) {
    const dt = new Date(rok, miesiacIdx, d);
    const dow = dt.getDay();
    dniNaglowek.push({
      dzien: d,
      skrotDnia: SKROTY_DNI[dow],
      czySobota: dow === 6,
      czyNiedziela: dow === 0
    });
  }

  // 2. Rotowane godziny grup
  const rotowaneGodziny = {
    "I GRUPA (CZERWONA)": "11:30",
    "II GRUPA (POMARAŃCZOWA)": "17:00",
    "III GRUPA (ZIELONA)": "08:30",
    "IV GRUPA (ŻÓŁTA)": "10:00"
  };

  // 3. Wiersze ministrantów
  const wiersze = [];
  let lp = 1;
  const pazPunkty = {};
  const pazMinusy = {}; // nazwisko -> array of { dzien, punkty }

  for (const m of MINISTRANCI_CONFIG) {
    const stalyDzien = STALE_DNI_MINISTRANTOW[m.nazwisko] !== undefined ? STALE_DNI_MINISTRANTOW[m.nazwisko] : -1;
    const punktyOkt = PUNKTY_PAZDZIERNIK_KOMORKI[m.nazwisko] || {};

    const komorki = [];
    let sumaOkt = 0;
    const mins = [];

    for (let d = 1; d <= dniWNowym; d++) {
      const dt = new Date(rok, miesiacIdx, d);
      const dow = dt.getDay();
      const maDyzur = (dow === 0 || (dow >= 1 && dow <= 5 && dow === stalyDzien));
      const val = (punktyOkt[d] !== undefined) ? punktyOkt[d] : null;

      if (typeof val === 'number') {
        sumaOkt += val;
        if (val < 0) {
          mins.push({ dzien: d, punkty: val });
        }
      }

      komorki.push({
        dzien: d,
        maDyzur: maDyzur,
        wartosc: val,
        bg: ""
      });
    }

    pazPunkty[m.nazwisko] = sumaOkt;
    if (MINUSY_PAZDZIERNIK[m.nazwisko]) {
      pazMinusy[m.nazwisko] = MINUSY_PAZDZIERNIK[m.nazwisko];
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

  // 4. Ranking Miesiąca (Październik)
  const rankingMiesiac = wiersze.map(w => ({
    nazwisko: w.nazwisko,
    normName: w.nazwisko.toLowerCase().trim(),
    punkty: pazPunkty[w.nazwisko] || 0,
    suma: pazPunkty[w.nazwisko] || 0,
    grupa: w.grupa,
    pozycja: 1,
    miejsce: 1
  })).sort((a, b) => {
    if (b.punkty !== a.punkty) return b.punkty - a.punkty;
    return a.nazwisko.localeCompare(b.nazwisko, 'pl');
  });

  let pozM = 1;
  rankingMiesiac.forEach((r, idx) => {
    if (idx > 0 && r.punkty < rankingMiesiac[idx - 1].punkty) pozM = idx + 1;
    r.pozycja = pozM;
    r.miejsce = pozM;
  });

  // 5. Ranking Całego Roku (pełna historia od Stycznia!)
  const prevRok = wrz.rankingRok || [];
  const rankingRok = wiersze.map(w => {
    const prevItem = prevRok.find(p => czyTenSam(p.nazwisko, w.nazwisko));
    const mOctPts = pazPunkty[w.nazwisko] || 0;
    const prevPmList = (prevItem && prevItem.punktyPoMiesiacach) ? JSON.parse(JSON.stringify(prevItem.punktyPoMiesiacach)) : [];
    
    let sumPoprzednie = 0;
    prevPmList.forEach(pm => {
      if (pm.miesiac !== 'Październik' && pm.miesiacIdx !== 9) {
        sumPoprzednie += (pm.punkty || 0);
      }
    });

    const nowyPmList = prevPmList.filter(pm => pm.miesiac !== 'Październik' && pm.miesiacIdx !== 9);
    nowyPmList.push({
      miesiac: 'Październik',
      miesiacIdx: 9,
      rok: 2026,
      punkty: mOctPts
    });

    const totalPunkty = Math.round((sumPoprzednie + mOctPts) * 10) / 10;
    return {
      nazwisko: w.nazwisko,
      normName: w.nazwisko.toLowerCase().trim(),
      punkty: totalPunkty,
      suma: totalPunkty,
      grupa: w.grupa,
      punktyPoMiesiacach: nowyPmList
    };
  }).sort((a, b) => {
    if (b.punkty !== a.punkty) return b.punkty - a.punkty;
    return a.nazwisko.localeCompare(b.nazwisko, 'pl');
  });

  let pozR = 1;
  rankingRok.forEach((r, idx) => {
    if (idx > 0 && r.punkty < rankingRok[idx - 1].punkty) pozR = idx + 1;
    r.pozycja = pozR;
    r.miejsce = pozR;
  });

  // 6. Ranking Minusów Miesiąca (Październik)
  const rankingMinusyMiesiac = [];
  wiersze.forEach(w => {
    const mins = pazMinusy[w.nazwisko] || [];
    if (mins.length > 0) {
      let sumMins = 0;
      const szcze = mins.map(om => {
        sumMins += om.punkty;
        const dt = new Date(rok, miesiacIdx, om.dzien);
        return {
          dzien: om.dzien,
          miesiac: 'Październik',
          miesiacGen: 'października',
          miesiacIdx: 9,
          rok: 2026,
          dzienTygodnia: DNI_NAZWY_MINUS[dt.getDay()],
          punkty: om.punkty
        };
      });
      rankingMinusyMiesiac.push({
        nazwisko: w.nazwisko,
        normName: w.nazwisko.toLowerCase().trim(),
        minusy: sumMins,
        szczegolyMinusow: szcze,
        grupa: w.grupa,
        pozycja: 1
      });
    }
  });

  rankingMinusyMiesiac.sort((a, b) => a.minusy - b.minusy);
  let pozMM = 1;
  rankingMinusyMiesiac.forEach((m, idx) => {
    if (idx > 0 && m.minusy > rankingMinusyMiesiac[idx - 1].minusy) pozMM = idx + 1;
    m.pozycja = pozMM;
  });

  // 7. Ranking Minusów Roku (pełna historia od Stycznia!)
  const prevMinusyRok = wrz.rankingMinusyRok || [];
  const rankingMinusyRok = wiersze.map(w => {
    const prevMItem = prevMinusyRok.find(p => czyTenSam(p.nazwisko, w.nazwisko));
    const prevSzczegoly = (prevMItem && prevMItem.szczegolyMinusow) ? JSON.parse(JSON.stringify(prevMItem.szczegolyMinusow)) : [];
    
    const filteredSzczegoly = prevSzczegoly.filter(s => s.miesiac !== 'Październik' && s.miesiacIdx !== 9);
    
    const octMins = pazMinusy[w.nazwisko] || [];
    octMins.forEach(om => {
      const dt = new Date(rok, miesiacIdx, om.dzien);
      filteredSzczegoly.push({
        dzien: om.dzien,
        miesiac: 'Październik',
        miesiacGen: 'października',
        miesiacIdx: 9,
        rok: 2026,
        dzienTygodnia: DNI_NAZWY_MINUS[dt.getDay()],
        punkty: om.punkty
      });
    });

    let totalMinusy = 0;
    filteredSzczegoly.forEach(s => totalMinusy += (s.punkty || 0));

    return {
      nazwisko: w.nazwisko,
      normName: w.nazwisko.toLowerCase().trim(),
      minusy: totalMinusy,
      szczegolyMinusow: filteredSzczegoly,
      grupa: w.grupa
    };
  }).sort((a, b) => {
    if (a.minusy !== b.minusy) return a.minusy - b.minusy;
    return a.nazwisko.localeCompare(b.nazwisko, 'pl');
  });

  let pozMR = 1;
  rankingMinusyRok.forEach((m, idx) => {
    if (idx > 0 && m.minusy > rankingMinusyRok[idx - 1].minusy) pozMR = idx + 1;
    m.pozycja = pozMR;
  });

  // 8. Rankingi wszystkich miesięcy
  const rankingiMiesiecy = wrz.rankingiMiesiecy ? JSON.parse(JSON.stringify(wrz.rankingiMiesiecy)) : {};
  rankingiMiesiecy["Październik"] = rankingMiesiac.map(r => ({
    nazwisko: r.nazwisko,
    normName: r.nazwisko.toLowerCase().trim(),
    punkty: r.punkty,
    pozycja: r.pozycja
  }));

  // 9. Kompletny dokument Październik_2026
  const calyDokument = {
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
    rankingMinusy: rankingMinusyRok,
    rankingMinusyRok: rankingMinusyRok,
    rankingMinusyMiesiac: rankingMinusyMiesiac,
    rankingiMiesiecy: rankingiMiesiecy,
    gieldaTydzien: [],
    gieldaNiedziele: [],
    zamianyZastepstwa: [],
    wolneZastepstwa: [],
    liturgieDodatkowe: [],
    historiaWpisow: [
      {
        czas: "04.10.2026 11:47",
        dzien: "4 października",
        godzina: "11:30",
        liturgia: "Msza w niedzielę",
        nazwisko: "Maks Erich",
        punkty: 0,
        status: "USPRAWIEDLIWIONY (0 pkt)",
        typ: "DOMYSLNY",
        wpisal: "Kościelny",
        zastepuje: "-"
      },
      {
        czas: "04.10.2026 11:47",
        dzien: "4 października",
        godzina: "11:30",
        liturgia: "Msza w niedzielę",
        nazwisko: "Mateusz Pierścieński",
        punkty: 3,
        status: "OBECNY (3 pkt)",
        typ: "DOMYSLNY",
        wpisal: "Kościelny",
        zastepuje: "-"
      },
      {
        czas: "04.10.2026 11:47",
        dzien: "4 października",
        godzina: "11:30",
        liturgia: "Msza w niedzielę",
        nazwisko: "Jan Radliński",
        punkty: 3,
        status: "OBECNY (3 pkt)",
        typ: "DOMYSLNY",
        wpisal: "Kościelny",
        zastepuje: "-"
      },
      {
        czas: "04.10.2026 11:47",
        dzien: "4 października",
        godzina: "11:30",
        liturgia: "Msza w niedzielę",
        nazwisko: "Wiktor Kowalski",
        punkty: -5,
        status: "NIEOBECNY (-5 pkt)",
        typ: "DOMYSLNY",
        wpisal: "Kościelny",
        zastepuje: "-"
      },
      {
        czas: "04.10.2026 10:05",
        dzien: "4 października",
        godzina: "10:00",
        liturgia: "Msza w niedzielę",
        nazwisko: "Michał Danielczok",
        punkty: 3,
        status: "OBECNY (3 pkt)",
        typ: "DOMYSLNY",
        wpisal: "Kościelny",
        zastepuje: "-"
      },
      {
        czas: "04.10.2026 10:05",
        dzien: "4 października",
        godzina: "10:00",
        liturgia: "Msza w niedzielę",
        nazwisko: "Emil Czech",
        punkty: 3,
        status: "OBECNY (3 pkt)",
        typ: "DOMYSLNY",
        wpisal: "Kościelny",
        zastepuje: "-"
      },
      {
        czas: "04.10.2026 10:05",
        dzien: "4 października",
        godzina: "10:00",
        liturgia: "Msza w niedzielę",
        nazwisko: "Bartosz Rozik",
        punkty: 0,
        status: "USPRAWIEDLIWIONY (0 pkt)",
        typ: "DOMYSLNY",
        wpisal: "Kościelny",
        zastepuje: "-"
      },
      {
        czas: "04.10.2026 10:05",
        dzien: "4 października",
        godzina: "10:00",
        liturgia: "Msza w niedzielę",
        nazwisko: "Marcel Mazurkiewicz",
        punkty: -5,
        status: "NIEOBECNY (-5 pkt)",
        typ: "DOMYSLNY",
        wpisal: "Kościelny",
        zastepuje: "-"
      },
      {
        czas: "04.10.2026 10:05",
        dzien: "4 października",
        godzina: "10:00",
        liturgia: "Msza w niedzielę",
        nazwisko: "Wiktor Kowalski",
        punkty: 1,
        status: "OBECNY (1 pkt)",
        typ: "DODATKOWY",
        wpisal: "Kościelny",
        zastepuje: "-"
      },
      {
        czas: "04.10.2026 08:32",
        dzien: "4 października",
        godzina: "08:30",
        liturgia: "Msza w niedzielę",
        nazwisko: "Michał Kupiec",
        punkty: 3,
        status: "OBECNY (3 pkt)",
        typ: "DOMYSLNY",
        wpisal: "Kościelny",
        zastepuje: "-"
      },
      {
        czas: "04.10.2026 08:32",
        dzien: "4 października",
        godzina: "08:30",
        liturgia: "Msza w niedzielę",
        nazwisko: "Mikołaj Erich",
        punkty: 3,
        status: "OBECNY (3 pkt)",
        typ: "DOMYSLNY",
        wpisal: "Kościelny",
        zastepuje: "-"
      },
      {
        czas: "04.10.2026 08:32",
        dzien: "4 października",
        godzina: "08:30",
        liturgia: "Msza w niedzielę",
        nazwisko: "Jakub Brytner",
        punkty: 3,
        status: "OBECNY (3 pkt)",
        typ: "DOMYSLNY",
        wpisal: "Kościelny",
        zastepuje: "-"
      },
      {
        czas: "04.10.2026 08:32",
        dzien: "4 października",
        godzina: "08:30",
        liturgia: "Msza w niedzielę",
        nazwisko: "Franek Kik",
        punkty: 3,
        status: "OBECNY (3 pkt)",
        typ: "DOMYSLNY",
        wpisal: "Kościelny",
        zastepuje: "-"
      },
      {
        czas: "04.10.2026 08:32",
        dzien: "4 października",
        godzina: "08:30",
        liturgia: "Msza w niedzielę",
        nazwisko: "Paweł Głaz",
        punkty: -5,
        status: "NIEOBECNY (-5 pkt)",
        typ: "DOMYSLNY",
        wpisal: "Kościelny",
        zastepuje: "-"
      },
      {
        czas: "03.10.2026 17:45",
        dzien: "3 października",
        godzina: "17:00",
        liturgia: "Msza św. z nabożeństwem różańcowym",
        nazwisko: "Maciej Erich",
        punkty: 5,
        status: "OBECNY (Msza niedzielna + różaniec +5 pkt)",
        typ: "DOMYSLNY",
        wpisal: "Kościelny",
        zastepuje: "-"
      },
      {
        czas: "03.10.2026 17:45",
        dzien: "3 października",
        godzina: "17:00",
        liturgia: "Msza w niedzielę (sobota 17:00)",
        nazwisko: "Ksawery Skrzypek",
        punkty: 3,
        status: "OBECNY (3 pkt)",
        typ: "DOMYSLNY",
        wpisal: "Kościelny",
        zastepuje: "-"
      },
      {
        czas: "03.10.2026 17:45",
        dzien: "3 października",
        godzina: "17:00",
        liturgia: "Msza w niedzielę (sobota 17:00)",
        nazwisko: "Rafał Danielczok",
        punkty: 1,
        status: "OBECNY (1 pkt)",
        typ: "DODATKOWY",
        wpisal: "Kościelny",
        zastepuje: "-"
      },
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
      },
      {
        czas: "01.10.2026 17:45",
        dzien: "1 października",
        godzina: "17:00",
        liturgia: "Msza szkolna z różańcem",
        nazwisko: "Jan Radliński",
        punkty: 5,
        status: "OBECNY (5 pkt)",
        typ: "REGULARNY",
        wpisal: "Kościelny",
        zastepuje: "-"
      },
      {
        czas: "01.10.2026 17:45",
        dzien: "1 października",
        godzina: "17:00",
        liturgia: "Msza szkolna z różańcem",
        nazwisko: "Rafał Danielczok",
        punkty: 5,
        status: "OBECNY (5 pkt)",
        typ: "REGULARNY",
        wpisal: "Kościelny",
        zastepuje: "-"
      },
      {
        czas: "01.10.2026 17:45",
        dzien: "1 października",
        godzina: "17:00",
        liturgia: "Msza szkolna z różańcem",
        nazwisko: "Bartosz Rozik",
        punkty: 5,
        status: "OBECNY (5 pkt)",
        typ: "REGULARNY",
        wpisal: "Kościelny",
        zastepuje: "-"
      },
      {
        czas: "01.10.2026 17:45",
        dzien: "1 października",
        godzina: "17:00",
        liturgia: "Msza szkolna z różańcem",
        nazwisko: "Marcel Mazurkiewicz",
        punkty: -5,
        status: "NIEOBECNY (-5 pkt)",
        typ: "REGULARNY",
        wpisal: "Kościelny",
        zastepuje: "-"
      },
      {
        czas: "01.10.2026 17:45",
        dzien: "1 października",
        godzina: "17:00",
        liturgia: "Nabożeństwo różańcowe",
        nazwisko: "Jakub Brytner",
        punkty: 2,
        status: "OBECNY (2 pkt)",
        typ: "DODATKOWY",
        wpisal: "Kościelny",
        zastepuje: "-"
      },
      {
        czas: "01.10.2026 17:45",
        dzien: "1 października",
        godzina: "17:00",
        liturgia: "Nabożeństwo różańcowe",
        nazwisko: "Franek Kik",
        punkty: 2,
        status: "OBECNY (2 pkt)",
        typ: "DODATKOWY",
        wpisal: "Kościelny",
        zastepuje: "-"
      }
    ],
    zaktualizowano: new Date().toISOString()
  };

  console.log('Zapisuję kompletny stan do Październik_2026 w Firestore...');
  await zapiszDokument('stan_grafiku', 'Październik_2026', calyDokument);
  console.log('✅ ZAPIS SUKCES! Weryfikacja:');
  console.log('- Wierszy:', wiersze.length);
  console.log('- Maciej Erich komórki:', wiersze.find(w => w.nazwisko === 'Maciej Erich').komorki.filter(k => k.maDyzur).map(k => k.dzien));
  console.log('- Maciej Erich punkty roczne:', rankingRok.find(r => r.nazwisko === 'Maciej Erich').punkty, 'pkt');
  console.log('- Marcel Mazurkiewicz minusy roczne:', rankingMinusyRok.find(m => m.nazwisko === 'Marcel Mazurkiewicz').minusy, 'pkt');
  console.log('- Liczba w minusach rocznych:', rankingMinusyRok.length);
}

main().catch(console.error);
