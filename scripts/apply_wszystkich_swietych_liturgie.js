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
  console.log('=== Konfiguracja liturgii na 1 listopada (Wszystkich Świętych) w Firestore ===');

  const nowaLitCmentarz = {
    id: 'lit_2026_11_01_cmentarz',
    dzien: 1,
    miesiacIdx: 10,
    rok: 2026,
    godzina: '15:00',
    rodzaj: 'Nabożeństwo na cmentarzu i procesja',
    opis: 'Procesja za zmarłych na cmentarzu (krzyż, nagłośnienie, kadzielnica, znicze)',
    punkty: 4,
    maxOsob: 8,
    dataTekst: '1 listopada (niedziela)',
    zgloszeni: []
  };

  const nowaLitMsza1600 = {
    id: 'lit_2026_11_01_msza1600',
    dzien: 1,
    miesiacIdx: 10,
    rok: 2026,
    godzina: '16:00',
    rodzaj: 'Msza św. popołudniowa (Wszystkich Świętych)',
    opis: 'Msza w kościele po zakończeniu nabożeństwa na cmentarzu',
    punkty: 4,
    maxOsob: 6,
    dataTekst: '1 listopada (niedziela)',
    zgloszeni: []
  };

  // 1. Aktualizacja Listopad_2026
  const novRaw = await fetchDoc('stan_grafiku', 'Listopad_2026');
  if (novRaw && !novRaw.error) {
    let novLits = fromFirestoreValue(novRaw.fields.liturgieDodatkowe) || [];
    let harm = fromFirestoreValue(novRaw.fields.harmonogramDni) || {};
    let wolne = fromFirestoreValue(novRaw.fields.wolneZastepstwa) || [];
    let zam = fromFirestoreValue(novRaw.fields.zamianyZastepstwa) || [];

    // Dodaj lub zaktualizuj w novLits
    const idxCm = novLits.findIndex(l => l.id === 'lit_2026_11_01_cmentarz');
    if (idxCm !== -1) novLits[idxCm] = Object.assign({}, nowaLitCmentarz, { zgloszeni: novLits[idxCm].zgloszeni || [] });
    else novLits.push(nowaLitCmentarz);

    const idxMsza = novLits.findIndex(l => l.id === 'lit_2026_11_01_msza1600');
    if (idxMsza !== -1) novLits[idxMsza] = Object.assign({}, nowaLitMsza1600, { zgloszeni: novLits[idxMsza].zgloszeni || [] });
    else novLits.push(nowaLitMsza1600);

    // Skoryguj harmonogram dla 1 listopada
    harm[1] = {
      dzien: 1,
      dzienTygodnia: 'Niedziela',
      godzinyMszy: ['08:30', '10:00', '11:30', '16:00'],
      msze: [
        { godzina: '08:30', nazwa: 'Uroczystość Wszystkich Świętych', punkty: 5, typ: 'msza_swieto' },
        { godzina: '10:00', nazwa: 'Uroczystość Wszystkich Świętych', punkty: 5, typ: 'msza_swieto' },
        { godzina: '11:30', nazwa: 'Uroczystość Wszystkich Świętych', punkty: 5, typ: 'msza_swieto' },
        { godzina: '16:00', nazwa: 'Msza św. popołudniowa (Wszystkich Świętych)', punkty: 4, typ: 'msza_swieto' }
      ],
      nabozenstwa: [
        { godzina: '15:00', nazwa: 'Nabożeństwo na cmentarzu i procesja', punkty: 4, typ: 'nabozenstwo' }
      ]
    };

    // Usunięcie starych pojedynczych ofert na 16:00 z wolneZastepstwa, by nie dublowały
    wolne = wolne.filter(z => z.id !== 'wolna_11_01_1600_1' && z.id !== 'wolna_11_01_1600_2');
    zam = zam.filter(z => z.id !== 'wolna_11_01_1600_1' && z.id !== 'wolna_11_01_1600_2');

    await patchDoc('stan_grafiku', 'Listopad_2026', {
      liturgieDodatkowe: novLits,
      harmonogramDni: harm,
      wolneZastepstwa: wolne,
      zamianyZastepstwa: zam
    }, ['liturgieDodatkowe', 'harmonogramDni', 'wolneZastepstwa', 'zamianyZastepstwa']);

    console.log('[Listopad_2026] Zapisano liturgieDodatkowe, harmonogramDni i wyczyszczono wolneZastepstwa.');
  }

  // 2. Kopia do Pazdziernik_2026 (oraz Październik_2026 jeśli istnieje), aby natychmiast były widoczne przed 1 listopada!
  for (const octDocId of ['Pazdziernik_2026', 'Październik_2026']) {
    const octRaw = await fetchDoc('stan_grafiku', octDocId);
    if (!octRaw || octRaw.error) continue;

    let octLits = fromFirestoreValue(octRaw.fields.liturgieDodatkowe) || [];
    const idxCm = octLits.findIndex(l => l.id === 'lit_2026_11_01_cmentarz');
    if (idxCm !== -1) octLits[idxCm] = Object.assign({}, nowaLitCmentarz, { zgloszeni: octLits[idxCm].zgloszeni || [] });
    else octLits.push(nowaLitCmentarz);

    const idxMsza = octLits.findIndex(l => l.id === 'lit_2026_11_01_msza1600');
    if (idxMsza !== -1) octLits[idxMsza] = Object.assign({}, nowaLitMsza1600, { zgloszeni: octLits[idxMsza].zgloszeni || [] });
    else octLits.push(nowaLitMsza1600);

    await patchDoc('stan_grafiku', octDocId, {
      liturgieDodatkowe: octLits
    }, ['liturgieDodatkowe']);

    console.log(`[${octDocId}] Zapisano liturgieDodatkowe z nabożeństwem 15:00 i mszą 16:00!`);
  }

  console.log('✓ Firestore zaktualizowany pomyślnie!');
}

run().catch(console.error);
