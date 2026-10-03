const fs = require('fs');
const https = require('https');

let code = fs.readFileSync('Zamiany.js', 'utf8');

// 1. In obsluzZapytanieAPI, add handling for wieczorne przypomnienia and utworzArkuszPazdziernik
const targetApiHook = '} else if (funkcja === "testujPorannePrzypomnienia") {';
const replaceApiHook = `} else if (funkcja === "testujWieczornePrzypomnienia") {
      var customDate = (args && args[0]) ? new Date(args[0]) : null;
      wynik = wyslijWieczornePrzypomnieniaONajblizszejSluzbie(customDate);
    } else if (funkcja === "utworzArkuszPazdziernik") {
      var ssOct = pobierzAktywnyArkusz();
      var wOct = ssOct.getSheetByName("Wrzesień_2026") || ssOct.getSheetByName("Wrzesien_2026");
      var octExists = ssOct.getSheetByName("Październik_2026") || ssOct.getSheetByName("Pazdziernik_2026");
      if (!octExists && wOct) {
        var nSh = wOct.copyTo(ssOct).setName("Październik_2026");
        wynik = { sukces: true, wiadomosc: "Utworzono arkusz Październik_2026 w skoroszycie!" };
      } else {
        wynik = { sukces: true, wiadomosc: octExists ? "Arkusz już istnieje" : "Brak arkusza wzorcowego Wrzesień_2026" };
      }
    } else if (funkcja === "testujPorannePrzypomnienia") {`;

if (code.includes(targetApiHook) && !code.includes('testujWieczornePrzypomnienia')) {
  code = code.replace(targetApiHook, replaceApiHook);
  console.log('Patched API hooks in obsluzZapytanieAPI');
}

// 2. pobierzBiezacyArkuszMiesiaca
const targetPobierzBiezacy = `function pobierzBiezacyArkuszMiesiaca(ss) {
  var now = new Date();
  var polishMonths = [
    "Stycze", "Luty", "Marzec", "Kwiecie", "Maj", "Czerwiec",
    "Lipiec", "Sierpie", "Wrzesie", "Padziernik", "Listopad", "Grudzie"
  ];
  var mName = polishMonths[now.getMonth()] + "_" + now.getFullYear();
  var sheet = ss.getSheetByName(mName);
  if (!sheet) {
    var alt = ["Styczen", "Luty", "Marzec", "Kwiecien", "Maj", "Czerwiec", "Lipiec", "Sierpien", "Wrzesien", "Pazdziernik", "Listopad", "Grudzien"];
    sheet = ss.getSheetByName(alt[now.getMonth()] + "_" + now.getFullYear());
  }
  return sheet;
}`;

// Note that the existing code might have various encodings, so let's match with regex
const biezacyRegex = /function pobierzBiezacyArkuszMiesiaca\(ss\)\s*\{[\s\S]*?return sheet;\s*\}/;
const newBiezacy = `function pobierzBiezacyArkuszMiesiaca(ss) {
  var now = new Date();
  var polishMonths = [
    "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
    "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
  ];
  var alt = ["Styczen", "Luty", "Marzec", "Kwiecien", "Maj", "Czerwiec", "Lipiec", "Sierpien", "Wrzesien", "Pazdziernik", "Listopad", "Grudzien"];
  var mName = polishMonths[now.getMonth()] + "_" + now.getFullYear();
  var sheet = ss.getSheetByName(mName);
  if (!sheet) {
    sheet = ss.getSheetByName(alt[now.getMonth()] + "_" + now.getFullYear());
  }
  if (!sheet) {
    var all = ss.getSheets();
    for (var i = 0; i < all.length; i++) {
      var sName = all[i].getName();
      if (sName.toLowerCase().indexOf("pa") === 0 && sName.indexOf(String(now.getFullYear())) !== -1) {
        return all[i];
      }
    }
  }
  return sheet;
}`;

if (biezacyRegex.test(code)) {
  code = code.replace(biezacyRegex, newBiezacy);
  console.log('Patched pobierzBiezacyArkuszMiesiaca');
}

// 3. przygotujDaneHarmonogramu - Firestore fallback
const targetHarmonogramStart = `function przygotujDaneHarmonogramu(ss) {
  var ssObj = ss || pobierzAktywnyArkusz();
  var mSheet = pobierzBiezacyArkuszMiesiaca(ssObj);
  if (!mSheet) return null;`;

