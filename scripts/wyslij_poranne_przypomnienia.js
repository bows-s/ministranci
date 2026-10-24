const https = require('https');
const { sendTelegramMessage } = require('./notify_telegram');

const API_KEY = 'AIzaSyAsgkKWXr-L3fDHQODxioVssvIGL9SQePk';
const PROJECT_ID = 'makole-85f32';
const GAS_URL = 'https://script.google.com/macros/s/AKfycbw4inpFTSAMv22GQpz_AYOytBx04CcEuCgwhHCAU0qwVFZ5H2BdjyA1PrnhxtP6KtCazg/exec';

function callGas(funkcja, args) {
  return new Promise((resolve, reject) => {
    const url = GAS_URL + '?payload=' + encodeURIComponent(JSON.stringify({ funkcja, args: args || [] }));
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, (res2) => {
          let data = '';
          res2.on('data', chunk => data += chunk);
          res2.on('end', () => {
            try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
          });
        });
      } else {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
        });
      }
    }).on('error', reject);
  });
}

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

function cleanTime(t) {
  if (!t) return '';
  t = String(t).trim();
  if (/^\d:\d\d/.test(t)) t = '0' + t;
  return t.substring(0, 5);
}

function rozpoznajNumerGrupy(nazwa) {
  if (!nazwa) return 0;
  const s = String(nazwa).toLowerCase();
  if (s.indexOf('czerwon') !== -1) return 1;
  if (s.indexOf('pomarańcz') !== -1 || s.indexOf('pomarancz') !== -1) return 2;
  if (s.indexOf('zielon') !== -1) return 3;
  if (s.indexOf('żółt') !== -1 || s.indexOf('zolt') !== -1) return 4;
  if (/(?:^|[\s(\[])(?:iv|4)(?:[\s)\]]|$)/i.test(s)) return 4;
  if (/(?:^|[\s(\[])(?:iii|3)(?:[\s)\]]|$)/i.test(s)) return 3;
  if (/(?:^|[\s(\[])(?:ii|2)(?:[\s)\]]|$)/i.test(s)) return 2;
  if (/(?:^|[\s(\[])(?:i|1)(?:[\s)\]]|$)/i.test(s)) return 1;
  return 0;
}

function dopasujGrupe(n1, n2) {
  if (!n1 || !n2) return false;
  const g1 = rozpoznajNumerGrupy(n1);
  const g2 = rozpoznajNumerGrupy(n2);
  if (g1 > 0 && g2 > 0) return g1 === g2;
  return String(n1).toLowerCase().trim() === String(n2).toLowerCase().trim();
}

function czyToTenSamMinistrant(n1, n2) {
  if (!n1 || !n2) return false;
  const norm1 = String(n1).toLowerCase().trim().replace(/ł/g, 'l').replace(/ą/g, 'a').replace(/ę/g, 'e').replace(/ś/g, 's').replace(/ć/g, 'c').replace(/ż/g, 'z').replace(/ź/g, 'z').replace(/ń/g, 'n').replace(/ó/g, 'o');
  const norm2 = String(n2).toLowerCase().trim().replace(/ł/g, 'l').replace(/ą/g, 'a').replace(/ę/g, 'e').replace(/ś/g, 's').replace(/ć/g, 'c').replace(/ż/g, 'z').replace(/ź/g, 'z').replace(/ń/g, 'n').replace(/ó/g, 'o');
  if (norm1 === norm2) return true;
  if (norm1.length >= 4 && norm2.indexOf(norm1) !== -1) return true;
  if (norm2.length >= 4 && norm1.indexOf(norm2) !== -1) return true;
  return false;
}

function wyznaczRotowaneGodzinyGrup(rok, miesiacIdx) {
  const godzinyKolejnosc = ['08:30', '10:00', '11:30', '17:00'];
  const r = (rok !== undefined && rok !== null) ? parseInt(rok, 10) : (new Date()).getFullYear();
  const m = (miesiacIdx !== undefined && miesiacIdx !== null) ? parseInt(miesiacIdx, 10) : (new Date()).getMonth();
  const diffMiesiace = (r - 2026) * 12 + (m - 8);
  const shift = ((diffMiesiace % 4) + 4) % 4;
  return {
    'I GRUPA (CZERWONA)': godzinyKolejnosc[(1 + shift) % 4],
    'II GRUPA (POMARAŃCZOWA)': godzinyKolejnosc[(2 + shift) % 4],
    'III GRUPA (ZIELONA)': godzinyKolejnosc[(3 + shift) % 4],
    'IV GRUPA (ŻÓŁTA)': godzinyKolejnosc[(0 + shift) % 4]
  };
}

