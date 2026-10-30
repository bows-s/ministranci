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
  console.log('=== Czyszczenie zbędnych dopisków i limitów w Firestore ===');

  const cleanLitCmentarz = {
    id: 'lit_2026_11_01_cmentarz',
    dzien: 1,
    miesiacIdx: 10,
    rok: 2026,
    godzina: '15:00',
    rodzaj: 'Nabożeństwo na cmentarzu',
    punkty: 4,
    dataTekst: '1 listopada (niedziela)',
    zgloszeni: []
  };

  const cleanLitMsza1600 = {
    id: 'lit_2026_11_01_msza1600',
    dzien: 1,
    miesiacIdx: 10,
    rok: 2026,
    godzina: '16:00',
    rodzaj: 'Msza św.',
    punkty: 4,
    dataTekst: '1 listopada (niedziela)',
    zgloszeni: []
  };

  // 1. Listopad_2026
  const novRaw = await fetchDoc('stan_grafiku', 'Listopad_2026');
  if (novRaw && !novRaw.error) {
    let novLits = fromFirestoreValue(novRaw.fields.liturgieDodatkowe) || [];
    let harm = fromFirestoreValue(novRaw.fields.harmonogramDni) || {};

    const idxCm = novLits.findIndex(l => l.id === 'lit_2026_11_01_cmentarz');
    if (idxCm !== -1) {
      novLits[idxCm] = Object.assign({}, cleanLitCmentarz, { zgloszeni: novLits[idxCm].zgloszeni || [] });
    } else {
      novLits.push(cleanLitCmentarz);
    }

    const idxMsza = novLits.findIndex(l => l.id === 'lit_2026_11_01_msza1600');
    if (idxMsza !== -1) {
      novLits[idxMsza] = Object.assign({}, cleanLitMsza1600, { zgloszeni: novLits[idxMsza].zgloszeni || [] });
    } else {
      novLits.push(cleanLitMsza1600);
    }

    harm[1] = {
      dzien: 1,
      dzienTygodnia: 'Niedziela',
      godzinyMszy: ['08:30', '10:00', '11:30', '16:00'],
      msze: [
        { godzina: '08:30', nazwa: 'Uroczystość Wszystkich Świętych', punkty: 5, typ: 'msza_swieto' },
        { godzina: '10:00', nazwa: 'Uroczystość Wszystkich Świętych', punkty: 5, typ: 'msza_swieto' },
        { godzina: '11:30', nazwa: 'Uroczystość Wszystkich Świętych', punkty: 5, typ: 'msza_swieto' },
        { godzina: '16:00', nazwa: 'Msza św.', punkty: 4, typ: 'msza_swieto' }
      ],
      nabozenstwa: [
        { godzina: '15:00', nazwa: 'Nabożeństwo na cmentarzu', punkty: 4, typ: 'nabozenstwo' }
      ]
    };

    await patchDoc('stan_grafiku', 'Listopad_2026', {
      liturgieDodatkowe: novLits,
      harmonogramDni: harm
    }, ['liturgieDodatkowe', 'harmonogramDni']);

    console.log('[Listopad_2026] Zaktualizowano czyste liturgie i harmonogram.');
  }

  // 2. Pazdziernik_2026 & Październik_2026
  for (const docKey of ['Pazdziernik_2026', 'Październik_2026']) {
    const octRaw = await fetchDoc('stan_grafiku', docKey);
    if (!octRaw || octRaw.error) continue;

    let octLits = fromFirestoreValue(octRaw.fields.liturgieDodatkowe) || [];
    const idxCm = octLits.findIndex(l => l.id === 'lit_2026_11_01_cmentarz');
    if (idxCm !== -1) {
      octLits[idxCm] = Object.assign({}, cleanLitCmentarz, { zgloszeni: octLits[idxCm].zgloszeni || [] });
    } else {
      octLits.push(cleanLitCmentarz);
    }

    const idxMsza = octLits.findIndex(l => l.id === 'lit_2026_11_01_msza1600');
    if (idxMsza !== -1) {
      octLits[idxMsza] = Object.assign({}, cleanLitMsza1600, { zgloszeni: octLits[idxMsza].zgloszeni || [] });
    } else {
      octLits.push(cleanLitMsza1600);
    }

    await patchDoc('stan_grafiku', docKey, {
      liturgieDodatkowe: octLits
    }, ['liturgieDodatkowe']);

    console.log(`[${docKey}] Zaktualizowano czyste liturgie.`);
  }

  console.log('✓ Firestore wyczyszczony!');
}

run().catch(console.error);