const replaceHarmonogramStart = `function przygotujDaneHarmonogramu(ss) {
  var ssObj = ss || pobierzAktywnyArkusz();
  var mSheet = pobierzBiezacyArkuszMiesiaca(ssObj);
  var now = new Date();
  var currentYear = now.getFullYear();
  var currentMonthIdx = now.getMonth();
  var currentDay = now.getDate();
  var daysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();

  if (!mSheet) {
    // FALLBACK: Pobierz bezpośrednio z Firestore!
    var polishM = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
    var polishAlt = ["Styczen", "Luty", "Marzec", "Kwiecien", "Maj", "Czerwiec", "Lipiec", "Sierpien", "Wrzesien", "Pazdziernik", "Listopad", "Grudzien"];
    var docName = polishM[currentMonthIdx] + "_" + currentYear;
    var docAlt = polishAlt[currentMonthIdx] + "_" + currentYear;
    var fsData = pobierzDokumentFirestore("stan_grafiku", docName) || pobierzDokumentFirestore("stan_grafiku", docAlt);

    if (fsData && fsData.wiersze && fsData.wiersze.length > 0) {
      var userRowMap = {};
      var userGrupaMap = {};
      var colBValues = [];
      var allBackgrounds = [];
      var allValues = [];

      for (var fi = 0; fi < fsData.wiersze.length; fi++) {
        var fw = fsData.wiersze[fi];
        var nNorm = oczyscNazwiskoMinistranta(fw.nazwisko || "").toLowerCase();
        var virtualRow = fi + 3;
        userRowMap[nNorm] = virtualRow;
        userGrupaMap[virtualRow] = fw.grupa || "";
        colBValues.push([fw.nazwisko || ""]);

        var rowVals = [];
        var rowBgs = [];
        for (var ci = 0; ci < daysInMonth; ci++) {
          var cell = (fw.komorki && fw.komorki[ci]) ? fw.komorki[ci] : {};
          rowVals.push(cell.wartosc !== undefined ? cell.wartosc : null);
          rowBgs.push(cell.maDyzur ? "#c6efce" : "#ffffff");
        }
        allValues.push(rowVals);
        allBackgrounds.push(rowBgs);
      }

      var grupyGodziny = {};
      (fsData.grupy || []).forEach(function(g) {
        if (g.nazwa && g.godzinaNiedziela) grupyGodziny[g.nazwa.trim()] = cleanTime(g.godzinaNiedziela);
      });

      var zastepstwaDni = {};
      (fsData.zamianyZastepstwa || []).forEach(function(z) {
        if (!z || z.status === "ANULOWANA") return;
        var zDay = parseInt(z.dzien, 10);
        if (isNaN(zDay)) return;
        if (!zastepstwaDni[zDay]) zastepstwaDni[zDay] = [];
        zastepstwaDni[zDay].push({
          id: z.id,
          dzien: zDay,
          oddajacy: oczyscNazwiskoMinistranta(z.oddajacy || "").toLowerCase(),
          przejmujacy: oczyscNazwiskoMinistranta(z.przejmujacy || "").toLowerCase(),
          godzina: cleanTime(z.godzina),
          status: z.status
        });
      });

      var zamianyNiedzieleList = [];
      (fsData.zamianyNiedziele || []).forEach(function(zn) {
        if (zn && zn.status === "ZAAKCEPTOWANA") {
          zamianyNiedzieleList.push({
            dzien: parseInt(zn.dzien, 10),
            wystawiajacy: oczyscNazwiskoMinistranta(zn.wystawiajacy || "").toLowerCase(),
            godzOddana: cleanTime(zn.godzinaOddawana || zn.godzOddana),
            przejmujacy: oczyscNazwiskoMinistranta(zn.przejmujacy || "").toLowerCase(),
            godzWzieta: cleanTime(zn.godzinaPrzejmujacego || zn.godzWzieta)
          });
        }
      });

      return {
        ss: ssObj,
        mSheet: null,
        currentYear: currentYear,
        currentMonthIdx: currentMonthIdx,
        currentDay: currentDay,
        daysInMonth: daysInMonth,
        colBValues: colBValues,
        userRowMap: userRowMap,
        userGrupaMap: userGrupaMap,
        allBackgrounds: allBackgrounds,
        allValues: allValues,
        dniSwiateczne: [],
        zastepstwaDni: zastepstwaDni,
        grupyGodziny: grupyGodziny,
        zamianyNiedzieleList: zamianyNiedzieleList
      };
    }
    return null;
  }`;