async function pobierzStanGrafikuFirestore(date) {
  const now = date || new Date();
  const polishMonths = ['Styczen', 'Luty', 'Marzec', 'Kwiecien', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpien', 'Wrzesien', 'Pazdziernik', 'Listopad', 'Grudzien'];
  const docName = polishMonths[now.getMonth()] + '_' + now.getFullYear();

  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/stan_grafiku/${docName}?key=${API_KEY}`;
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (!json.fields) return resolve(null);
          const doc = {};
          for (const k in json.fields) doc[k] = fromFirestoreValue(json.fields[k]);
          resolve(doc);
        } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function wyznaczDyzuryWDniu(docData, date) {
  const now = date || new Date();
  const dayNum = now.getDate();
  const dt = new Date(docData.rok || now.getFullYear(), docData.miesiacIdx !== undefined ? docData.miesiacIdx : now.getMonth(), dayNum);
  const dow = dt.getDay();

  let grupyGodziny = {};
  if (docData.godzinyGrup && typeof docData.godzinyGrup === 'object') {
    for (const gk in docData.godzinyGrup) {
      grupyGodziny[gk.trim()] = cleanTime(docData.godzinyGrup[gk]);
    }
  }
  if (Object.keys(grupyGodziny).length === 0) {
    grupyGodziny = wyznaczRotowaneGodzinyGrup(now.getFullYear(), now.getMonth());
  }

  const zamianyNiedzieleList = [];
  (docData.zamianyNiedziele || []).forEach(zn => {
    if (!zn || zn.status === 'ANULOWANA') return;
    if (zn.typ === 'RECZNA') {
      zamianyNiedzieleList.push({
        typ: 'RECZNA',
        dzien: parseInt(zn.dzien, 10),
        ministrant: zn.ministrant,
        godzina: cleanTime(zn.godzina)
      });
    } else if (zn.status === 'ZAAKCEPTOWANA' || zn.status === 'PRZEJETE') {
      zamianyNiedzieleList.push({
        typ: 'WYMIANA',
        dzien: parseInt(zn.dzien, 10),
        wystawiajacy: zn.wystawiajacy,
        godzOddana: cleanTime(zn.godzinaOddawana || zn.godzOddana || zn.godzinaWystawiajacego),
        przejmujacy: zn.przejmujacy,
        godzWzieta: cleanTime(zn.godzinaPrzejmujacego || zn.godzWzieta)
      });
    }
  });

  const dyzury = [];
  (docData.wiersze || []).forEach(w => {
    const rawNazw = (w.nazwisko || '').trim();
    if (!rawNazw) return;
    const uValDzis = w.komorki && w.komorki[dayNum - 1] ? w.komorki[dayNum - 1].wartosc : null;
    if (uValDzis === 0 || uValDzis === '0') return;

    if (dow >= 1 && dow <= 5) {
      const maDyzur = w.komorki && w.komorki[dayNum - 1] && w.komorki[dayNum - 1].maDyzur;
      if (maDyzur) {
        let godz = '18:00';
        if (dow === 4) godz = '17:00';
        if (dow === 3 && now.getMonth() !== 9) godz = '08:00';
        dyzury.push({ nazwisko: rawNazw, godzina: godz });
      }
    } else {
      const weekendSunDay = (dow === 6 ? dayNum + 1 : dayNum);
      let bazaGodz = '';
      for (const gk in grupyGodziny) {
        if (dopasujGrupe(gk, w.grupa)) {
          bazaGodz = grupyGodziny[gk];
          break;
        }
      }
      let effGodz = bazaGodz;
      for (let ri = zamianyNiedzieleList.length - 1; ri >= 0; ri--) {
        const zr = zamianyNiedzieleList[ri];
        if (zr.typ === 'RECZNA' && (zr.dzien === weekendSunDay || zr.dzien === dayNum) && czyToTenSamMinistrant(zr.ministrant, rawNazw)) {
          effGodz = zr.godzina;
          break;
        }
      }
      for (let zi = 0; zi < zamianyNiedzieleList.length; zi++) {
        const zn = zamianyNiedzieleList[zi];
        if (zn.typ !== 'RECZNA' && (zn.dzien === weekendSunDay || zn.dzien === dayNum)) {
          if (czyToTenSamMinistrant(zn.wystawiajacy, rawNazw)) { effGodz = zn.godzWzieta; break; }
          else if (czyToTenSamMinistrant(zn.przejmujacy, rawNazw)) { effGodz = zn.godzOddana; break; }
        }
      }

      if (dow === 6 && effGodz === '17:00') {
        dyzury.push({ nazwisko: rawNazw, godzina: '17:00' });
      } else if (dow === 0 && effGodz && effGodz !== '17:00') {
        dyzury.push({ nazwisko: rawNazw, godzina: effGodz });
      }
    }
  });

  return dyzury;
}

async function main() {
  console.log('[Przypomnienia] Uruchamianie porannych przypomnień o służbie...');
  try {
    let res = null;
    try {
      res = await callGas('testujPorannePrzypomnienia', []);
      console.log('[Przypomnienia] Odpowiedź z Apps Script:', JSON.stringify(res, null, 2));
    } catch(errGas) {
      console.warn('[Przypomnienia] Błąd wywołania GAS testujPorannePrzypomnienia:', errGas.message);
    }

    if (res && res.sukces && res.odbiorcy && res.odbiorcy.length > 0) {
      const odbiorcy = res.odbiorcy.join(', ');
      const msg = `🔔 <b>Poranne przypomnienia PUSH wysłane!</b>\n\n` +
        `📅 <b>Wysłano do:</b> ${odbiorcy}\n` +
        `📊 <b>Liczba urządzeń:</b> ${res.liczbaWyslanych || res.odbiorcy.length}`;
      console.log('[Przypomnienia] Sukces (z Apps Script):', msg);
      await sendTelegramMessage(msg);
      return;
    }

    // Inteligentny fallback: jeśli Apps Script zwrócił pustą listę lub błąd, weryfikujemy stan z Firestore
    console.log('[Przypomnienia] Aktywacja precyzyjnego sprawdzania grafiku z Firestore...');
    const now = new Date();
    const docData = await pobierzStanGrafikuFirestore(now);

    if (!docData) {
      console.warn('[Przypomnienia] Brak dokumentu w Firestore dla bieżącego miesiąca.');
      await sendTelegramMessage('⚠️ <b>Przypomnienia:</b> Brak danych grafiku w Firestore dla bieżącego miesiąca.');
      return;
    }

    const dyzuryDzis = wyznaczDyzuryWDniu(docData, now);
    console.log(`[Przypomnienia] Służbę na dziś (${now.getDate()}.${now.getMonth()+1}) mają:`, dyzuryDzis);

    if (dyzuryDzis.length === 0) {
      const msg = `ℹ️ <b>Poranne przypomnienia PUSH:</b>\n\nDzisiaj (${now.getDate()}.${now.getMonth()+1}) nikt nie ma zaplanowanej służby w grafiku.`;
      console.log(msg);
      await sendTelegramMessage(msg);
      return;
    }

    // Pobieramy zarejestrowane tokeny z Google Sheets przez GAS
    const tokensRes = await callGas('pobierzZarejestrowaneTokeny', []);
    const regRows = (tokensRes && tokensRes.rows) ? tokensRes.rows : [];

    const wyslaneDo = [];
    let liczbaUrzadzen = 0;

    for (const d of dyzuryDzis) {
      const matchingTokens = regRows.filter(r => czyToTenSamMinistrant(r[0], d.nazwisko) && r[1]);
      if (matchingTokens.length > 0) {
        console.log(`[Przypomnienia] Wysyłanie powiadomienia do: ${d.nazwisko} (${d.godzina}), urządzenia: ${matchingTokens.length}`);
        const simRes = await callGas('symulujPorannePrzypomnienie', [d.nazwisko]);
        console.log(`[Przypomnienia] Wynik wysyłki dla ${d.nazwisko}:`, simRes);
        wyslaneDo.push(`${d.nazwisko} (${d.godzina})`);
        liczbaUrzadzen += matchingTokens.length;
      } else {
        console.log(`[Przypomnienia] ${d.nazwisko} ma dyżur (${d.godzina}), ale nie ma jeszcze zarejestrowanego tokenu.`);
      }
    }

    if (wyslaneDo.length > 0) {
      const msg = `🔔 <b>Poranne przypomnienia PUSH wysłane!</b>\n\n` +
        `📅 <b>Wysłano do:</b> ${wyslaneDo.join(', ')}\n` +
        `📊 <b>Liczba urządzeń:</b> ${liczbaUrzadzen}`;
      console.log('[Przypomnienia] Sukces wysyłki:', msg);
      await sendTelegramMessage(msg);
    } else {
      const wszyscy = dyzuryDzis.map(d => `${d.nazwisko} (${d.godzina})`).join(', ');
      const msg = `ℹ️ <b>Poranne przypomnienia PUSH:</b>\n\n` +
        `• Dzisiejszą służbę mają: ${wszyscy}\n` +
        `• Nikt z wyznaczonych ministrantów nie ma jeszcze zarejestrowanego telefonu w aplikacji.`;
      console.log(msg);
      await sendTelegramMessage(msg);
    }
  } catch (e) {
    console.error('[Przypomnienia] Błąd krytyczny:', e);
    await sendTelegramMessage(`❌ <b>Błąd wysyłki porannych powiadomień:</b> ${e.message}`);
    process.exit(1);
  }
}

main();
