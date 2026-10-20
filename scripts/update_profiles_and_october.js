const https = require('https');
const API_KEY = "AIzaSyAsgkKWXr-L3fDHQODxioVssvIGL9SQePk";
const PROJECT_ID = "makole-85f32";

const PROFILES = [
  // I GRUPA (CZERWONA)
  { nazwisko: "Maks Erich", grupa: "I GRUPA (CZERWONA)", stopien: "Animator", ranga: 5, maPin: true },
  { nazwisko: "Mateusz Pierścieński", grupa: "I GRUPA (CZERWONA)", stopien: "Starszy ministrant", ranga: 3, maPin: true },
  { nazwisko: "Wiktor Kowalski", grupa: "I GRUPA (CZERWONA)", stopien: "Starszy ministrant", ranga: 3, maPin: false },
  { nazwisko: "Jan Radliński", grupa: "I GRUPA (CZERWONA)", stopien: "Młodszy ministrant", ranga: 2, maPin: false },

  // II GRUPA (POMARAŃCZOWA)
  { nazwisko: "Maciej Erich", grupa: "II GRUPA (POMARAŃCZOWA)", stopien: "Animator", ranga: 5, maPin: true },
  { nazwisko: "Mikołaj Erich", grupa: "II GRUPA (POMARAŃCZOWA)", stopien: "Lektor", ranga: 4, maPin: true },
  { nazwisko: "Ksawery Skrzypek", grupa: "II GRUPA (POMARAŃCZOWA)", stopien: "Starszy ministrant", ranga: 3, maPin: true },
  { nazwisko: "Rafał Danielczok", grupa: "II GRUPA (POMARAŃCZOWA)", stopien: "Młodszy ministrant", ranga: 2, maPin: false },

  // III GRUPA (ZIELONA)
  { nazwisko: "Michał Kupiec", grupa: "III GRUPA (ZIELONA)", stopien: "Animator", ranga: 5, maPin: false },
  { nazwisko: "Paweł Głaz", grupa: "III GRUPA (ZIELONA)", stopien: "Starszy ministrant", ranga: 3, maPin: true },
  { nazwisko: "Jakub Brytner", grupa: "III GRUPA (ZIELONA)", stopien: "Młodszy ministrant", ranga: 2, maPin: true },
  { nazwisko: "Franek Kik", grupa: "III GRUPA (ZIELONA)", stopien: "Kandydat", ranga: 1, maPin: true },

  // IV GRUPA (ŻÓŁTA)
  { nazwisko: "Michał Danielczok", grupa: "IV GRUPA (ŻÓŁTA)", stopien: "Animator", ranga: 5, maPin: true },
  { nazwisko: "Emil Czech", grupa: "IV GRUPA (ŻÓŁTA)", stopien: "Lektor", ranga: 4, maPin: true },
  { nazwisko: "Bartosz Rozik", grupa: "IV GRUPA (ŻÓŁTA)", stopien: "Młodszy ministrant", ranga: 2, maPin: true },
  { nazwisko: "Marcel Mazurkiewicz", grupa: "IV GRUPA (ŻÓŁTA)", stopien: "Młodszy ministrant", ranga: 2, maPin: true }
];

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
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${encodeURIComponent(collection)}/${encodeURIComponent(docName)}?key=${API_KEY}`;
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

function patchDoc(collection, docName, updateFields) {
  return new Promise((resolve, reject) => {
    const mask = Object.keys(updateFields).map(k => 'updateMask.fieldPaths=' + encodeURIComponent(k)).join('&');
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${encodeURIComponent(collection)}/${encodeURIComponent(docName)}?${mask}&key=${API_KEY}`;
    const fields = {};
    for (const k in updateFields) {
      if (Object.prototype.hasOwnProperty.call(updateFields, k)) {
        fields[k] = toFirestoreValue(updateFields[k]);
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

function czyToSamo(a, b) {
  if (!a || !b) return false;
  return a.toLowerCase().trim() === b.toLowerCase().trim();
}

async function main() {
  console.log("=== 1. AKTUALIZACJA konfiguracja/uzytkownicy ===");
  const usersDoc = await getDoc('konfiguracja', 'uzytkownicy');
  if (!usersDoc) throw new Error("Brak konfiguracja/uzytkownicy!");

  const newUsersList = PROFILES.map(p => ({
    nazwisko: p.nazwisko,
    maPin: p.maPin,
    stopien: p.stopien,
    ranga: p.ranga,
    grupa: p.grupa
  }));
  // Dodaj Kościelnego
  newUsersList.push({
    nazwisko: "Kościelny",
    maPin: true,
    stopien: "Kościelny",
    ranga: 10,
    grupa: "Ogólna"
  });

  await patchDoc('konfiguracja', 'uzytkownicy', {
    lista: newUsersList,
    zaktualizowano: new Date().toISOString()
  });
  console.log("Zaktualizowano profile w konfiguracja/uzytkownicy!");

  console.log("=== 2. AKTUALIZACJA stan_grafiku/Październik_2026 ===");
  const paz = await getDoc('stan_grafiku', 'Październik_2026');
  if (!paz || !paz.wiersze) throw new Error("Brak Październik_2026!");

  const existingRows = paz.wiersze;
  console.log(`Liczba wierszy w Październik_2026: ${existingRows.length}`);

  // Przemapuj i posortuj wiersze wg oficjalnego profilu (PROFILES)
  const newRows = [];
  PROFILES.forEach(prof => {
    const existing = existingRows.find(r => czyToSamo(r.nazwisko, prof.nazwisko));
    if (!existing) {
      console.warn(`UWAGA: Nie znaleziono wiersza dla ${prof.nazwisko}!`);
      return;
    }

    // Jeśli Mikołaj Erich przeszedł do grupy II, aktualizujemy jego dyżury w komórkach:
    // Mikołaj Erich ma stały dzień Wtorek (2) i niedziele grupy II (17:00 w październiku: 4, 11, 18, 25)
    newRows.push({
      ...existing,
      grupa: prof.grupa,
      stopien: prof.stopien,
      stopienRanga: prof.ranga
    });
  });

  console.log("Nowa kolejność i stopnie wierszy:");
  newRows.forEach((r, idx) => {
    console.log(`${idx + 1}. [${r.grupa}] ${r.nazwisko} (${r.stopien}, ranga ${r.stopienRanga}) -> suma: ${r.suma}`);
  });

  await patchDoc('stan_grafiku', 'Październik_2026', {
    wiersze: newRows,
    zaktualizowano: new Date().toISOString()
  });
  console.log("Zaktualizowano stan_grafiku/Październik_2026 z prawidłowymi stopniami, grupami i kolejnością!");
}

main().catch(err => {
  console.error("BŁĄD:", err);
  process.exit(1);
});