if (code.includes(targetHarmonogramStart)) {
  code = code.replace(targetHarmonogramStart, replaceHarmonogramStart);
  console.log('Patched przygotujDaneHarmonogramu with Firestore fallback');
}

// 4. wyznaczGodzineNiedzielnaMinistranta userGrupaMap support
const targetWyznaczGodz = 'function wyznaczGodzineNiedzielnaMinistranta(userRow, colBValues, grupyGodziny) {';
const replaceWyznaczGodz = `function wyznaczGodzineNiedzielnaMinistranta(userRow, colBValues, grupyGodziny, userGrupaMap) {
  if (userGrupaMap && userGrupaMap[userRow]) {
    var uG = userGrupaMap[userRow];
    for (var gKey in grupyGodziny) {
      if (dopasujGrupe(gKey, uG)) return cleanTime(grupyGodziny[gKey]);
    }
  }`;

if (code.includes(targetWyznaczGodz) && !code.includes('userGrupaMap[userRow]')) {
  code = code.replace(targetWyznaczGodz, replaceWyznaczGodz);
  console.log('Patched wyznaczGodzineNiedzielnaMinistranta');
}

// 5. sprawdzCzyMinistrantMaDyzurWDniu pass userGrupaMap
code = code.replace(
  'var sobGodzina = wyznaczGodzineNiedzielnaMinistranta(userRow, cache.colBValues, cache.grupyGodziny);',
  'var sobGodzina = wyznaczGodzineNiedzielnaMinistranta(userRow, cache.colBValues, cache.grupyGodziny, cache.userGrupaMap);'
);
code = code.replace(
  'var ndGodzina = wyznaczGodzineNiedzielnaMinistranta(userRow, cache.colBValues, cache.grupyGodziny);',
  'var ndGodzina = wyznaczGodzineNiedzielnaMinistranta(userRow, cache.colBValues, cache.grupyGodziny, cache.userGrupaMap);'
);

// 6. wyslijWieczornePrzypomnieniaONajblizszejSluzbie
const wieczorneFunc = `
function wyslijWieczornePrzypomnieniaONajblizszejSluzbie(customDate) {
  var ss = pobierzAktywnyArkusz();
  var now = customDate || new Date();
  var cache = przygotujDaneHarmonogramu(ss);
  if (!cache) {
    console.warn("Brak arkusza bieżącego miesiąca dla wieczornych powiadomień.");
    return { sukces: false, wiadomosc: "Brak danych harmonogramu." };
  }

  var jutroDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  var jutroDay = jutroDate.getDate();
  var jutroMonthIdx = jutroDate.getMonth();

  if (jutroMonthIdx !== cache.currentMonthIdx) {
    return { sukces: true, pominieto: true, wiadomosc: "Jutro jest już kolejny miesiąc." };
  }

  var sheetTok = ss.getSheetByName("Powiadomienia_Tokeny");
  if (!sheetTok || sheetTok.getLastRow() < 2) {
    return { sukces: false, wiadomosc: "Brak zarejestrowanych telefonów w arkuszu Powiadomienia_Tokeny." };
  }

  var tokenData = sheetTok.getRange(2, 1, sheetTok.getLastRow() - 1, 2).getValues();
  var wyslaneDo = [];
  var dniTygodniaBiernik = ["niedzielę", "poniedziałek", "wtorek", "środę", "czwartek", "piątek", "sobotę"];
  var nazwaDniaJutro = dniTygodniaBiernik[jutroDate.getDay()];

  for (var i = 0; i < tokenData.length; i++) {
    var nazwisko = tokenData[i][0];
    var token = tokenData[i][1];
    if (!token || !nazwisko) continue;

    var norm = oczyscNazwiskoMinistranta(nazwisko).toLowerCase();
    var sluzba = sprawdzCzyMinistrantMaDyzurWDniu(norm, jutroDay, cache);

    if (sluzba.maDyzur) {
      var imie = nazwisko.trim().split(/\\s+/)[0];
      var tytul = "Przypomnienie o służbie na jutro ⛪";
      var tresc = "Cześć " + imie + "! Jutro w " + nazwaDniaJutro + " masz dyżur na Mszy św. o godz. " + sluzba.godzina + ". Pamiętaj o przygotowaniu!";
      if (sluzba.typ === "ZASTEPSTWO") {
        tresc = "Cześć " + imie + "! Jutro w " + nazwaDniaJutro + " masz dyżur na Mszy św. o godz. " + sluzba.godzina + " (" + sluzba.opis + "). Pamiętaj o przyjściu!";
      }

      var resPush = wyslijWiadomoscFCM(token, tytul, tresc, {
        widok: "pulpit",
        url: "https://ministranci.web.app/"
      });

      if (resPush && resPush.sukces) {
        if (wyslaneDo.indexOf(nazwisko) === -1) wyslaneDo.push(nazwisko + " (" + sluzba.godzina + ")");
      }
    }
  }

  return {
    sukces: true,
    liczbaWyslanych: wyslaneDo.length,
    odbiorcy: wyslaneDo,
    wiadomosc: wyslaneDo.length > 0 ? "Wysłano wieczorne przypomnienia do: " + wyslaneDo.join(", ") : "Brak osób ze służbą na jutro."
  };
}
`;

