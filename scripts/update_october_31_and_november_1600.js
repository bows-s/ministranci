const https = require('https');
const API_KEY = 'AIzaSyAsgkKWXr-L3fDHQODxioVssvIGL9SQePk';
const PROJECT_ID = 'makole-85f32';

function fromFirestoreValue(val) {
  if (!val) return null;
  if ('nullValue' in val) return null;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return parseFloat(val.doubleValue);
  if ('stringValue' in val) return val.stringValue;
  if ('timestampValue' in val) return val.timestampValue;
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
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const k in val) {
      if (val[k] !== undefined) fields[k] = toFirestoreValue(val[k]);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fetchDoc(coll, id) {
  return new Promise((resolve, reject) => {
    https.get('https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/' + coll + '/' + encodeURIComponent(id) + '?key=' + API_KEY, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function patchDoc(coll, id, fields, updateMask) {
  return new Promise((resolve, reject) => {
    const maskParams = (updateMask || Object.keys(fields)).map(f => 'updateMask.fieldPaths=' + encodeURIComponent(f)).join('&');
    const url = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/' + coll + '/' + encodeURIComponent(id) + '?' + maskParams + '&key=' + API_KEY;
    const body = JSON.stringify({ fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, toFirestoreValue(v)])) });

    const req = https.request(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function run() {
  console.log('=== 1. Aktualizacja 31 października (Sobota 17:00) ===');
  const octDocs = ['Pazdziernik_2026', 'Październik_2026'];
  for (const docKey of octDocs) {
    const raw = await fetchDoc('stan_grafiku', docKey);
    if (raw.error) {
      console.log(`Pominięto ${docKey} (brak)`);
      continue;
    }
    const wiersze = fromFirestoreValue(raw.fields.wiersze);
    if (!wiersze) continue;

    let modified = 0;
    wiersze.forEach(w => {
      if (!w.komorki || !w.komorki[30]) return; // kolumna 30 = dzień 31
      const cell = w.komorki[30];
      const gr = (w.grupa || '').toUpperCase();

      if (gr.includes('CZERWON') || gr.includes(' I ')) {
        // I Grupa (Czerwona) przejmuje dyżur w sobotę 31.10 (wigilia 1 listopada)
        cell.maDyzur = true;
        cell.dzien = 31;
        modified++;
        console.log(`[${docKey}] Przypisano dyżur 31.10 dla: ${w.nazwisko} (${w.grupa})`);
      } else if (gr.includes('POMARAŃCZ') || gr.includes('POMARANCZ') || gr.includes(' II ')) {
        // II Grupa (Pomarańczowa) zwolniona z 31.10 (będzie służyć w niedzielę 1.11 o 08:30)
        delete cell.maDyzur;
        cell.dzien = 31;
        modified++;
        console.log(`[${docKey}] Usunięto dyżur 31.10 dla: ${w.nazwisko} (${w.grupa})`);
      }
    });

    if (modified > 0) {
      await patchDoc('stan_grafiku', docKey, { wiersze: wiersze }, ['wiersze']);
      console.log(`[${docKey}] Zapisano pomyślnie zaktualizowane wiersze (${modified} zmian).`);
    }
  }

  console.log('\n=== 2. Aktualizacja 1 listopada: Msza o 16:00 (4 pkt) i wolne zastępstwa na giełdzie ===');
  const novDoc = await fetchDoc('stan_grafiku', 'Listopad_2026');
  if (novDoc && !novDoc.error) {
    const harm = fromFirestoreValue(novDoc.fields.harmonogramDni) || {};
    let wolne = fromFirestoreValue(novDoc.fields.wolneZastepstwa) || [];
    let zam = fromFirestoreValue(novDoc.fields.zamianyZastepstwa) || [];

    // 1. Zmiana punktów za mszę o 16:00 w harmonogramie z 5 na 4 pkt
    if (harm[1] && harm[1].msze) {
      harm[1].msze.forEach(m => {
        if (m.godzina === '16:00' || m.godzina === '16') {
          m.punkty = 4;
          m.nazwa = 'Msza św. popołudniowa (Wszystkich Świętych)';
          console.log('[Listopad_2026] Zaktualizowano mszę 16:00 w harmonogramie na 4 pkt');
        }
      });
    }

    // 2. Dodanie 2 wolnych miejsc na giełdzie na 16:00 (1 listopada) za 4 pkt
    const nowTs = Date.now();
    const id1 = 'wolna_11_01_1600_1';
    const id2 = 'wolna_11_01_1600_2';

    // Usuń stare jeśli istniały
    wolne = wolne.filter(z => z.id !== id1 && z.id !== id2);
    zam = zam.filter(z => z.id !== id1 && z.id !== id2);

    const nowaWolna1 = {
      id: id1,
      dzien: 1,
      godzina: '16:00',
      typ: 'Niedziela',
      opis: 'Uroczystość Wszystkich Świętych (Msza popołudniowa)',
      oddajacy: 'Parafia (Msza dodatkowa)',
      status: 'OCZEKUJE',
      punkty: 4,
      utworzono: nowTs
    };
    const nowaWolna2 = {
      id: id2,
      dzien: 1,
      godzina: '16:00',
      typ: 'Niedziela',
      opis: 'Uroczystość Wszystkich Świętych (Msza popołudniowa)',
      oddajacy: 'Parafia (Msza dodatkowa)',
      status: 'OCZEKUJE',
      punkty: 4,
      utworzono: nowTs
    };

    wolne.push(nowaWolna1, nowaWolna2);
    zam.push(nowaWolna1, nowaWolna2);

    await patchDoc('stan_grafiku', 'Listopad_2026', {
      harmonogramDni: harm,
      wolneZastepstwa: wolne,
      zamianyZastepstwa: zam
    }, ['harmonogramDni', 'wolneZastepstwa', 'zamianyZastepstwa']);

    console.log('[Listopad_2026] Zapisano harmonogram (16:00 -> 4 pkt) oraz dodano 2 wolne służby na giełdę!');
  }

  console.log('\n✓ Wszystkie aktualizacje bazy zakończone pomyślnie!');
}

run().catch(console.error);