if (!code.includes('wyslijWieczornePrzypomnieniaONajblizszejSluzbie')) {
  code += wieczorneFunc;
  console.log('Added wyslijWieczornePrzypomnieniaONajblizszejSluzbie');
}

// 7. utworzWyzwalaczPoranny add 20:00 trigger
const targetTrigger = 'ScriptApp.newTrigger("wyslijPorannePrzypomnieniaOSluzbie")';
const addEveningTrigger = `// Wieczorne przypomnienia o 20:00
  ScriptApp.newTrigger("wyslijWieczornePrzypomnieniaONajblizszejSluzbie")
    .timeBased()
    .everyDays(1)
    .atHour(20)
    .nearMinute(0)
    .inTimezone("Europe/Warsaw")
    .create();

  ScriptApp.newTrigger("wyslijPorannePrzypomnieniaOSluzbie")`;

if (code.includes(targetTrigger) && !code.includes('wyslijWieczornePrzypomnieniaONajblizszejSluzbie') && !code.includes('atHour(20)')) {
  code = code.replace(targetTrigger, addEveningTrigger);
  console.log('Added 20:00 evening trigger to utworzWyzwalaczPoranny');
}

fs.writeFileSync('Zamiany.js', code, 'utf8');
console.log('Zamiany.js successfully updated locally!');

// 8. Deploy to Apps Script API directly
const claspRc = JSON.parse(fs.readFileSync('C:/Users/Maciek/.clasprc.json'));
const creds = claspRc.tokens.default;

const postData = new URLSearchParams({
  client_id: creds.client_id,
  client_secret: creds.client_secret,
  refresh_token: creds.refresh_token,
  grant_type: 'refresh_token'
}).toString();

const tokenReq = https.request('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
}, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const tokenRes = JSON.parse(data);
    const accessToken = tokenRes.access_token;
    if (!accessToken) {
      console.error('Failed to get access token:', data);
      return;
    }
    console.log('Got Google access token!');
    const scriptId = '1JApA9KUap-P1lGe8Lh7elscqo3koW_Lo6Sh6onPkKD04X27Y4Z1qm-9T';

    // First get existing files
    https.get('https://script.googleapis.com/v1/projects/' + scriptId + '/content', {
      headers: { 'Authorization': 'Bearer ' + accessToken }
    }, (cRes) => {
      let cData = '';
      cRes.on('data', c => cData += c);
      cRes.on('end', () => {
        const content = JSON.parse(cData);
        let files = content.files || [];
        // Update Zamiany file
        const zFile = files.find(f => f.name === 'Zamiany');
        if (zFile) {
          zFile.source = code;
        } else {
          files.push({ name: 'Zamiany', type: 'SERVER_JS', source: code });
        }

        const putPayload = JSON.stringify({ files: files });
        const putReq = https.request('https://script.googleapis.com/v1/projects/' + scriptId + '/content', {
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer ' + accessToken,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(putPayload)
          }
        }, (putRes) => {
          let pData = '';
          putRes.on('data', c => pData += c);
          putRes.on('end', () => {
            console.log('Apps Script PUT response status:', putRes.statusCode);
            if (putRes.statusCode === 200) {
              console.log('SUCCESS: Apps Script updated and deployed successfully!');
            } else {
              console.error('Apps Script error:', pData);
            }
          });
        });
        putReq.write(putPayload);
        putReq.end();
      });
    });
  });
});
tokenReq.write(postData);
tokenReq.end();
