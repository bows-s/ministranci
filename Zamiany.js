function doPost(e) {
  return obsluzZapytanieAPI(e);
}

function doGet(e) {
  if (e && e.parameter && (e.parameter.akcja || e.parameter.payload)) {
    return obsluzZapytanieAPI(e);
  }

  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Giełda Dyżurów')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function obsluzZapytanieAPI(e) {
  var wynik = { sukces: false, wiadomosc: "Nieznana akcja" };
  try {
    var data = null;
    if (e && e.postData && e.postData.contents) {
      try { data = JSON.parse(e.postData.contents); } catch (err) {}
    } else if (e && e.parameter && e.parameter.payload) {
      try { data = JSON.parse(e.parameter.payload); } catch (err) {}
    }

    var funkcja = (data && data.funkcja) || (e && e.parameter && e.parameter.akcja);
    var args = (data && data.args) || [];

    if (funkcja === "diagnozaArkusza") {
      var ss = pobierzAktywnyArkusz();
      var mSheet = pobierzBiezacyArkuszMiesiaca(ss);
      var maxR = Math.min(mSheet.getLastRow(), 45);
      var maxC = Math.min(mSheet.getLastColumn(), 40);
      var allData = mSheet.getRange(1, 1, maxR, maxC).getDisplayValues();
      var rows = [];
      for (var r = 0; r < allData.length; r++) {
        var rowText = allData[r].slice(0, 35).join(" | ");
        rows.push({ row: r + 1, colB: allData[r][1], sample: rowText });
      }
      var allSheets = ss.getSheets().map(function(s) { return s.getName(); });
      wynik = { sukces: true, sheetName: mSheet.getName(), allSheets: allSheets, lastRow: mSheet.getLastRow(), rows: rows };
    } else if (funkcja === "inicjalizujAplikacje") {
      wynik = inicjalizujAplikacje(args[0] || (e.parameter && e.parameter.nazwisko) || "", args[1] || (e.parameter && e.parameter.pin) || "");
    } else if (funkcja === "logowanieIStan") {
      wynik = logowanieIStan(args[0], args[1]);
    } else if (funkcja === "pobierzStanDanych") {
      wynik = pobierzStanDanych(args[0], args[1], null, args[2]);
    } else if (funkcja === "odswiezStan") {
      wynik = pobierzStanDanych(args[0], args[1]);
    } else if (funkcja === "wystawOferteTydzien") {
      wynik = wystawOferteTydzien(args[0], args[1], args[2], args[3], args[4]);
    } else if (funkcja === "anulujOferteTydzien") {
      wynik = anulujOferteTydzien(args[0], args[1], args[2]);
    } else if (funkcja === "zaakceptujOferteTydzien") {
      wynik = zaakceptujOferteTydzien(args[0], args[1], args[2], args[3]);
    } else if (funkcja === "wystawOferteNiedziela") {
      wynik = wystawOferteNiedziela(args[0], args[1], args[2], args[3]);
    } else if (funkcja === "anulujOferteNiedziela") {
      wynik = anulujOferteNiedziela(args[0], args[1], args[2]);
    } else if (funkcja === "zaakceptujOferteNiedziela") {
      wynik = zaakceptujOferteNiedziela(args[0], args[1], args[2]);
    } else if (funkcja === "wystawZastepstwo") {
      wynik = wystawZastepstwo(args[0], args[1], args[2], args[3], args[4]);
    } else if (funkcja === "anulujZastepstwo") {
      wynik = anulujZastepstwo(args[0], args[1], args[2], args[3]);
    } else if (funkcja === "zaakceptujZastepstwo") {
      wynik = zaakceptujZastepstwo(args[0], args[1], args[2]);
    } else if (funkcja === "usprawiedliwNiedziele") {
      wynik = usprawiedliwNiedziele(args[0], args[1], args[2]);
    } else if (funkcja === "anulujUsprawiedliwienieNiedziela") {
      wynik = anulujUsprawiedliwienieNiedziela(args[0], args[1], args[2]);
    } else if (funkcja === "zapiszTokenFCM") {
      wynik = zapiszTokenFCM(args[0], args[1], args[2]);
    } else if (funkcja === "pobierzDaneDlaZakrystii") {
      wynik = pobierzDaneDlaZakrystii(args[0], args[1]);
    } else if (funkcja === "zapiszObecnoscZZakrystii") {
      wynik = zapiszObecnoscZZakrystii(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8]);
    } else if (funkcja === "zarejestrujZastepstwoIMsze") {
      wynik = zarejestrujZastepstwoIMsze(args[0], args[1], args[2], args[3], args[4], args[5]);
    } else if (funkcja === "resetujObecnoscDnia") {
      wynik = resetujObecnoscDnia(args[0]);
    } else if (funkcja === "wyczyscPusteWierszeArkusza") {
      wynik = wyczyscPusteWierszeArkusza();
    } else if (funkcja === "usunKolumneIloscMszy") {
      wynik = usunKolumneIloscMszy();
    } else if (funkcja === "pobierzPelnaTabeleMiesiaca") {
      wynik = pobierzPelnaTabeleMiesiaca(args[0]);
    } else if (funkcja === "pobierzDostepneMiesiace") {
      wynik = { sukces: true, miesiace: pobierzDostepneMiesiace() };
    } else if (funkcja === "synchronizujWszystkieMiesiace") {
      wynik = synchronizujWszystkieMiesiaceDoFirestore();
    } else if (funkcja === "odpiszDyzurowMateuszaPokojskiego") {
      wynik = odpiszDyzurowMateuszaPokojskiego();
    } else if (funkcja === "naprawGodzineOfertyRozika") {
      wynik = naprawGodzineOfertyRozika();
    } else if (funkcja === "naprawBledneStatusyZastepstw") {
      wynik = naprawBledneStatusyZastepstw();
    } else if (funkcja === "naprawPunktyDnia11") {
      wynik = naprawPunktyDnia11();
    } else if (funkcja === "korektaPunktowNiedzielaITydzien") {
      wynik = korektaPunktowNiedzielaITydzien();
    } else if (funkcja === "sprawdzINaprawLosoweWpisy") {
      wynik = sprawdzINaprawLosoweWpisy();
    } else if (funkcja === "naprawPawelGlazWeekend") {
      wynik = naprawPawelGlazWeekend();
    } else if (funkcja === "przelaczZgloszenieLiturgia") {
      wynik = przelaczZgloszenieLiturgia(args[0], args[1]);
    } else if (funkcja === "poprawGodzinyLiturgii") {
      wynik = poprawGodzinyLiturgii();
    } else if (funkcja === "pobierzHistorieZakrystii") {
      var ssH = pobierzAktywnyArkusz();
      wynik = { sukces: true, historia: pobierzHistorieWpisowZakrystii(ssH, args[0] || 60) };
    } else if (funkcja === "oglosDodatkowaLiturgie") {
      wynik = oglosDodatkowaLiturgie(args[0]);
    } else if (funkcja === "synchronizujFirestore") {
      wynik = synchronizujDoFirestore();
    } else if (funkcja === "testFCM") {
      wynik = testowePowiadomienieFCM(args[0]);
    } else if (funkcja === "aktywujWyzwalaczPoranny") {
      wynik = utworzWyzwalaczPoranny();
    } else if (funkcja === "testujPorannePrzypomnienia") {
      var customDate = (args && args[0]) ? new Date(args[0]) : null;
      wynik = wyslijPorannePrzypomnieniaOSluzbie(customDate);
    } else if (funkcja === "symulujPorannePrzypomnienie") {
      wynik = symulujPorannePrzypomnienieDlaMinistranta(args[0]);
    } else if (funkcja === "zapiszKluczFirebase") {
      var saJson = args[0];
      if (saJson && typeof saJson === "object") saJson = JSON.stringify(saJson);
      PropertiesService.getScriptProperties().setProperty("FIREBASE_SERVICE_ACCOUNT", saJson);
      wynik = { sukces: true, wiadomosc: "Klucz Firebase został pomyślnie zapisany w ScriptProperties!" };
    } else if (funkcja === "sprawdzKluczFirebase") {
      var k = PropertiesService.getScriptProperties().getProperty("FIREBASE_SERVICE_ACCOUNT");
      wynik = {
        sukces: true,
        maKlucz: !!k,
        dlugosc: k ? k.length : 0,
        keys: PropertiesService.getScriptProperties().getKeys()
      };
    } else if (funkcja === "pobierzZarejestrowaneTokeny") {
      var ss = pobierzAktywnyArkusz();
      var sh = ss.getSheetByName("Powiadomienia_Tokeny");
      var rows = (sh && sh.getLastRow() > 1) ? sh.getRange(2, 1, sh.getLastRow() - 1, 5).getDisplayValues() : [];
      wynik = { sukces: true, rows: rows };
    } else if (funkcja === "czyscNieprawidloweTokeny") {
      var ss = pobierzAktywnyArkusz();
      var sheet = ss.getSheetByName("Powiadomienia_Tokeny");
      if (sheet && sheet.getLastRow() > 1) {
        var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
        for (var i = data.length - 1; i >= 0; i--) {
          if (data[i][1].indexOf("test-token") !== -1) {
            sheet.deleteRow(i + 2);
          }
        }
      }
      wynik = { sukces: true };
    }
  } catch (ex) {
    wynik = { sukces: false, wiadomosc: "Błąd serwera: " + ex.message };
  }

  return ContentService.createTextOutput(JSON.stringify(wynik))
    .setMimeType(ContentService.MimeType.JSON);
}

function zapiszTokenFCM(nazwisko, token, urzadzenie) {
  if (!nazwisko || !token) return { sukces: false, wiadomosc: "Brak nazwiska lub tokenu." };
  var ss = pobierzAktywnyArkusz();
  var sheet = ss.getSheetByName("Powiadomienia_Tokeny");
  if (!sheet) {
    sheet = ss.insertSheet("Powiadomienia_Tokeny");
    sheet.appendRow(["Nazwisko", "Token FCM", "Urządzenie", "Data Rejestracji", "Ostatnia Aktywność"]);
    sheet.getRange("A1:E1").setFontWeight("bold").setBackground("#d9ead3");
  }

  var lastRow = sheet.getLastRow();
  var foundRow = -1;
  if (lastRow > 1) {
    var existingData = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    for (var i = 0; i < existingData.length; i++) {
      if (existingData[i][1] === token) {
        foundRow = i + 2;
        break;
      }
    }
  }

  var nowStr = Utilities.formatDate(new Date(), "Europe/Warsaw", "yyyy-MM-dd HH:mm:ss");
  if (foundRow !== -1) {
    sheet.getRange(foundRow, 1).setValue(nazwisko);
    sheet.getRange(foundRow, 2).setValue(token);
    sheet.getRange(foundRow, 3).setValue(urzadzenie || "Web PWA");
    sheet.getRange(foundRow, 5).setValue(nowStr);
  } else {
    sheet.appendRow([nazwisko, token, urzadzenie || "Web PWA", nowStr, nowStr]);
  }

  return { sukces: true, wiadomosc: "Token zarejestrowany pomyślnie w arkuszu." };
}

function pobierzAccessTokenFCM() {
  var props = PropertiesService.getScriptProperties();
  var saJsonStr = props.getProperty("FIREBASE_SERVICE_ACCOUNT");
  if (!saJsonStr) return { token: null, blad: "Brak FIREBASE_SERVICE_ACCOUNT w ScriptProperties." };

  try {
    var sa = typeof saJsonStr === "object" ? saJsonStr : JSON.parse(saJsonStr);
    if (typeof sa === "string") sa = JSON.parse(sa);

    var header = { alg: "RS256", typ: "JWT" };
    var now = Math.floor(Date.now() / 1000);
    var claim = {
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now
    };

    var encode = function(obj) {
      return Utilities.base64EncodeWebSafe(JSON.stringify(obj)).replace(/=+$/, "");
    };

    var toSign = encode(header) + "." + encode(claim);
    var signature = Utilities.computeRsaSha256Signature(toSign, sa.private_key);
    var jwt = toSign + "." + Utilities.base64EncodeWebSafe(signature).replace(/=+$/, "");

    var resp = UrlFetchApp.fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      payload: {
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt
      },
      muteHttpExceptions: true
    });

    var resObj = JSON.parse(resp.getContentText());
    if (resObj.access_token) {
      return { token: resObj.access_token };
    } else {
      return { token: null, blad: "Błąd Google OAuth2: " + (resObj.error_description || resp.getContentText()) };
    }
  } catch (e) {
    return { token: null, blad: "Wyjątek tokenu FCM: " + e.message };
  }
}

function wyslijWiadomoscFCM(token, tytul, tresc, dataPayload) {
  var authRes = pobierzAccessTokenFCM();
  if (!authRes.token) {
    return { sukces: false, wiadomosc: authRes.blad || "Brak autoryzacji Firebase." };
  }

  var targetLink = (dataPayload && dataPayload.url) ? dataPayload.url : "https://ministranci.web.app";
  var url = "https://fcm.googleapis.com/v1/projects/makole-85f32/messages:send";
  var body = {
    message: {
      token: token,
      data: dataPayload || {},
      webpush: {
        headers: {
          Urgency: "high"
        },
        notification: {
          title: tytul,
          body: tresc,
          icon: "https://ministranci.web.app/icon-192.png",
          badge: "https://ministranci.web.app/icon-192.png",
          tag: "ministranci-alert"
        },
        fcm_options: {
          link: targetLink
        }
      }
    }
  };

  var resp = UrlFetchApp.fetch(url, {
    method: "POST",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + authRes.token
    },
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });

  var resObj = {};
  try { resObj = JSON.parse(resp.getContentText()); } catch (e) {}

  if (resp.getResponseCode() === 404 || (resObj.error && JSON.stringify(resObj.error).indexOf("UNREGISTERED") !== -1)) {
    usunNieaktywnyToken(token);
  }

  return { sukces: resp.getResponseCode() === 200, status: resp.getResponseCode(), res: resObj };
}

function usunNieaktywnyToken(token) {
  try {
    var ss = pobierzAktywnyArkusz();
    var sheet = ss.getSheetByName("Powiadomienia_Tokeny");
    if (!sheet || sheet.getLastRow() < 2) return;
    var data = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < data.length; i++) {
      if (data[i][0] === token) {
        sheet.deleteRow(i + 2);
        break;
      }
    }
  } catch (err) {
    console.warn("Błąd usuwania nieaktywnego tokenu:", err);
  }
}

function czyToTenSamMinistrant(a, b) {
  if (!a || !b) return false;
  var na = oczyscNazwiskoMinistranta(a).trim().toLowerCase();
  var nb = oczyscNazwiskoMinistranta(b).trim().toLowerCase();
  if (na === nb) return true;
  if (na.indexOf(nb) !== -1 || nb.indexOf(na) !== -1) return true;
  var partsA = na.split(/\s+/).filter(Boolean);
  var partsB = nb.split(/\s+/).filter(Boolean);
  if (partsA.length >= 2 && partsB.length >= 2) {
    if ((partsA[0] === partsB[1] && partsA[1] === partsB[0]) ||
        (partsA[partsA.length - 1] === partsB[0] && partsA[0] === partsB[partsB.length - 1])) {
      return true;
    }
  }
  return false;
}

function powiadomONowejOfercie(wystawiajacy, typGrafiku, szczegoly, filtrDanych) {
  try {
    var ss = pobierzAktywnyArkusz();
    var sheet = ss.getSheetByName("Powiadomienia_Tokeny");
    if (!sheet || sheet.getLastRow() < 2) return;

    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
    var tytul = "Nowa oferta na giełdzie! 📢";
    var tresc = wystawiajacy + " oddaje dyżur (" + szczegoly + "). Kliknij, aby przejąć!";

    if (typGrafiku && typGrafiku.indexOf("Wolny dyżur") !== -1) {
      tytul = "Nowy wolny dyżur do wzięcia! 📢 (+4 pkt)";
      tresc = wystawiajacy + " wystawił wolny dyżur (" + szczegoly + "). Kliknij, aby przejąć!";
    }

    var cache = (filtrDanych) ? przygotujDaneHarmonogramu(ss) : null;

    for (var i = 0; i < data.length; i++) {
      var n = data[i][0];
      var tok = data[i][1];
      if (!tok || !n || czyToTenSamMinistrant(n, wystawiajacy)) continue;

      // Jeśli przekazano filtr, powiadamiamy TYLKO osoby, które faktycznie mogą wziąć dyżur
      if (filtrDanych && cache) {
        if (!czyMinistrantKwalifikujeSieDoOferty(n, filtrDanych, cache)) {
          continue; // Pomijamy ministranta, który nie może wziąć tej oferty
        }
      }

      wyslijWiadomoscFCM(tok, tytul, tresc, {
        typ: String(typGrafiku),
        od: String(wystawiajacy),
        widok: "gielda",
        url: "https://ministranci.web.app/?open=gielda"
      });
    }
  } catch (err) {
    console.error("Błąd powiadamiania o ofercie:", err);
  }
}

function powiadomWystawiajacegoOPrzeksztalceniu(wystawiajacy, dzien, nazwaMiesiaca, godzina) {
  try {
    var ss = pobierzAktywnyArkusz();
    var sheet = ss.getSheetByName("Powiadomienia_Tokeny");
    if (!sheet || sheet.getLastRow() < 2) return;
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();

    var tytul = "Twoja oferta przeszła na wolny dyżur ⏳";
    var tresc = "Minął czas na wymianę 1:1. Twój dyżur (" + dzien + " " + nazwaMiesiaca + ", godz. " + godzina + ") trafił na giełdę jako wolna msza do wzięcia (+4 pkt).";

    for (var i = 0; i < data.length; i++) {
      if (czyToTenSamMinistrant(data[i][0], wystawiajacy) && data[i][1]) {
        wyslijWiadomoscFCM(data[i][1], tytul, tresc, {
          typ: "AUTO_KONWERSJA_WYSTAWIAJACY",
          widok: "gielda",
          url: "https://ministranci.web.app/?open=gielda"
        });
      }
    }
  } catch (err) {
    console.warn("Błąd powiadamiania wystawiającego o przekształceniu:", err);
  }
}

function powiadomOWolnymDyzurzeZAutoKonwersji(wystawiajacy, dzien, nazwaMiesiaca, godzina) {
  try {
    var ss = pobierzAktywnyArkusz();
    var sheet = ss.getSheetByName("Powiadomienia_Tokeny");
    if (!sheet || sheet.getLastRow() < 2) return;
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();

    var tytul = "Nowy wolny dyżur do wzięcia! 📢 (+4 pkt)";
    var tresc = wystawiajacy + " oddaje dyżur (" + dzien + " " + nazwaMiesiaca + ", godz. " + godzina + "). Kliknij, aby przejąć i zdobyć +4 pkt!";

    var cache = przygotujDaneHarmonogramu(ss);
    var filtrDanych = { typOferty: "ZASTEPSTWO", dzien: dzien };

    for (var i = 0; i < data.length; i++) {
      var n = data[i][0];
      var tok = data[i][1];
      if (!tok || !n || czyToTenSamMinistrant(n, wystawiajacy)) continue;

      if (cache && !czyMinistrantKwalifikujeSieDoOferty(n, filtrDanych, cache)) {
        continue;
      }

      wyslijWiadomoscFCM(tok, tytul, tresc, {
        typ: "ZASTEPSTWO_NOWE",
        od: String(wystawiajacy),
        widok: "gielda",
        url: "https://ministranci.web.app/?open=gielda"
      });
    }
  } catch (err) {
    console.warn("Błąd powiadamiania o nowym wolnym dyżurze z auto-konwersji:", err);
  }
}

function testowePowiadomienieFCM(nazwisko) {
  var ss = pobierzAktywnyArkusz();
  var sheet = ss.getSheetByName("Powiadomienia_Tokeny");
  if (!sheet || sheet.getLastRow() < 2) return { sukces: false, wiadomosc: "Brak zarejestrowanych telefonów." };

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  var targetToken = null;
  for (var i = 0; i < data.length; i++) {
    if (czyToTenSamMinistrant(data[i][0], nazwisko) && data[i][1]) {
      targetToken = data[i][1];
      break;
    }
  }

  if (!targetToken) return { sukces: false, wiadomosc: "Nie znaleziono tokenu dla " + nazwisko };
  return wyslijWiadomoscFCM(targetToken, "Test Powiadomień 🔔", "Powiadomienia w aplikacji ministrantów działają poprawnie!", {
    test: "true",
    widok: "pulpit",
    url: "https://ministranci.web.app/"
  });
}

function powiadomOZamianie(doKogo, ktoZaakceptowal, szczegoly) {
  try {
    var ss = pobierzAktywnyArkusz();
    var sheet = ss.getSheetByName("Powiadomienia_Tokeny");
    if (!sheet || sheet.getLastRow() < 2) return;

    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
    var tytul = "Twoja oferta została przejęta! ✅";
    var tresc = ktoZaakceptowal + " przejął Twój dyżur (" + szczegoly + "). Grafik został zaktualizowany!";

    for (var i = 0; i < data.length; i++) {
      if (czyToTenSamMinistrant(data[i][0], doKogo) && data[i][1]) {
        wyslijWiadomoscFCM(data[i][1], tytul, tresc, {
          typ: "ZAMIANA_ZAAKCEPTOWANA",
          kto: String(ktoZaakceptowal),
          widok: "pulpit",
          url: "https://ministranci.web.app/"
        });
      }
    }
  } catch (err) {
    console.error("Błąd powiadamiania o zaakceptowaniu:", err);
  }
}

// =============================================================
// INTELIGENTNE FILTROWANIE OFERT I PORANNE PRZYPOMNIENIA O SŁUŻBIE
// =============================================================
function przygotujDaneHarmonogramu(ss) {
  var ssObj = ss || pobierzAktywnyArkusz();
  var mSheet = pobierzBiezacyArkuszMiesiaca(ssObj);
  if (!mSheet) return null;

  var now = new Date();
  var currentYear = now.getFullYear();
  var currentMonthIdx = now.getMonth();
  var currentDay = now.getDate();
  var daysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();

  var maxRows = Math.min(mSheet.getLastRow(), 32);
  var colBValues = mSheet.getRange(1, 2, maxRows, 1).getValues();

  var userRowMap = {};
  for (var r = 2; r < maxRows; r++) {
    var rawN = colBValues[r][0].toString().trim();
    if (rawN) {
      var norm = oczyscNazwiskoMinistranta(rawN).toLowerCase();
      userRowMap[norm] = r + 1;
    }
  }

  var allBackgrounds = mSheet.getRange(3, 4, maxRows - 2, daysInMonth).getBackgrounds();
  var allValues = mSheet.getRange(3, 4, maxRows - 2, daysInMonth).getValues();

  var dniSwiateczne = [];
  for (var dIdx = 0; dIdx < daysInMonth; dIdx++) {
    var testDateH = new Date(currentYear, currentMonthIdx, dIdx + 1);
    var dDay = testDateH.getDay();
    if (dDay >= 1 && dDay <= 5) {
      var koloroweWiersze = 0;
      for (var rowI = 0; rowI < allBackgrounds.length; rowI++) {
        var cBg = allBackgrounds[rowI][dIdx].toLowerCase();
        if (cBg !== "#ffffff" && cBg !== "" && cBg !== "transparent") {
          koloroweWiersze++;
        }
      }
      if (koloroweWiersze >= 6) {
        dniSwiateczne.push(dIdx + 1);
      }
    }
  }

  var zSheet = ssObj.getSheetByName("Zamiany_Zastepstwa");
  var zastepstwaDni = {};
  if (zSheet && zSheet.getLastRow() > 1) {
    var zData = zSheet.getRange(2, 1, zSheet.getLastRow() - 1, 10).getDisplayValues();
    for (var zi = 0; zi < zData.length; zi++) {
      var zStat = zData[zi][7].trim();
      if (zStat === "ANULOWANA") continue;
      var zDay = parseInt(zData[zi][2], 10);
      if (isNaN(zDay)) continue;
      if (!zastepstwaDni[zDay]) zastepstwaDni[zDay] = [];
      zastepstwaDni[zDay].push({
        id: zData[zi][0],
        dzien: zDay,
        oddajacy: oczyscNazwiskoMinistranta(zData[zi][3]).toLowerCase(),
        przejmujacy: oczyscNazwiskoMinistranta(zData[zi][4]).toLowerCase(),
        godzina: cleanTime(zData[zi][5]),
        status: zStat
      });
    }
  }

  var sundaySheet = ssObj.getSheetByName("Grafik_Niedziele");
  var grupyGodziny = {};
  if (sundaySheet) {
    var gData = sundaySheet.getRange("A2:B5").getDisplayValues();
    for (var gi = 0; gi < gData.length; gi++) {
      grupyGodziny[gData[gi][0].toString().trim()] = cleanTime(gData[gi][1]);
    }
  }

  var nSheet = ssObj.getSheetByName("Zamiany_Niedziele");
  var zamianyNiedzieleList = [];
  if (nSheet && nSheet.getLastRow() > 1) {
    var nData = nSheet.getRange(2, 1, nSheet.getLastRow() - 1, 9).getDisplayValues();
    for (var ni = 0; ni < nData.length; ni++) {
      if (nData[ni][8].trim() === "ZAAKCEPTOWANA" && nData[ni][1] === mSheet.getName()) {
        zamianyNiedzieleList.push({
          dzien: parseInt(nData[ni][2], 10),
          wystawiajacy: oczyscNazwiskoMinistranta(nData[ni][3]).toLowerCase(),
          godzOddana: cleanTime(nData[ni][4]),
          przejmujacy: oczyscNazwiskoMinistranta(nData[ni][6]).toLowerCase(),
          godzWzieta: cleanTime(nData[ni][7])
        });
      }
    }
  }

  return {
    ss: ssObj,
    mSheet: mSheet,
    currentYear: currentYear,
    currentMonthIdx: currentMonthIdx,
    currentDay: currentDay,
    daysInMonth: daysInMonth,
    colBValues: colBValues,
    userRowMap: userRowMap,
    allBackgrounds: allBackgrounds,
    allValues: allValues,
    dniSwiateczne: dniSwiateczne,
    zastepstwaDni: zastepstwaDni,
    grupyGodziny: grupyGodziny,
    zamianyNiedzieleList: zamianyNiedzieleList
  };
}

function wyznaczGodzineNiedzielnaMinistranta(userRow, colBValues, grupyGodziny) {
  if (!userRow || userRow < 3) return "";
  var groups = {
    "I GRUPA (CZERWONA)": [3, 4, 5, 6],
    "II GRUPA (POMARAŃCZOWA)": [9, 10, 11, 12],
    "III GRUPA (ZIELONA)": [15, 16, 17, 18, 19],
    "IV GRUPA (ŻÓŁTA)": [22, 23, 24, 25]
  };
  var mojaGrupa = "";
  for (var g in groups) {
    if (groups[g].indexOf(userRow) !== -1) {
      mojaGrupa = g;
      break;
    }
  }
  if (!mojaGrupa) {
    for (var bRow = userRow - 2; bRow >= 1; bRow--) {
      var valH = colBValues[bRow][0].toString().trim();
      if (valH.toUpperCase().indexOf("GRUPA") !== -1) {
        mojaGrupa = valH;
        break;
      }
    }
  }
  for (var grpName in grupyGodziny) {
    if (dopasujGrupe(grpName, mojaGrupa)) {
      return cleanTime(grupyGodziny[grpName]);
    }
  }
  return "";
}

function sprawdzCzyMinistrantMaDyzurWDniu(normName, dayNum, cache) {
  if (!normName || !dayNum || !cache || dayNum < 1 || dayNum > cache.daysInMonth) {
    return { maDyzur: false };
  }

  var userRow = cache.userRowMap[normName];
  if (!userRow) {
    for (var nKey in cache.userRowMap) {
      if (nKey.indexOf(normName) !== -1 || normName.indexOf(nKey) !== -1) {
        userRow = cache.userRowMap[nKey];
        break;
      }
    }
  }
  if (!userRow) return { maDyzur: false };

  // 1. Sprawdź tabelę zastępstw
  var zList = cache.zastepstwaDni[dayNum] || [];
  for (var zi = 0; zi < zList.length; zi++) {
    var zItem = zList[zi];
    if (zItem.przejmujacy && (zItem.przejmujacy.indexOf(normName) !== -1 || normName.indexOf(zItem.przejmujacy) !== -1)) {
      if (zItem.status === "ZAAKCEPTOWANA") {
        return {
          maDyzur: true,
          typ: "ZASTEPSTWO",
          godzina: zItem.godzina || pobierzGodzineMszyWTygodniu(cache.currentYear, cache.currentMonthIdx, dayNum),
          opis: "zastępstwo (+4 pkt)"
        };
      }
    }
    if (zItem.oddajacy && (zItem.oddajacy.indexOf(normName) !== -1 || normName.indexOf(zItem.oddajacy) !== -1)) {
      if (zItem.status === "OCZEKUJE" || zItem.status === "ZAAKCEPTOWANA") {
        return { maDyzur: false, powód: "oddał dyżur" };
      }
    }
  }

  var dt = new Date(cache.currentYear, cache.currentMonthIdx, dayNum);
  var dow = dt.getDay(); // 0 = Nd, 1 = Pn, ..., 6 = Sb

  // 2. Dni w tygodniu (Pn - Pt)
  if (dow >= 1 && dow <= 5) {
    var bg = (cache.allBackgrounds[userRow - 3][dayNum - 1] || "").toLowerCase();
    if (bg !== "#ffffff" && bg !== "" && bg !== "transparent") {
      var isSwieto = (cache.dniSwiateczne.indexOf(dayNum) !== -1);
      var godzTydz = isSwieto ? "Msza w święto" : pobierzGodzineMszyWTygodniu(cache.currentYear, cache.currentMonthIdx, dayNum);
      return {
        maDyzur: true,
        typ: isSwieto ? "SWIETO" : "TYDZIEN",
        godzina: godzTydz,
        opis: isSwieto ? "dyżur w święto" : "dyżur w tygodniu"
      };
    }
    return { maDyzur: false };
  }

  // 3. Sobota (dow === 6)
  if (dow === 6) {
    var nextSunday = dayNum + 1;
    if (nextSunday <= cache.daysInMonth) {
      var uValNext = cache.allValues[userRow - 3][nextSunday - 1];
      if (uValNext === 0 || uValNext === "0") {
        return { maDyzur: false, powód: "usprawiedliwiony" };
      }
      var sobGodzina = wyznaczGodzineNiedzielnaMinistranta(userRow, cache.colBValues, cache.grupyGodziny);
      for (var szi = 0; szi < cache.zamianyNiedzieleList.length; szi++) {
        var zn = cache.zamianyNiedzieleList[szi];
        if (zn.dzien === nextSunday) {
          if (zn.wystawiajacy.indexOf(normName) !== -1 || normName.indexOf(zn.wystawiajacy) !== -1) {
            sobGodzina = zn.godzWzieta;
          } else if (zn.przejmujacy.indexOf(normName) !== -1 || normName.indexOf(zn.przejmujacy) !== -1) {
            sobGodzina = zn.godzOddana;
          }
        }
      }
      if (sobGodzina === "17:00") {
        return {
          maDyzur: true,
          typ: "SOBOTA",
          godzina: "17:00",
          opis: "Sobota wieczór"
        };
      }
    }
    return { maDyzur: false };
  }

  // 4. Niedziela (dow === 0)
  if (dow === 0) {
    var uValSun = cache.allValues[userRow - 3][dayNum - 1];
    if (uValSun === 0 || uValSun === "0") {
      return { maDyzur: false, powód: "usprawiedliwiony" };
    }
    var ndGodzina = wyznaczGodzineNiedzielnaMinistranta(userRow, cache.colBValues, cache.grupyGodziny);
    for (var nzi = 0; nzi < cache.zamianyNiedzieleList.length; nzi++) {
      var znd = cache.zamianyNiedzieleList[nzi];
      if (znd.dzien === dayNum) {
        if (znd.wystawiajacy.indexOf(normName) !== -1 || normName.indexOf(znd.wystawiajacy) !== -1) {
          ndGodzina = znd.godzWzieta;
        } else if (znd.przejmujacy.indexOf(normName) !== -1 || normName.indexOf(znd.przejmujacy) !== -1) {
          ndGodzina = znd.godzOddana;
        }
      }
    }
    if (ndGodzina && ndGodzina !== "17:00") {
      return {
        maDyzur: true,
        typ: "NIEDZIELA",
        godzina: ndGodzina,
        opis: "Niedziela"
      };
    }
    return { maDyzur: false };
  }

  return { maDyzur: false };
}

function czyMinistrantKwalifikujeSieDoOferty(nazwisko, filtrDanych, cache) {
  if (!nazwisko || !filtrDanych || !cache) return true;
  var norm = oczyscNazwiskoMinistranta(nazwisko).toLowerCase();

  if (filtrDanych.typOferty === "ZASTEPSTWO") {
    // Wolny dyżur do wzięcia na dany dzień:
    // Może wziąć TYLKO ten, kto NIE MA w tym dniu żadnej służby
    var dInfo = sprawdzCzyMinistrantMaDyzurWDniu(norm, filtrDanych.dzien, cache);
    return !dInfo.maDyzur;
  }

  if (filtrDanych.typOferty === "TYDZIEN") {
    // Wymiana 1:1 w tygodniu:
    // 1) Nie może mieć dyżuru w dniu oddawanym
    var dOddInfo = sprawdzCzyMinistrantMaDyzurWDniu(norm, filtrDanych.dzienOddawany, cache);
    if (dOddInfo.maDyzur) return false;

    // 2) Musi posiadać dyżur na przynajmniej jeden dzień z akceptowanych
    var akceptowane = filtrDanych.akceptowaneDni || [];
    var maKtorys = false;
    for (var ai = 0; ai < akceptowane.length; ai++) {
      var dAkc = akceptowane[ai];
      var dAkcInfo = sprawdzCzyMinistrantMaDyzurWDniu(norm, dAkc, cache);
      if (dAkcInfo.maDyzur) {
        maKtorys = true;
        break;
      }
    }
    return maKtorys;
  }

  if (filtrDanych.typOferty === "NIEDZIELA") {
    // Wymiana 1:1 w weekend:
    // Musi mieć dyżur na ten weekend w jednej z akceptowanych godzin
    var dSun = filtrDanych.dzien;
    var akcGodz = filtrDanych.akceptowaneGodziny || [];

    // Sobota 17:00
    var sobInfo = sprawdzCzyMinistrantMaDyzurWDniu(norm, dSun - 1, cache);
    if (sobInfo.maDyzur && akcGodz.indexOf("17:00") !== -1) return true;

    // Niedziela
    var ndInfo = sprawdzCzyMinistrantMaDyzurWDniu(norm, dSun, cache);
    if (ndInfo.maDyzur && akcGodz.indexOf(ndInfo.godzina) !== -1) return true;

    return false;
  }

  return true;
}

function wyslijPorannePrzypomnieniaOSluzbie(customDate) {
  var ss = pobierzAktywnyArkusz();
  var now = customDate || new Date();
  var cache = przygotujDaneHarmonogramu(ss);
  if (!cache) {
    console.warn("Brak arkusza bieżącego miesiąca dla porannych powiadomień.");
    return { sukces: false, wiadomosc: "Brak arkusza bieżącego miesiąca." };
  }

  var currentDay = now.getDate();
  var currentMonthIdx = now.getMonth();
  var currentYear = now.getFullYear();

  // 1. Sprawdzamy kto W OGÓLE w grafiku ma dzisiaj wyznaczoną służbę
  var wszyscyNaDyzurzeDzis = [];
  for (var normKey in cache.userRowMap) {
    var checkAll = sprawdzCzyMinistrantMaDyzurWDniu(normKey, currentDay, cache);
    if (checkAll.maDyzur) {
      var rowIdx = cache.userRowMap[normKey];
      var rawName = (cache.colBValues && cache.colBValues[rowIdx - 1]) ? cache.colBValues[rowIdx - 1][0] : normKey;
      var cleanName = oczyscNazwiskoMinistranta(rawName);
      wszyscyNaDyzurzeDzis.push(cleanName + " (" + checkAll.godzina + ")");
    }
  }

  var sheetTok = ss.getSheetByName("Powiadomienia_Tokeny");
  if (!sheetTok || sheetTok.getLastRow() < 2) {
    var infoBrak = "Raport poranny (" + currentDay + "." + (currentMonthIdx + 1 < 10 ? '0' : '') + (currentMonthIdx + 1) + "):\n\n"
      + "• Służbę na dziś mają w grafiku:\n  " + (wszyscyNaDyzurzeDzis.length > 0 ? wszyscyNaDyzurzeDzis.join("\n  ") : "Nikt nie ma dziś wyznaczonej służby") + "\n\n"
      + "ℹ️ Brak zarejestrowanych urządzeń w arkuszu Powiadomienia_Tokeny.";
    return { sukces: false, wiadomosc: infoBrak, wszyscyNaDyzurze: wszyscyNaDyzurzeDzis };
  }

  var tokenData = sheetTok.getRange(2, 1, sheetTok.getLastRow() - 1, 2).getValues();
  var wyslaneDo = [];
  var zarejestrowaniMinistranci = [];

  for (var i = 0; i < tokenData.length; i++) {
    var nazwisko = tokenData[i][0];
    var token = tokenData[i][1];
    if (!token || !nazwisko) continue;

    if (zarejestrowaniMinistranci.indexOf(nazwisko) === -1) {
      zarejestrowaniMinistranci.push(nazwisko);
    }

    var norm = oczyscNazwiskoMinistranta(nazwisko).toLowerCase();
    var sluzba = sprawdzCzyMinistrantMaDyzurWDniu(norm, currentDay, cache);

    if (sluzba.maDyzur) {
      var imie = nazwisko.trim().split(/\s+/)[0];
      var tytul = "Przypomnienie o służbie ⛪";
      var tresc = "Cześć " + imie + "! Dzisiaj masz dyżur na Mszy św. o godz. " + sluzba.godzina + ". Pamiętaj o przyjściu!";
      if (sluzba.typ === "ZASTEPSTWO") {
        tresc = "Cześć " + imie + "! Dzisiaj masz dyżur na Mszy św. o godz. " + sluzba.godzina + " (" + sluzba.opis + "). Pamiętaj o przyjściu!";
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

  console.log("Poranne przypomnienia wysłane do:", wyslaneDo);
  var wiadomoscWynik = "";
  if (wyslaneDo.length > 0) {
    wiadomoscWynik = "Wysłano przypomnienia o służbie do:\n" + wyslaneDo.join("\n");
  } else {
    wiadomoscWynik = "Raport poranny (" + currentDay + "." + (currentMonthIdx + 1 < 10 ? '0' : '') + (currentMonthIdx + 1) + "):\n\n"
      + "• Służbę na dzisiaj w grafiku mają:\n  " + (wszyscyNaDyzurzeDzis.length > 0 ? wszyscyNaDyzurzeDzis.join("\n  ") : "Brak osób na dzisiejszy dzień") + "\n\n"
      + "• Zarejestrowane telefony w aplikacji:\n  " + (zarejestrowaniMinistranci.length > 0 ? zarejestrowaniMinistranci.join(", ") : "brak") + "\n\n"
      + "ℹ️ Nikt z ministrantów mających dzisiaj służbę nie zarejestrował jeszcze telefonu. Przypomnienia wysyłają się automatycznie o godz. 7:00 tylko do osób pełniących służbę w danym dniu.\n\nAby sprawdzić jak wygląda powiadomienie na Twoim telefonie, wybierz z menu:\n'🧪 Wyślij testowe przypomnienie do mnie (symulacja)'.";
  }

  return {
    sukces: true,
    liczbaWyslanych: wyslaneDo.length,
    odbiorcy: wyslaneDo,
    wszyscyNaDyzurze: wszyscyNaDyzurzeDzis,
    zarejestrowani: zarejestrowaniMinistranci,
    wiadomosc: wiadomoscWynik
  };
}

function symulujPorannePrzypomnienieDlaMinistranta(nazwisko) {
  var ss = pobierzAktywnyArkusz();
  var sheetTok = ss.getSheetByName("Powiadomienia_Tokeny");
  if (!sheetTok || sheetTok.getLastRow() < 2) {
    return { sukces: false, wiadomosc: "Brak zarejestrowanych telefonów w arkuszu Powiadomienia_Tokeny." };
  }

  var tokenData = sheetTok.getRange(2, 1, sheetTok.getLastRow() - 1, 2).getValues();
  var targetName = (nazwisko || "").trim();
  var targetTokens = [];

  for (var i = 0; i < tokenData.length; i++) {
    var n = tokenData[i][0];
    var tok = tokenData[i][1];
    if (!tok) continue;
    if (!targetName || czyToTenSamMinistrant(n, targetName)) {
      targetTokens.push({ nazwisko: n, token: tok });
    }
  }

  if (targetTokens.length === 0) {
    return {
      sukces: false,
      wiadomosc: "Nie znaleziono zarejestrowanego telefonu dla: " + (targetName || "użytkownika") + ". Zaloguj się w aplikacji i włącz powiadomienia."
    };
  }

  var wyslano = 0;
  for (var j = 0; j < targetTokens.length; j++) {
    var imie = targetTokens[j].nazwisko.trim().split(/\s+/)[0];
    var tytul = "Przypomnienie o służbie ⛪";
    var tresc = "Cześć " + imie + "! Dzisiaj masz dyżur na Mszy św. o godz. 18:00. Pamiętaj o przyjściu! (Test symulacji)";
    var res = wyslijWiadomoscFCM(targetTokens[j].token, tytul, tresc, {
      widok: "pulpit",
      url: "https://ministranci.web.app/"
    });
    if (res && res.sukces) wyslano++;
  }

  return {
    sukces: wyslano > 0,
    wiadomosc: "Wysłano testowe przypomnienie o służbie (" + wyslano + " urządzeń)! Sprawdź swój telefon."
  };
}

function automatycznyZegarGieldy() {
  try {
    var ss = pobierzAktywnyArkusz();
    var now = new Date();
    var polishMonthsGenitive = [
      "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
      "lipca", "sierpnia", "września", "października", "listopada", "grudnia"
    ];
    var mGen = polishMonthsGenitive[now.getMonth()];
    przetworzWygasajaceOferty(ss, now.getFullYear(), now.getMonth(), now.getDate(), mGen);
  } catch (e) {
    console.warn("Błąd w automatycznyZegarGieldy:", e);
  }
}

function utworzWyzwalaczPoranny() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    var fn = triggers[i].getHandlerFunction();
    if (fn === "wyslijPorannePrzypomnieniaOSluzbie" || fn === "automatycznyZegarGieldy") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  // 1. Wyzwalacz codziennych przypomnień o 7:00 rano
  ScriptApp.newTrigger("wyslijPorannePrzypomnieniaOSluzbie")
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .nearMinute(0)
    .inTimezone("Europe/Warsaw")
    .create();

  // 2. Automatyczny zegar giełdy sprawdzający wygasające wymiany co 30 minut
  ScriptApp.newTrigger("automatycznyZegarGieldy")
    .timeBased()
    .everyMinutes(30)
    .create();

  return { sukces: true, wiadomosc: "Automatyczne wyzwalacze (przypomnienie o 7:00 oraz zegar giełdy co 30 minut) zostały pomyślnie utworzone!" };
}

function menuAktywujWyzwalaczPoranny() {
  var ui = SpreadsheetApp.getUi();
  var r = utworzWyzwalaczPoranny();
  ui.alert(r.wiadomosc);
}

function menuTestujPorannePrzypomnienia() {
  var ui = SpreadsheetApp.getUi();
  var r = wyslijPorannePrzypomnieniaOSluzbie();
  ui.alert(r.wiadomosc);
}

function menuSymulujPorannePrzypomnienie() {
  var ui = SpreadsheetApp.getUi();
  var r = symulujPorannePrzypomnienieDlaMinistranta("Maciej Erich");
  ui.alert(r.wiadomosc);
}

// =============================================================
// MENU W ARKUSZU I UNIWERSALNY GENERATOR NA KOLEJNY MIESIĄC
// =============================================================
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('Generator następnego miesiąca')
      .addItem('📅 Utwórz arkusz na kolejny miesiąc', 'menuUtworzKolejnyMiesiac')
      .addSeparator()
      .addItem('🔑 Autoryzuj uprawnienia PUSH (1 kliknięcie)', 'menuAutoryzujWysylkePowiadomien')
      .addItem('🔔 Skonfiguruj powiadomienia PUSH (Firebase)', 'menuSkonfigurujFirebase')
      .addItem('⏰ Aktywuj automatyczne powiadomienia (o 7:00 i zegar giełdy)', 'menuAktywujWyzwalaczPoranny')
      .addItem('🧪 Przetestuj poranne przypomnienia (sprawdź dzisiejszy dzień)', 'menuTestujPorannePrzypomnienia')
      .addItem('🧪 Wyślij testowe przypomnienie do mnie (symulacja dzisiejszej służby)', 'menuSymulujPorannePrzypomnienie')
      .addItem('🧪 Wyślij testowe powiadomienie PUSH do wszystkich', 'menuTestPushDoWszystkich')
      .addToUi();
  } catch (e) {
    // Ignoruj w środowisku bez aktywnego UI arkusza (np. wywołania webowe)
  }
}

function menuAutoryzujWysylkePowiadomien() {
  var ui = SpreadsheetApp.getUi();
  // Bezpośrednie wywołanie UrlFetchApp i ScriptApp bez try/catch wymusza okno dialogowe autoryzacji Google
  UrlFetchApp.fetch("https://www.google.com");
  ScriptApp.getProjectTriggers();
  ui.alert("Uprawnienia zostały pomyślnie nadane! Arkusz może teraz wysyłać powiadomienia PUSH oraz automatycznie wysyłać poranne przypomnienia o 7:00.");
}

function menuSkonfigurujFirebase() {
  var ui = SpreadsheetApp.getUi();
  var res = ui.prompt(
    "Konfiguracja Firebase PUSH",
    "Wklej całą zawartość pobranego pliku JSON klucza konta usługi Firebase:",
    ui.ButtonSet.OK_CANCEL
  );
  if (res.getSelectedButton() === ui.Button.OK) {
    var txt = res.getResponseText().trim();
    if (!txt) {
      ui.alert("Błąd: Nie podano zawartości klucza.");
      return;
    }
    try {
      var parsed = JSON.parse(txt);
      if (!parsed.client_email || !parsed.private_key) {
        ui.alert("Błąd: Plik JSON nie zawiera poprawnych pól (client_email, private_key).");
        return;
      }
      PropertiesService.getScriptProperties().setProperty("FIREBASE_SERVICE_ACCOUNT", txt);
      ui.alert("Sukces! Klucz Firebase został pomyślnie zapisany. Powiadomienia PUSH są aktywne!");
    } catch (e) {
      ui.alert("Błąd parsowania JSON: " + e.message);
    }
  }
}

function menuTestPushDoWszystkich() {
  var ui = SpreadsheetApp.getUi();
  var ss = pobierzAktywnyArkusz();
  var sheet = ss.getSheetByName("Powiadomienia_Tokeny");
  if (!sheet || sheet.getLastRow() < 2) {
    ui.alert("Brak zarejestrowanych urządzeń w arkuszu Powiadomienia_Tokeny. Włącz najpierw powiadomienia w aplikacji na telefonie!");
    return;
  }
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  var wyslane = 0;
  var ostatniBlad = "";
  for (var i = 0; i < data.length; i++) {
    var tok = data[i][1];
    if (tok) {
      var r = wyslijWiadomoscFCM(tok, "Test Powiadomień 🔔", "Powiadomienia w aplikacji ministrantów działają poprawnie!", { test: "true" });
      if (r && r.sukces) {
        wyslane++;
      } else if (r && r.wiadomosc) {
        ostatniBlad = r.wiadomosc;
      }
    }
  }
  if (wyslane > 0) {
    ui.alert("Sukces! Wysłano testowe powiadomienia do " + wyslane + " urządzeń.");
  } else {
    ui.alert("Nie udało się wysłać powiadomienia. Powód:\n" + (ostatniBlad || "Nieznany błąd"));
  }
}

function getColumnLetter(colIndex) {
  var temp = "";
  var letter = "";
  while (colIndex > 0) {
    temp = (colIndex - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    colIndex = Math.floor((colIndex - temp - 1) / 26);
  }
  return letter;
}

function menuUtworzKolejnyMiesiac() {
  var ui = SpreadsheetApp.getUi();
  try {
    var wynik = wykonajTworzenieKolejnegoMiesiaca(true);
    if (wynik.sukces) {
      ui.alert('Sukces!', wynik.wiadomosc, ui.ButtonSet.OK);
    } else if (wynik.anulowano) {
      // Użytkownik kliknął "Nie" lub Anuluj
    } else {
      ui.alert('Informacja', wynik.wiadomosc, ui.ButtonSet.OK);
    }
  } catch (err) {
    ui.alert('Błąd', 'Wystąpił błąd: ' + err.message, ui.ButtonSet.OK);
  }
}

function wykonajTworzenieKolejnegoMiesiaca(czyPytacUI) {
  var ss = pobierzAktywnyArkusz();
  var polskieMiesiace = [
    "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
    "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
  ];
  var polskieMiesiaceBezOgonkow = [
    "Styczen", "Luty", "Marzec", "Kwiecien", "Maj", "Czerwiec",
    "Lipiec", "Sierpien", "Wrzesien", "Pazdziernik", "Listopad", "Grudzien"
  ];

  // 1. Znajdź istniejące miesiące w skoroszycie
  var allSheets = ss.getSheets();
  var znalezioneMiesiace = [];

  for (var s = 0; s < allSheets.length; s++) {
    var sName = allSheets[s].getName();
    var match = sName.match(/^([A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ]+)_(\d{4})$/);
    if (match) {
      var mPart = match[1];
      var yPart = parseInt(match[2], 10);
      var mIdx = -1;

      for (var pm = 0; pm < 12; pm++) {
        if (mPart.toLowerCase() === polskieMiesiace[pm].toLowerCase() ||
            mPart.toLowerCase() === polskieMiesiaceBezOgonkow[pm].toLowerCase()) {
          mIdx = pm;
          break;
        }
      }

      if (mIdx !== -1) {
        znalezioneMiesiace.push({
          sheet: allSheets[s],
          name: sName,
          year: yPart,
          monthIdx: mIdx,
          timestamp: yPart * 12 + mIdx
        });
      }
    }
  }

  if (znalezioneMiesiace.length === 0) {
    return { sukces: false, wiadomosc: "Nie znaleziono w pliku żadnego arkusza miesiąca (np. Wrzesień_2026), który mógłby posłużyć za wzorzec." };
  }

  // Sortujemy od najnowszego do najstarszego
  znalezioneMiesiace.sort(function(a, b) { return b.timestamp - a.timestamp; });

  // Sprawdzamy czy użytkownik ma aktualnie otwarty konkretny miesiąc
  var aktywnyArkusz = ss.getActiveSheet();
  var aktywnyNazwa = aktywnyArkusz ? aktywnyArkusz.getName() : "";
  var bazowy = znalezioneMiesiace[0];

  for (var z = 0; z < znalezioneMiesiace.length; z++) {
    if (znalezioneMiesiace[z].name === aktywnyNazwa) {
      bazowy = znalezioneMiesiace[z];
      break;
    }
  }

  // Wyliczamy kolejny miesiąc i rok (np. po Wrzesień 2026 -> Październik 2026)
  var nastepnyMIdx = (bazowy.monthIdx + 1) % 12;
  var nastepnyRok = (bazowy.monthIdx === 11) ? bazowy.year + 1 : bazowy.year;
  var nastepnyNazwa = polskieMiesiace[nastepnyMIdx] + "_" + nastepnyRok;

  var istniejacy = ss.getSheetByName(nastepnyNazwa);
  if (istniejacy) {
    if (czyPytacUI) {
      var ui = SpreadsheetApp.getUi();
      var odpNadpisz = ui.alert(
        "Arkusz już istnieje",
        "Arkusz " + nastepnyNazwa + " już istnieje w tym pliku.\n\nCzy chcesz go USUNĄĆ i wygenerować na nowo z poprawkami?",
        ui.ButtonSet.YES_NO
      );
      if (odpNadpisz === ui.Button.YES) {
        ss.deleteSheet(istniejacy);
      } else {
        return { sukces: false, anulowano: true };
      }
    } else {
      ss.deleteSheet(istniejacy);
    }
  } else if (czyPytacUI) {
    var ui2 = SpreadsheetApp.getUi();
    var odp2 = ui2.alert(
      "Tworzenie nowego miesiąca",
      "Czy chcesz utworzyć arkusz na " + nastepnyNazwa + " na podstawie " + bazowy.name + "?",
      ui2.ButtonSet.YES_NO
    );
    if (odp2 !== ui2.Button.YES) {
      return { sukces: false, anulowano: true };
    }
  }

  return generujMiesiac(ss, bazowy.sheet, nastepnyNazwa, nastepnyRok, nastepnyMIdx);
}

function generujMiesiac(ss, bazowySheet, docelowaNazwa, docelowyRok, docelowyMIdx) {
  var polskieMiesiace = [
    "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
    "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
  ];
  var skrotyDni = ["ND", "PN", "WT", "ŚR", "CZW", "PT", "SOB"];

  // 1. Kopiowanie arkusza bazowego (zachowuje czcionki, szerokości, kolory i układ)
  var nowyArkusz = bazowySheet.copyTo(ss).setName(docelowaNazwa);
  ss.setActiveSheet(nowyArkusz);
  ss.moveActiveSheet(bazowySheet.getIndex() + 1);

  // Usuwanie ministrantów, którzy zrezygnowali ze służby (np. Mateusz Pokojski od nowego miesiąca)
  var nieaktywni = ["Mateusz Pokojski"];
  for (var u = 0; u < nieaktywni.length; u++) {
    var nieaktywny = nieaktywni[u].toLowerCase();
    var lastRScan = Math.min(nowyArkusz.getLastRow(), 45);
    var namesNowy = nowyArkusz.getRange(1, 2, lastRScan, 1).getValues();
    for (var rn = namesNowy.length - 1; rn >= 0; rn--) {
      var nVal = (namesNowy[rn][0] || "").toString().toLowerCase();
      if (nVal && nVal.indexOf(nieaktywny) !== -1) {
        nowyArkusz.deleteRow(rn + 1);
        Logger.log("Usunięto wiersz nieaktywnego ministranta w nowym arkuszu: " + nieaktywni[u] + " (wiersz " + (rn + 1) + ")");
      }
    }
  }

  // Renumeracja LP w kolumnie A i lokalizacja wiersza RANKING
  var curLp = 1;
  var scanR = Math.min(nowyArkusz.getLastRow(), 40);
  var colBScan = nowyArkusz.getRange(1, 2, scanR, 1).getValues();
  var rankingRow = 30;
  for (var sr = 2; sr < scanR; sr++) {
    var txtB = (colBScan[sr][0] || "").toString().trim().toUpperCase();
    if (txtB.indexOf("RANKING") !== -1) {
      rankingRow = sr + 1;
      break;
    }
    if (txtB.indexOf("GRUPA") !== -1) {
      curLp = 1;
    } else if (txtB.indexOf("SUMA") !== -1 || txtB.indexOf("#REF") !== -1 || txtB.indexOf("MINISTRANT") !== -1 || txtB.indexOf("ILOŚĆ") !== -1) {
      // Wiersz sumy lub nagłówka
    } else if (txtB) {
      nowyArkusz.getRange(sr + 1, 1).setValue(curLp);
      curLp++;
    }
  }

  // 2. Liczba dni w miesiącu bazowym i docelowym
  var dniWNowym = new Date(docelowyRok, docelowyMIdx + 1, 0).getDate();
  var bazowaNazwa = bazowySheet.getName();
  var bMatch = bazowaNazwa.match(/^([A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ]+)_(\d{4})$/);
  var bazoweDni = 30; // domyślnie
  var bY = docelowyRok;
  var bMIdx = (docelowyMIdx === 0) ? 11 : docelowyMIdx - 1;

  if (bMatch) {
    var bMpart = bMatch[1].toLowerCase();
    bY = parseInt(bMatch[2], 10);
    for (var m = 0; m < 12; m++) {
      if (bMpart === polskieMiesiace[m].toLowerCase() || bMpart.indexOf(polskieMiesiace[m].substring(0, 4).toLowerCase()) !== -1) {
        bMIdx = m;
        break;
      }
    }
    bazoweDni = new Date(bY, bMIdx + 1, 0).getDate();
  }

  var startCol = 4; // Kolumna D to dzień 1
  var staraSumaCol = startCol + bazoweDni; // Kolumna SUMA w bazowym arkuszu (np. 34 dla 30 dni)

  // 3. Dopasowanie kolumn kalendarza (np. przejście z 30 na 31 dni lub z 31 na 30)
  if (dniWNowym > bazoweDni) {
    var ileDodac = dniWNowym - bazoweDni;
    nowyArkusz.insertColumnsBefore(staraSumaCol, ileDodac);
    for (var ins = 0; ins < ileDodac; ins++) {
      var wstawionaCol = staraSumaCol + ins;
      nowyArkusz.setColumnWidth(wstawionaCol, nowyArkusz.getColumnWidth(staraSumaCol - 1));
      nowyArkusz.getRange(1, wstawionaCol, rankingRow, 1)
        .setHorizontalAlignment("center")
        .setVerticalAlignment("middle")
        .setBorder(true, true, true, true, true, true, "#d9d9d9", SpreadsheetApp.BorderStyle.SOLID);
      nowyArkusz.getRange(1, wstawionaCol, 2, 1).setFontWeight("bold");
    }
  } else if (dniWNowym < bazoweDni) {
    var ileUsunac = bazoweDni - dniWNowym;
    var odCol = startCol + dniWNowym;
    nowyArkusz.deleteColumns(odCol, ileUsunac);
  }

  var sumaCol = startCol + dniWNowym; // np. 4 + 31 = 35 (AI dla 31 dni)
  var firstDayLetter = getColumnLetter(startCol);
  var lastDayLetter = getColumnLetter(sumaCol - 1);
  var sumaColLetter = getColumnLetter(sumaCol);

  // 4. Nagłówki dni w wierszu 1 (numer dnia)
  for (var d = 1; d <= dniWNowym; d++) {
    var c = startCol + (d - 1);
    nowyArkusz.getRange(1, c).setValue(d);
  }

  // Nagłówek kolumny SUMA w wierszu 1
  nowyArkusz.getRange(1, sumaCol).setValue("SUMA");

  // 5. Pobieranie wzorca kolorów z arkusza bazowego
  var kolorNiedzieli = "#ffcccc";
  for (var bd = 1; bd <= bazoweDni; bd++) {
    var bdt = new Date(bY, bMIdx, bd);
    if (bdt.getDay() === 0) {
      kolorNiedzieli = bazowySheet.getRange(3, startCol + (bd - 1)).getBackground();
      break;
    }
  }

  // 6. Czyszczenie starych punktów obecności i notatek
  var gridNumRows = rankingRow - 3; // od wiersza 3 do tuż przed RANKING
  var dayRange = nowyArkusz.getRange(3, startCol, gridNumRows, dniWNowym);
  dayRange.clearContent();
  dayRange.clearNote();

  // 7. Malowanie teł kalendarza
  var colA = nowyArkusz.getRange(3, 1, gridNumRows, 1).getValues();
  var colC = nowyArkusz.getRange(3, 3, gridNumRows, 1).getValues();

  var noweTla = [];
  for (var rIdx = 0; rIdx < gridNumRows; rIdx++) {
    var rowBgs = [];
    var lpVal = parseInt(colA[rIdx][0], 10);
    var isMinistrant = !isNaN(lpVal);

    if (isMinistrant) {
      var stalyDzien = colC[rIdx][0].toString().trim().toUpperCase();
      var targetDOW = -1;
      if (stalyDzien.indexOf("PN") !== -1 || stalyDzien.indexOf("PON") !== -1) targetDOW = 1;
      else if (stalyDzien.indexOf("WT") !== -1) targetDOW = 2;
      else if (stalyDzien.indexOf("ŚR") !== -1 || stalyDzien.indexOf("SR") !== -1) targetDOW = 3;
      else if (stalyDzien.indexOf("CZ") !== -1) targetDOW = 4;
      else if (stalyDzien.indexOf("PT") !== -1) targetDOW = 5;

      var kolorDyzuru = "#ccffff";

      for (var d2 = 1; d2 <= dniWNowym; d2++) {
        var dt2 = new Date(docelowyRok, docelowyMIdx, d2);
        var curDOW = dt2.getDay();
        if (curDOW === 0) {
          rowBgs.push(kolorNiedzieli); // Niedziele na kolor niedzielny (różowy)
        } else if (curDOW >= 1 && curDOW <= 5 && curDOW === targetDOW) {
          rowBgs.push(kolorDyzuru); // Dzień stałego dyżuru na niebiesko
        } else {
          rowBgs.push("#ffffff");
        }
      }
    } else {
      for (var d3 = 1; d3 <= dniWNowym; d3++) {
        rowBgs.push("#ffffff");
      }
    }
    noweTla.push(rowBgs);
  }
  dayRange.setBackgrounds(noweTla);

  // 8. Aktualizacja formuł SUMA dla ministrantów
  for (var rIdx2 = 0; rIdx2 < gridNumRows; rIdx2++) {
    var rRow = 3 + rIdx2;
    var isMin = !isNaN(parseInt(colA[rIdx2][0], 10));
    if (isMin) {
      var rngStr = firstDayLetter + rRow + ":" + lastDayLetter + rRow;
      var fSuma = "=SUMPRODUCT(IF(ISNUMBER(" + rngStr + "); " + rngStr + "; IFERROR(VALUE(LEFT(" + rngStr + "; FIND(\"(\"; " + rngStr + ") - 1)); 0)))";
      nowyArkusz.getRange(rRow, sumaCol).setFormula(fSuma);
    }
  }

  // Dynamiczne formuły podsumowań grup
  var currentGrStart = 3;
  for (var sr2 = 2; sr2 < rankingRow - 1; sr2++) {
    var txtB2 = (colBScan[sr2][0] || "").toString().trim().toUpperCase();
    var rAct = sr2 + 1;
    if (txtB2.indexOf("GRUPA") !== -1) {
      currentGrStart = rAct + 1;
    } else if (txtB2 === "SUMA" || txtB2.indexOf("SUMA") === 0) {
      var grEnd = rAct - 1;
      if (grEnd >= currentGrStart) {
        nowyArkusz.getRange(rAct, sumaCol).setFormula("=SUM(" + sumaColLetter + currentGrStart + ":" + sumaColLetter + grEnd + ")");
      }
    }
  }

  // 9. Aktualizacja rankingu
  var rankingNazwa = "RANKING " + polskieMiesiace[docelowyMIdx].toUpperCase() + " " + docelowyRok;
  nowyArkusz.getRange(rankingRow, 2).setValue(rankingNazwa);

  // Formuła sortowania rankingu (wg kolumny SUMA)
  var lastGridRow = rankingRow - 1;
  var formulaRanking = "=SORT(FILTER({B2:B" + lastGridRow + "\\ " + sumaColLetter + "2:" + sumaColLetter + lastGridRow + "}; ISNUMBER(A2:A" + lastGridRow + ")); 2; FALSE)";
  nowyArkusz.getRange(rankingRow + 4, 2).setFormula(formulaRanking);

  // 10. Aktualizacja godzin grup w arkuszu Grafik_Niedziele (miesięczna rotacja)
  var sundaySheet = ss.getSheetByName("Grafik_Niedziele");
  if (sundaySheet) {
    var rotowane = wyznaczRotowaneGodzinyGrup(docelowyRok, docelowyMIdx);
    var gRange = sundaySheet.getRange("A2:B5");
    var gValues = gRange.getValues();
    for (var gi = 0; gi < gValues.length; gi++) {
      var grpName = (gValues[gi][0] || "").toString().trim();
      for (var rk in rotowane) {
        if (dopasujGrupe(grpName, rk)) {
          gValues[gi][1] = rotowane[rk];
          break;
        }
      }
    }
    gRange.setValues(gValues);
    Logger.log("Zaktualizowano arkusz Grafik_Niedziele na nowy miesiąc z rotacją: " + JSON.stringify(rotowane));
  }

  return {
    sukces: true,
    wiadomosc: "Arkusz " + docelowaNazwa + " został pomyślnie wygenerowany na podstawie " + bazowaNazwa + "!"
  };
}

function odpiszDyzurowMateuszaPokojskiego() {
  try {
    var ss = pobierzAktywnyArkusz();
    var sheet = ss.getSheetByName("Wrzesień_2026");
    if (!sheet) sheet = ss.getSheetByName("Wrzesien_2026");
    if (!sheet) return { sukces: false, wiadomosc: "Nie znaleziono arkusza Wrzesień_2026" };

    var maxRows = Math.min(sheet.getLastRow(), 45);
    var names = sheet.getRange(1, 2, maxRows, 1).getValues();
    var pokojskiRow = -1;
    for (var r = 0; r < names.length; r++) {
      if (names[r][0] && names[r][0].toString().toLowerCase().indexOf("pokojsk") !== -1) {
        pokojskiRow = r + 1;
        break;
      }
    }

    if (pokojskiRow === -1) {
      return { sukces: false, wiadomosc: "Nie znaleziono Mateusza Pokojskiego w arkuszu Wrzesień_2026" };
    }

    // Niedziele we wrześniu 2026: 6 (minęła), 13, 20, 27.
    // Kolumny: startCol = 4 (Dzień 1 = kolumna D = 4).
    // Dzień 13 = kolumna 16 (P)
    // Dzień 20 = kolumna 23 (W)
    // Dzień 27 = kolumna 30 (AD)
    var dniDoOdpisania = [13, 20, 27];
    for (var i = 0; i < dniDoOdpisania.length; i++) {
      var d = dniDoOdpisania[i];
      var col = 4 + d - 1;
      var cell = sheet.getRange(pokojskiRow, col);
      cell.setBackground("#ffffff");
      cell.clearContent();
      cell.setNote("Zrezygnował ze służby");
    }

    SpreadsheetApp.flush();

    // Natychmiastowa synchronizacja do Firestore stan_grafiku
    pobierzPelnaTabeleMiesiaca("Wrzesień_2026", ss);

    return {
      sukces: true,
      pokojskiRow: pokojskiRow,
      dniOdpisane: dniDoOdpisania,
      wiadomosc: "Pomyślnie zdjęto obowiązkowe dyżury niedzielne (13, 20, 27 września) dla Mateusza Pokojskiego i zaktualizowano bazę."
    };
  } catch (err) {
    Logger.log("Błąd odpiszDyzurowMateuszaPokojskiego: " + err.message);
    return { sukces: false, wiadomosc: err.message };
  }
}

function pobierzAktywnyArkusz() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    var form = FormApp.getActiveForm() || FormApp.openById("1mH1V-yJCWvrtC8JFb5qqybM6PHYlsCT65U4H48c178c");
    ss = SpreadsheetApp.openById(form.getDestinationId());
  }
  return ss;
}

function pobierzBiezacyArkuszMiesiaca(ss) {
  var now = new Date();
  var polishMonths = [
    "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
    "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
  ];
  var mName = polishMonths[now.getMonth()] + "_" + now.getFullYear();
  var sheet = ss.getSheetByName(mName);
  if (!sheet) {
    var alt = ["Styczen", "Luty", "Marzec", "Kwiecien", "Maj", "Czerwiec", "Lipiec", "Sierpien", "Wrzesien", "Pazdziernik", "Listopad", "Grudzien"];
    sheet = ss.getSheetByName(alt[now.getMonth()] + "_" + now.getFullYear());
  }
  return sheet;
}

function cleanTime(t) {
  if (!t) return '';
  if (t instanceof Date) {
    var h = t.getHours();
    var m = t.getMinutes();
    if (m === 24) m = 0;
    else if (m === 54) m = 30;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }
  var str = t.toString().trim();
  if (str.indexOf('19:24') !== -1) return '10:00';
  if (str.indexOf('20:24') !== -1) return '11:00';
  str = str.replace(/:24$/, ':00').replace(/:54$/, ':30');
  var match = str.match(/(?:^|\s)(\d{1,2}):(\d{2})/);
  if (match) {
    var h = parseInt(match[1], 10);
    var m = match[2];
    return (h < 10 ? '0' : '') + h + ':' + m;
  }
  return str;
}

function czyMszaJuzMinaDzis(godzinaStr) {
  if (!godzinaStr) return false;
  var parts = cleanTime(godzinaStr).split(":");
  if (parts.length < 2) return false;
  var h = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return false;
  var now = new Date();
  var massEndTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m + 45);
  return now.getTime() > massEndTime.getTime();
}

function dopasujGrupe(nazwa1, nazwa2) {
  var n1 = nazwa1.toLowerCase();
  var n2 = nazwa2.toLowerCase();
  if (n1 === n2 || n1.indexOf(n2) !== -1 || n2.indexOf(n1) !== -1) return true;
  var r = ["iv", "iii", "ii", "i"];
  for (var k = 0; k < r.length; k++) {
    var roman = r[k];
    var reg = new RegExp("(^|\\s|\\()" + roman + "(\\s|\\)|$)");
    if (reg.test(n1) && reg.test(n2)) return true;
  }
  return false;
}

function wyznaczRotowaneGodzinyGrup(rok, miesiacIdx) {
  var godzinyKolejnosc = ["08:30", "10:00", "11:30", "17:00"];
  // Baza: Wrzesień 2026 (rok = 2026, miesiacIdx = 8)
  // IV GRUPA (ŻÓŁTA) -> 08:30 (idx 0)
  // I GRUPA (CZERWONA) -> 10:00 (idx 1)
  // II GRUPA (POMARAŃCZOWA) -> 11:30 (idx 2)
  // III GRUPA (ZIELONA) -> 17:00 (idx 3)
  var r = (rok !== undefined && rok !== null) ? parseInt(rok, 10) : 2026;
  var m = (miesiacIdx !== undefined && miesiacIdx !== null) ? parseInt(miesiacIdx, 10) : 8;
  var diffMiesiace = (r - 2026) * 12 + (m - 8);
  var shift = ((diffMiesiace % 4) + 4) % 4;

  return {
    "I GRUPA (CZERWONA)": godzinyKolejnosc[(1 + shift) % 4],
    "II GRUPA (POMARAŃCZOWA)": godzinyKolejnosc[(2 + shift) % 4],
    "III GRUPA (ZIELONA)": godzinyKolejnosc[(3 + shift) % 4],
    "IV GRUPA (ŻÓŁTA)": godzinyKolejnosc[(0 + shift) % 4]
  };
}

// ==========================================
// AUTOMATYCZNE CZYSZCZENIE STARYCH ZAMIAN
// ==========================================
function sprawdzICzyscStareZamiany(ss) {
  try {
    var props = PropertiesService.getScriptProperties();
    var dzisStr = Utilities.formatDate(new Date(), "Europe/Warsaw", "yyyy-MM-dd");
    var lastClean = props.getProperty("DATA_OSTATNIEGO_CZYSZCZENIA");
    if (lastClean !== dzisStr) {
      wyczyscStareZamiany(ss);
      props.setProperty("DATA_OSTATNIEGO_CZYSZCZENIA", dzisStr);
    }
  } catch (e) {
    console.error("Błąd podczas czyszczenia starych zamian: " + e);
  }
}

function wyczyscStareZamiany(optionalSs) {
  var ss = optionalSs || pobierzAktywnyArkusz();
  var biezacyArkusz = pobierzBiezacyArkuszMiesiaca(ss);
  if (!biezacyArkusz) return;
  var biezacyMiesiacNazwa = biezacyArkusz.getName();
  var now = new Date();
  var dzisDzien = now.getDate();

  // 1. Czyszczenie Zamiany_Tydzien
  var tSheet = ss.getSheetByName("Zamiany_Tydzien");
  if (tSheet && tSheet.getLastRow() > 1) {
    var lastRowT = tSheet.getLastRow();
    var tData = tSheet.getRange(2, 1, lastRowT - 1, 8).getDisplayValues();
    var zachowaneT = [];
    for (var i = 0; i < tData.length; i++) {
      var rowT = tData[i];
      var miesiacT = rowT[1].toString().trim();
      var dzienT = parseInt(rowT[2], 10);
      var statusT = rowT[7].toString().trim();

      // Jeśli rekord jest z innego/poprzedniego miesiąca -> usuwamy
      if (miesiacT !== biezacyMiesiacNazwa) continue;
      // Anulowane -> usuwamy od razu
      if (statusT === "ANULOWANA") continue;
      // Oczekujące z przeszłości -> usuwamy od razu (termin minął, nikt nie wziął)
      if (statusT === "OCZEKUJE" && dzienT < dzisDzien) continue;
      // Zaakceptowane starsze niż 7 dni -> usuwamy
      if (statusT === "ZAAKCEPTOWANA" && dzienT < (dzisDzien - 7)) continue;

      zachowaneT.push(rowT);
    }

    if (zachowaneT.length !== tData.length) {
      tSheet.getRange(2, 1, lastRowT - 1, 8).clearContent();
      if (zachowaneT.length > 0) {
        tSheet.getRange(2, 1, zachowaneT.length, 8).setValues(zachowaneT);
      }
    }
  }

  // 2. Czyszczenie Zamiany_Niedziele
  var nSheet = ss.getSheetByName("Zamiany_Niedziele");
  if (nSheet && nSheet.getLastRow() > 1) {
    var lastRowN = nSheet.getLastRow();
    var nData = nSheet.getRange(2, 1, lastRowN - 1, 9).getDisplayValues();
    var zachowaneN = [];
    for (var j = 0; j < nData.length; j++) {
      var rowN = nData[j];
      var miesiacN = rowN[1].toString().trim();
      var dzienN = parseInt(rowN[2], 10);
      var statusN = rowN[8].toString().trim();

      if (miesiacN !== biezacyMiesiacNazwa) continue;
      if (statusN === "ANULOWANA") continue;
      if (statusN === "OCZEKUJE" && dzienN < dzisDzien) continue;
      if (statusN === "ZAAKCEPTOWANA" && dzienN < (dzisDzien - 7)) continue;

      zachowaneN.push(rowN);
    }

    if (zachowaneN.length !== nData.length) {
      nSheet.getRange(2, 1, lastRowN - 1, 9).clearContent();
      if (zachowaneN.length > 0) {
        nSheet.getRange(2, 1, zachowaneN.length, 9).setValues(zachowaneN);
      }
    }
  }

  // 3. Czyszczenie Zamiany_Zastepstwa
  var zSheet = ss.getSheetByName("Zamiany_Zastepstwa");
  var logSheet = ss.getSheetByName("Logi_Zakrystia");
  if (!logSheet) {
    try {
      logSheet = ss.insertSheet("Logi_Zakrystia");
      logSheet.appendRow(["Czas Wpisu", "Data Służby", "Godzina", "Liturgia", "Ministrant", "Status", "Typ", "Punkty", "Zastępuje", "Wpisał"]);
      logSheet.getRange("A1:J1").setFontWeight("bold").setBackground("#d9ead3");
    } catch(eLogSh) {}
  }
  if (zSheet && zSheet.getLastRow() > 1) {
    var lastRowZ = zSheet.getLastRow();
    var zData = zSheet.getRange(2, 1, lastRowZ - 1, 10).getDisplayValues();
    var zachowaneZ = [];
    for (var m = 0; m < zData.length; m++) {
      var rowZ = zData[m];
      var miesiacZ = rowZ[1].toString().trim();
      var dzienZ = parseInt(rowZ[2], 10);
      var statusZ = rowZ[7].toString().trim();

      if (miesiacZ && miesiacZ !== biezacyMiesiacNazwa) continue;
      if (statusZ === "ANULOWANA") continue;
      if (statusZ === "OCZEKUJE" && dzienZ < dzisDzien) continue;
      if ((statusZ === "PRZEJETE" || statusZ === "ZREALIZOWANE" || statusZ === "NIESTAWIONY") && dzienZ < (dzisDzien - 7)) continue;

      zachowaneZ.push(rowZ);
    }

    if (zachowaneZ.length !== zData.length) {
      zSheet.getRange(2, 1, lastRowZ - 1, 10).clearContent();
      if (zachowaneZ.length > 0) {
        zSheet.getRange(2, 1, zachowaneZ.length, 10).setValues(zachowaneZ);
      }
    }
  }
}

// ==========================================
// JEDNO ZBIORCZE ZAPYTANIE INICJALIZUJĄCE (SZYBKI START)
// ==========================================
function inicjalizujAplikacje(nazwisko, pin) {
  var ss = pobierzAktywnyArkusz();
  sprawdzICzyscStareZamiany(ss);
  var users = pobierzListeUzytkownikow(ss);

  if (!nazwisko || !pin) {
    return { sukces: true, users: users, zalogowano: false };
  }

  var auth = weryfikujLubUstawPin(nazwisko, pin, ss);
  if (!auth.sukces) {
    return { sukces: true, users: users, zalogowano: false, bladAuth: auth.wiadomosc };
  }

  var stan = pobierzStanDanych(nazwisko, pin, ss, true);
  return { sukces: true, users: users, zalogowano: true, stan: stan };
}

function logowanieIStan(nazwisko, pin) {
  var ss = pobierzAktywnyArkusz();
  var auth = weryfikujLubUstawPin(nazwisko, pin, ss);
  if (!auth.sukces) {
    return auth;
  }
  var stan = pobierzStanDanych(nazwisko, pin, ss, true);
  return { sukces: true, tryb: auth.tryb, stan: stan };
}

function pobierzListeUzytkownikow(optionalSs) {
  var ss = optionalSs || pobierzAktywnyArkusz();
  var uSheet = ss.getSheetByName("Uzytkownicy");
  if (!uSheet) return [];
  var lastRow = uSheet.getLastRow();
  
  var list = [];
  var hasKoscielny = false;
  if (lastRow >= 2) {
    var data = uSheet.getRange(2, 1, lastRow - 1, 2).getDisplayValues();
    for (var i = 0; i < data.length; i++) {
      var name = data[i][0].toString().trim();
      var pinVal = data[i][1].toString().trim();
      var hasPin = pinVal.length > 0;
      if (name) {
        if (name.toLowerCase() === "kościelny" || name.toLowerCase() === "koscielny") {
          hasKoscielny = true;
        }
        list.push({ nazwisko: name, maPin: hasPin, pin: pinVal });
      }
    }
  }

  // Jeśli konto Kościelny jeszcze nie istnieje w arkuszu Uzytkownicy, dodajemy je bez PINu
  if (!hasKoscielny) {
    uSheet.appendRow(["Kościelny", ""]);
    list.push({ nazwisko: "Kościelny", maPin: false, pin: "" });
  }

  return list;
}

function weryfikujLubUstawPin(nazwisko, pin, optionalSs) {
  var ss = optionalSs || pobierzAktywnyArkusz();
  var uSheet = ss.getSheetByName("Uzytkownicy");
  if (!uSheet) return { sukces: false, wiadomosc: "Brak zakładki Uzytkownicy." };

  var data = uSheet.getRange(2, 1, uSheet.getLastRow() - 1, 2).getDisplayValues();
  for (var i = 0; i < data.length; i++) {
    var rowName = data[i][0].toString().trim();
    if (rowName.toLowerCase() === nazwisko.trim().toLowerCase()) {
      var savedPin = data[i][1].toString().trim();
      var targetRow = i + 2;

      if (savedPin === "") {
        if (!/^\d{4}$/.test(pin)) {
          return { sukces: false, wiadomosc: "PIN musi składać się dokładnie z 4 cyfr." };
        }
        uSheet.getRange(targetRow, 2).setValue("'" + pin);
        return { sukces: true, tryb: "USTAWIONO" };
      }

      if (savedPin === pin.toString().trim()) {
        return { sukces: true, tryb: "ZALOGOWANO" };
      } else {
        return { sukces: false, wiadomosc: "Błędny kod PIN." };
      }
    }
  }
  return { sukces: false, wiadomosc: "Nie znaleziono użytkownika." };
}

function wyznaczDniTygodnia(rok, miesiacIdx, dzien, dniSwiateczne) {
  var d = new Date(rok, miesiacIdx, dzien);
  var dayOfWeek = d.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return [];
  
  var mondayDiff = dayOfWeek - 1;
  var fridayDiff = 5 - dayOfWeek;
  var poniedzialek = dzien - mondayDiff;
  var piatek = dzien + fridayDiff;
  
  var dniSw = dniSwiateczne || [];
  var dni = [];
  for (var x = poniedzialek; x <= piatek; x++) {
    if (x > 0 && x <= 31 && x !== dzien && dniSw.indexOf(x) === -1) {
      dni.push(x);
    }
  }
  return dni;
}

function pobierzStanDanych(nazwisko, pin, optionalSs, skipAuth) {
  var ss = optionalSs || pobierzAktywnyArkusz();
  if (!skipAuth) {
    var auth = weryfikujLubUstawPin(nazwisko, pin, ss);
    if (!auth.sukces) return auth;
  }

  var mSheet = pobierzBiezacyArkuszMiesiaca(ss);
  if (!mSheet) return { sukces: false, wiadomosc: "Brak arkusza bieżącego miesiąca." };

  var now = new Date();
  var currentMonthIdx = now.getMonth();
  var currentYear = now.getFullYear();
  var currentDay = now.getDate();
  var daysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();

  var polishMonthsGenitive = [
    "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
    "lipca", "sierpnia", "września", "października", "listopada", "grudnia"
  ];
  var currentMonthNameGenitive = polishMonthsGenitive[currentMonthIdx];

  var maxRows = Math.min(mSheet.getLastRow(), 32);
  var colBValues = mSheet.getRange(1, 2, maxRows, 1).getValues();

  var userRow = -1;
  var targetNameLower = nazwisko.trim().toLowerCase();

  for (var r = 2; r < maxRows; r++) {
    var cellName = colBValues[r][0].toString().trim().toLowerCase();
    if (cellName.indexOf(targetNameLower) !== -1) {
      userRow = r + 1;
      break;
    }
  }

  // Odczytujemy cale spektrum teł w miesiacu, aby wykryc kolumny ze swietem / uroczystoscia
  var allBackgrounds = mSheet.getRange(3, 4, maxRows - 2, daysInMonth).getBackgrounds();
  var dniSwiateczne = [];

  for (var dIdx = 0; dIdx < daysInMonth; dIdx++) {
    var testDateH = new Date(currentYear, currentMonthIdx, dIdx + 1);
    var dDay = testDateH.getDay();
    if (dDay >= 1 && dDay <= 5) {
      var koloroweWiersze = 0;
      for (var rowI = 0; rowI < allBackgrounds.length; rowI++) {
        var cBg = allBackgrounds[rowI][dIdx].toLowerCase();
        if (cBg !== "#ffffff" && cBg !== "" && cBg !== "transparent") {
          koloroweWiersze++;
        }
      }
      // Jesli w kolumnie wiecej niz 6 osob ma kolor (np. zlota kolumna swieta dla wszystkich), to jest to uroczystosc, nie dyzur pojedynczy
      if (koloroweWiersze >= 6) {
        dniSwiateczne.push(dIdx + 1);
      }
    }
  }

  var mojeDyzuryTydzien = [];
  if (userRow !== -1) {
    var userBgs = allBackgrounds[userRow - 3];
    for (var d = 0; d < daysInMonth; d++) {
      var bg = userBgs[d].toLowerCase();
      var testDate = new Date(currentYear, currentMonthIdx, d + 1);
      var dayOfWeek = testDate.getDay();
      var dayNum = d + 1;

      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // Ignorujemy dni swiateczne
        if (dniSwiateczne.indexOf(dayNum) === -1) {
          if (bg !== "#ffffff" && bg !== "" && bg !== "transparent") {
            mojeDyzuryTydzien.push(dayNum);
          }
        }
      }
    }
  }

  var sundaySheet = ss.getSheetByName("Grafik_Niedziele");
  var mojaGodzinaNiedziela = "";
  if (sundaySheet && userRow !== -1) {
    var groups = {
      "I GRUPA (CZERWONA)": [3, 4, 5, 6],
      "II GRUPA (POMARAŃCZOWA)": [8, 9, 10, 11, 12],
      "III GRUPA (ZIELONA)": [14, 15, 16, 17, 18, 19],
      "IV GRUPA (ŻÓŁTA)": [21, 22, 23, 24, 25, 26]
    };
    var mojaGrupa = "";
    for (var g in groups) {
      if (groups[g].indexOf(userRow) !== -1) {
        mojaGrupa = g;
        break;
      }
    }

    if (!mojaGrupa) {
      for (var bRow = userRow - 2; bRow >= 1; bRow--) {
        var valH = colBValues[bRow][0].toString().trim();
        if (valH.toUpperCase().indexOf("GRUPA") !== -1) {
          mojaGrupa = valH;
          break;
        }
      }
    }

    if (!mojaGrupa && nazwisko) {
      mojaGrupa = wyznaczGrupeParafialna(nazwisko, "");
    }

    if (currentMonthIdx === 8 && currentYear === 2026) {
      var gData = sundaySheet.getRange("A2:B5").getDisplayValues();
      for (var gIdx = 0; gIdx < gData.length; gIdx++) {
        if (dopasujGrupe(gData[gIdx][0].toString().trim(), mojaGrupa)) {
          mojaGodzinaNiedziela = cleanTime(gData[gIdx][1]);
          break;
        }
      }
    }
  }

  if (!mojaGodzinaNiedziela && userRow !== -1 && nazwisko) {
    var rotStan = wyznaczRotowaneGodzinyGrup(currentYear, currentMonthIdx);
    for (var rgs in rotStan) {
      if (dopasujGrupe(rgs, mojaGrupa)) {
        mojaGodzinaNiedziela = rotStan[rgs];
        break;
      }
    }
    if (!mojaGodzinaNiedziela) {
      var fallbackGrupa = wyznaczGrupeParafialna(nazwisko, "");
      for (var rfb in rotStan) {
        if (dopasujGrupe(rfb, fallbackGrupa)) {
          mojaGodzinaNiedziela = rotStan[rfb];
          break;
        }
      }
    }
    if (!mojaGodzinaNiedziela) mojaGodzinaNiedziela = "10:00";
  }

  var godzinyWeekendy = {};
  var userRowValues = (userRow !== -1) ? mSheet.getRange(userRow, 4, 1, daysInMonth).getValues()[0] : [];
  for (var dayCheck = 1; dayCheck <= daysInMonth; dayCheck++) {
    var dtCheck = new Date(currentYear, currentMonthIdx, dayCheck);
    if (dtCheck.getDay() === 0) {
      var uVal = userRowValues[dayCheck - 1];
      var isUspraw = (uVal === 0 || uVal === "0");
      godzinyWeekendy[dayCheck] = {
        godzina: mojaGodzinaNiedziela,
        czyZamienione: false,
        szczegoly: "",
        czyUsprawiedliwiony: isUspraw
      };
    }
  }

  var nSheet = ss.getSheetByName("Zamiany_Niedziele");
  if (nSheet && nSheet.getLastRow() > 1) {
    var nDataAll = nSheet.getRange(2, 1, nSheet.getLastRow() - 1, 9).getDisplayValues();
    for (var k = 0; k < nDataAll.length; k++) {
      var rowMonth = nDataAll[k][1];
      var sunDay = parseInt(nDataAll[k][2], 10);
      var wyst = nDataAll[k][3].toString().trim().toLowerCase();
      var godzOddana = cleanTime(nDataAll[k][4]);
      var przej = nDataAll[k][6].toString().trim().toLowerCase();
      var godzWzieta = cleanTime(nDataAll[k][7]);
      var status = nDataAll[k][8].toString().trim();

      if (status === "ZAAKCEPTOWANA" && rowMonth === mSheet.getName() && godzinyWeekendy[sunDay]) {
        if (wyst && (wyst.indexOf(targetNameLower) !== -1 || targetNameLower.indexOf(wyst) !== -1)) {
          godzinyWeekendy[sunDay] = {
            godzina: godzWzieta,
            czyZamienione: true,
            szczegoly: "zamiana z " + nDataAll[k][6]
          };
        } else if (przej && (przej.indexOf(targetNameLower) !== -1 || targetNameLower.indexOf(przej) !== -1)) {
          godzinyWeekendy[sunDay] = {
            godzina: godzOddana,
            czyZamienione: true,
            szczegoly: "zamiana z " + nDataAll[k][3]
          };
        }
      }
    }
  }

  // 1. Przetworzenie ofert 1:1, których termin wygasł (auto-konwersja na wolne dyżury +4 pkt)
  przetworzWygasajaceOferty(ss, currentYear, currentMonthIdx, currentDay, currentMonthNameGenitive);

  var gieldaTydzien = [];
  var tSheet = ss.getSheetByName("Zamiany_Tydzien");
  if (tSheet && tSheet.getLastRow() > 1) {
    var nowObj = new Date();
    var tLastCol = Math.max(tSheet.getLastColumn(), 10);
    var tData = tSheet.getRange(2, 1, tSheet.getLastRow() - 1, tLastCol).getDisplayValues();
    for (var t = 0; t < tData.length; t++) {
      var dOdd = parseInt(tData[t][2], 10);
      var tStatus = tData[t][7].trim();
      if (tStatus === "OCZEKUJE" && dOdd >= currentDay && dniSwiateczne.indexOf(dOdd) === -1) {
        var akceptowaneRaw = tData[t][4].toString().replace(/'/g, '').split(/[,;]/);
        var akceptowaneDni = [];
        for (var a = 0; a < akceptowaneRaw.length; a++) {
          var num = parseInt(akceptowaneRaw[a].trim(), 10);
          if (!isNaN(num)) {
            // Sprawdzamy czy ten dzień w zamian jeszcze nie minął (cutoff)
            var cutoffDay = obliczCutoffDlaDnia(currentYear, currentMonthIdx, num);
            if (nowObj.getTime() < cutoffDay.getTime()) {
              akceptowaneDni.push(num);
            }
          }
        }

        // Jeśli zostały jakieś aktywne dni
        if (akceptowaneDni.length > 0) {
          var godzOdd = pobierzGodzineMszyWTygodniu(currentYear, currentMonthIdx, dOdd);
          var godzNazwa = pobierzPelnaNazweMszyWTygodniu(currentYear, currentMonthIdx, dOdd);
          var autoOddVal = tData[t][9] ? tData[t][9].trim().toUpperCase() : "TAK";

          // Obliczamy najwcześniejszy cutoff
          var cutoffDlaOddawanego = obliczCutoffPrzedWlasnaMsza(currentYear, currentMonthIdx, dOdd);
          var minCutoffTime = cutoffDlaOddawanego.getTime();
          for (var cIdx = 0; cIdx < akceptowaneDni.length; cIdx++) {
            var cTime = obliczCutoffDlaDnia(currentYear, currentMonthIdx, akceptowaneDni[cIdx]).getTime();
            if (cTime < minCutoffTime) minCutoffTime = cTime;
          }
          var minCutoffDate = new Date(minCutoffTime);
          var polishDayNames = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];
          var waznaDoStr = polishDayNames[minCutoffDate.getDay()] + " " + minCutoffDate.getDate() + " " + currentMonthNameGenitive + " godz. " + (minCutoffDate.getHours() < 10 ? '0' : '') + minCutoffDate.getHours() + ":" + (minCutoffDate.getMinutes() < 10 ? '0' : '') + minCutoffDate.getMinutes();

          gieldaTydzien.push({
            id: tData[t][0],
            dzienOddawany: dOdd,
            godzina: godzOdd,
            nazwaMszy: godzNazwa,
            wystawiajacy: tData[t][3],
            akceptowaneDni: akceptowaneDni,
            autoOddaj: (autoOddVal !== "NIE" && autoOddVal !== "FALSE"),
            waznaDo: waznaDoStr
          });
        }
      }
    }
  }

  var gieldaNiedziele = [];
  if (nSheet && nSheet.getLastRow() > 1) {
    var nData = nSheet.getRange(2, 1, nSheet.getLastRow() - 1, 9).getDisplayValues();
    for (var n = 0; n < nData.length; n++) {
      var dSun = parseInt(nData[n][2], 10);
      if (nData[n][8] === "OCZEKUJE" && dSun >= currentDay) {
        gieldaNiedziele.push({
          id: nData[n][0],
          dzien: dSun,
          wystawiajacy: nData[n][3],
          godzinaOddawana: cleanTime(nData[n][4]),
          akceptowaneGodziny: nData[n][5].toString().replace(/'/g, '').split(/[,;]/).map(function(s) { return cleanTime(s); }).filter(function(s) { return s.length > 0; })
        });
      }
    }
  }

  var wolneZastepstwa = [];
  var mojeOddaneZastepstwa = {};
  var mojePrzejeteZastepstwa = {};
  var zSheet = ss.getSheetByName("Zamiany_Zastepstwa");
  if (zSheet && zSheet.getLastRow() > 1) {
    var zDataAll = zSheet.getRange(2, 1, zSheet.getLastRow() - 1, 10).getDisplayValues();
    for (var zi = 0; zi < zDataAll.length; zi++) {
      var zRow = zDataAll[zi];
      var zId = zRow[0];
      var zArk = zRow[1];
      var zDay = parseInt(zRow[2], 10);
      var zOdd = zRow[3];
      var zPrzej = zRow[4];
      var zGodz = cleanTime(zRow[5]);
      var zTyp = zRow[6] || "Tydzień";
      var zStat = zRow[7].trim();

      if (zStat === "ANULOWANA") continue;

      var oddNorm = oczyscNazwiskoMinistranta(zOdd).toLowerCase();
      var przejNorm = oczyscNazwiskoMinistranta(zPrzej).toLowerCase();
      var isMeOdd = !!(oddNorm && (oddNorm === targetNameLower || oddNorm.indexOf(targetNameLower) !== -1 || targetNameLower.indexOf(oddNorm) !== -1));
      var isMePrzej = !!(przejNorm && (przejNorm === targetNameLower || przejNorm.indexOf(targetNameLower) !== -1 || targetNameLower.indexOf(przejNorm) !== -1));

      if (isMeOdd) {
        mojeOddaneZastepstwa[zDay] = {
          id: zId,
          status: zStat,
          przejmujacy: zPrzej,
          godzina: zGodz,
          typ: zTyp
        };
      }

      if (isMePrzej && (zStat === "PRZEJETE" || zStat === "ZREALIZOWANE" || zStat === "NIESTAWIONY")) {
        mojePrzejeteZastepstwa[zDay] = {
          id: zId,
          status: zStat,
          oddajacy: zOdd,
          godzina: zGodz,
          typ: zTyp
        };
      }

      var czyMineloDzis = (zDay === currentDay && czyMszaJuzMinaDzis(zGodz));
      if (zStat === "OCZEKUJE" && zDay >= currentDay && !czyMineloDzis && zTyp === "Tydzień") {
        var dtZ = new Date(currentYear, currentMonthIdx, zDay);
        var polishDayNames = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];
        wolneZastepstwa.push({
          id: zId,
          dzien: zDay,
          dzienTygodnia: polishDayNames[dtZ.getDay()],
          oddajacy: zOdd,
          godzina: zGodz,
          typ: "Tydzień",
          czyMoje: isMeOdd,
          punkty: 4
        });
      }
    }
  }

  // Sortujemy wolne zastępstwa po dniu rosnąco
  wolneZastepstwa.sort(function(a, b) { return a.dzien - b.dzien; });

  for (var dKey in godzinyWeekendy) {
    var dInt = parseInt(dKey, 10);
    if (mojeOddaneZastepstwa[dInt] && (mojeOddaneZastepstwa[dInt].status === "OCZEKUJE" || mojeOddaneZastepstwa[dInt].status === "PRZEJETE" || mojeOddaneZastepstwa[dInt].status === "ZREALIZOWANE")) {
      godzinyWeekendy[dInt].czyUsprawiedliwiony = true;
    }
  }

  var rankingiInfo = obliczRankingiIPunkty(ss, nazwisko, currentYear, currentMonthIdx);
  var najblizszaSluzba = wyznaczNajblizszaSluzba(currentYear, currentMonthIdx, currentDay, daysInMonth, mojeDyzuryTydzien, godzinyWeekendy, currentMonthNameGenitive, mojeOddaneZastepstwa, mojePrzejeteZastepstwa);

  return {
    sukces: true,
    nazwisko: nazwisko,
    rok: currentYear,
    miesiacIdx: currentMonthIdx,
    dzisDzien: currentDay,
    nazwaMiesiaca: currentMonthNameGenitive,
    daysInMonth: daysInMonth,
    dniSwiateczne: dniSwiateczne,
    mojeDyzuryTydzien: mojeDyzuryTydzien,
    mojaGodzinaNiedziela: mojaGodzinaNiedziela,
    godzinyWeekendy: godzinyWeekendy,
    gieldaTydzien: gieldaTydzien,
    gieldaNiedziele: gieldaNiedziele,
    wolneZastepstwa: wolneZastepstwa,
    mojeOddaneZastepstwa: mojeOddaneZastepstwa,
    mojePrzejeteZastepstwa: mojePrzejeteZastepstwa,
    punktyMiesiac: rankingiInfo.punktyMiesiac,
    pozycjaMiesiac: rankingiInfo.pozycjaMiesiac,
    punktyOdPoczatkuRoku: rankingiInfo.punktyOdPoczatkuRoku,
    pozycjaRok: rankingiInfo.pozycjaRok,
    punktyMinusoweSuma: rankingiInfo.punktyMinusoweSuma,
    liturgieDodatkowe: pobierzWszystkieLiturgieDodatkowe(ss),
    historiaWpisow: pobierzHistorieWpisowZakrystii(ss, 60),
    pozycjaMinusy: rankingiInfo.pozycjaMinusy,
    rankingMiesiac: rankingiInfo.rankingMiesiac,
    rankingRok: rankingiInfo.rankingRok,
    rankingMinusy: rankingiInfo.rankingMinusy,
    szczegolyMinusow: rankingiInfo.szczegolyMinusow || [],
    punktyPoMiesiacach: rankingiInfo.punktyPoMiesiacach || [],
    rankingiMiesiecy: rankingiInfo.rankingiMiesiecy || {},
    najblizszaSluzba: najblizszaSluzba
  };
}

function oczyscNazwiskoMinistranta(raw) {
  if (!raw) return "";
  var s = raw.toString().trim();
  // Usuwamy dopiski ról po myślniku lub w nawiasie (np. " - Młodszy Ministrant", " - Lektor", itp.)
  s = s.replace(/\s*[-–—]\s*(Młodszy\s+Ministrant|Starszy\s+Ministrant|Młodszy|Starszy|Lektor|Kandydat|Ceremoniarz|Prezes|Animator|Ministrant).*$/gi, "");
  s = s.replace(/\s*\((Młodszy\s+Ministrant|Starszy\s+Ministrant|Młodszy|Starszy|Lektor|Kandydat|Ceremoniarz|Prezes|Animator|Ministrant).*?\)/gi, "");
  s = s.trim();
  // Korekta literówek
  s = s.replace(/\bBytner\b/gi, "Brytner");
  s = s.replace(/\bPrszczółkowski\b/gi, "Pszczółkowski");
  return s;
}

function wyciagnijStopienMinistranta(raw) {
  if (!raw) return { stopien: "Młodszy ministrant", ranga: 2 };
  var s = raw.toString().trim();
  // Hierarchia:
  // 1. Animator (5 - najwyżej)
  // 2. Lektor (4)
  // 3. Starszy ministrant (3)
  // 4. Młodszy ministrant / Ministrant (2)
  // 5. Kandydat (1 - najniżej)
  if (/\b(animator|prezes|ceremoniarz)\b/i.test(s)) {
    return { stopien: "Animator", ranga: 5 };
  }
  if (/\blektor\b/i.test(s)) {
    return { stopien: "Lektor", ranga: 4 };
  }
  if (/\bstarszy(\s+ministrant)?\b/i.test(s)) {
    return { stopien: "Starszy ministrant", ranga: 3 };
  }
  if (/\bkandydat\b/i.test(s)) {
    return { stopien: "Kandydat", ranga: 1 };
  }
  if (/\bmłodszy(\s+ministrant)?\b/i.test(s) || /\bmlodszy(\s+ministrant)?\b/i.test(s)) {
    return { stopien: "Młodszy ministrant", ranga: 2 };
  }
  return { stopien: "Młodszy ministrant", ranga: 2 };
}

function obliczRankingiIPunkty(ss, nazwisko, currentYear, currentMonthIdx) {
  var polishMonths = [
    "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
    "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
  ];
  var polishMonthsAlt = [
    "Styczen", "Luty", "Marzec", "Kwiecien", "Maj", "Czerwiec",
    "Lipiec", "Sierpien", "Wrzesien", "Pazdziernik", "Listopad", "Grudzien"
  ];

  var targetNameClean = oczyscNazwiskoMinistranta(nazwisko || "");
  var targetNameLower = targetNameClean.toLowerCase();

  // Inicjalizujemy mapę wszystkimi AKTUALNYMI użytkownikami z arkusza Uzytkownicy
  var usersList = pobierzListeUzytkownikow(ss);
  var ministranciMap = {};
  for (var u = 0; u < usersList.length; u++) {
    var uName = oczyscNazwiskoMinistranta(usersList[u].nazwisko.trim());
    var uNorm = uName.toLowerCase();
    if (uNorm === "kościelny" || uNorm === "koscielny") continue;
    ministranciMap[uNorm] = {
      nazwisko: uName,
      normName: uNorm,
      punktyMiesiac: 0,
      punktyRok: 0,
      punktyMinusowe: 0,
      szczegolyMinusow: [],
      punktyPoMiesiacach: [],
      czyAktywny: true
    };
  }

  var miesiacRankingiData = {};

  for (var m = 0; m <= currentMonthIdx; m++) {
    var sName1 = polishMonths[m] + "_" + currentYear;
    var sName2 = polishMonthsAlt[m] + "_" + currentYear;
    var sheet = ss.getSheetByName(sName1) || ss.getSheetByName(sName2) ||
                ss.getSheetByName(polishMonths[m]) || ss.getSheetByName(polishMonthsAlt[m]);

    if (!sheet) continue;

    var maxR = Math.min(sheet.getLastRow(), 35);
    if (maxR < 3) continue;

    var lastCol = sheet.getLastColumn();
    var row1 = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var sumaColIdx = -1;
    for (var c = 3; c < row1.length; c++) {
      var hVal = row1[c].toString().trim().toUpperCase();
      if (hVal === "SUMA") {
        sumaColIdx = c + 1;
        break;
      }
    }

    if (sumaColIdx === -1) {
      var dniWM = new Date(currentYear, m + 1, 0).getDate();
      sumaColIdx = 4 + dniWM;
    }

    var numCols = sumaColIdx - 1;
    if (numCols < 2) continue;

    var dataRange = sheet.getRange(3, 2, maxR - 2, numCols).getValues();

    for (var r = 0; r < dataRange.length; r++) {
      var rawName = dataRange[r][0] ? dataRange[r][0].toString().trim() : "";
      if (!rawName) continue;
      var rawUpper = rawName.toUpperCase();
      if (rawUpper.indexOf("GRUPA") !== -1 || rawUpper === "SUMA" || rawUpper.indexOf("RANKING") !== -1) {
        continue;
      }
      if (rawUpper === "MINISTRANCI" || rawUpper === "MINISTRANCI MŁODSI" || rawUpper === "MINISTRANCI STARSI" || rawUpper === "LEKTORZY" || rawUpper === "KANDYDACI") {
        continue;
      }

      var cleanName = oczyscNazwiskoMinistranta(rawName);
      if (!cleanName || cleanName.length < 4) continue;
      var cleanUpper = cleanName.toUpperCase();
      if (cleanUpper === "MINISTRANT" || cleanUpper === "LEKTOR" || cleanUpper === "KANDYDAT" || cleanUpper === "ANIMATOR") {
        continue;
      }

      var cleanLower = cleanName.toLowerCase();

      var matchedKey = null;
      // 1. Dopasowanie bezpośrednie lub zawieranie
      for (var k in ministranciMap) {
        if (k === cleanLower || k.indexOf(cleanLower) !== -1 || cleanLower.indexOf(k) !== -1) {
          matchedKey = k;
          break;
        }
      }

      // 2. Dopasowanie po słowach (np. "Brytner Jakub" vs "Jakub Brytner")
      if (!matchedKey) {
        var cleanWords = cleanLower.split(/\s+/).filter(function(w) { return w.length >= 3; });
        if (cleanWords.length >= 2) {
          for (var k2 in ministranciMap) {
            var allMatch = true;
            for (var wIdx = 0; wIdx < cleanWords.length; wIdx++) {
              if (k2.indexOf(cleanWords[wIdx]) === -1) {
                allMatch = false;
                break;
              }
            }
            if (allMatch) {
              matchedKey = k2;
              break;
            }
          }
        }
      }

      // Jeśli nie ma go w Uzytkownicy (np. dawny ministrant z początku roku)
      if (!matchedKey) {
        // Dawny ministrant musi mieć imię i nazwisko (co najmniej dwie części)
        if (cleanName.indexOf(" ") === -1) {
          continue;
        }
        matchedKey = cleanLower;
        ministranciMap[matchedKey] = {
          nazwisko: cleanName,
          normName: cleanLower,
          punktyMiesiac: 0,
          punktyRok: 0,
          punktyMinusowe: 0,
          szczegolyMinusow: [],
          punktyPoMiesiacach: [],
          czyAktywny: false
        };
      }

      // Punkty z kolumny SUMA
      var rawSuma = dataRange[r][sumaColIdx - 2];
      var pts = parseFloat(rawSuma);
      if (isNaN(pts)) pts = 0;

      ministranciMap[matchedKey].punktyRok += pts;
      if (m === currentMonthIdx) {
        ministranciMap[matchedKey].punktyMiesiac += pts;
      }

      if (!miesiacRankingiData[m]) {
        miesiacRankingiData[m] = {};
      }
      if (!miesiacRankingiData[m][matchedKey]) {
        miesiacRankingiData[m][matchedKey] = {
          nazwisko: ministranciMap[matchedKey].nazwisko,
          normName: matchedKey,
          czyAktywny: ministranciMap[matchedKey].czyAktywny,
          punkty: 0
        };
      }
      miesiacRankingiData[m][matchedKey].punkty = Math.round((miesiacRankingiData[m][matchedKey].punkty + pts) * 10) / 10;

      if (!ministranciMap[matchedKey].punktyPoMiesiacach) {
        ministranciMap[matchedKey].punktyPoMiesiacach = [];
      }
      if (pts !== 0) {
        var foundM = null;
        for (var pi = 0; pi < ministranciMap[matchedKey].punktyPoMiesiacach.length; pi++) {
          if (ministranciMap[matchedKey].punktyPoMiesiacach[pi].miesiacIdx === m) {
            foundM = ministranciMap[matchedKey].punktyPoMiesiacach[pi];
            break;
          }
        }
        if (foundM) {
          foundM.punkty = Math.round((foundM.punkty + pts) * 10) / 10;
        } else {
          ministranciMap[matchedKey].punktyPoMiesiacach.push({
            miesiacIdx: m,
            miesiac: polishMonths[m],
            rok: currentYear,
            punkty: Math.round(pts * 10) / 10
          });
        }
      }

      // Punkty ujemne z dni (od kolumny D, czyli index 2, do przedostatniej kolumny przed SUMA)
      for (var d = 2; d < sumaColIdx - 2; d++) {
        var dv = dataRange[r][d];
        var minusVal = null;
        if (typeof dv === "number" && dv < 0) {
          minusVal = dv;
        } else if (typeof dv === "string") {
          var trimmed = dv.trim();
          if (trimmed.indexOf("-") === 0) {
            var parsedMinus = parseFloat(trimmed.replace(",", "."));
            if (!isNaN(parsedMinus) && parsedMinus < 0) {
              minusVal = parsedMinus;
            }
          }
        }
        if (minusVal !== null) {
          ministranciMap[matchedKey].punktyMinusowe += minusVal;
          var dayNum = d - 1;
          var dtMinus = new Date(currentYear, m, dayNum);
          var dayNamesMinus = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];
          var polishMonthsGenMinus = [
            "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
            "lipca", "sierpnia", "września", "października", "listopada", "grudnia"
          ];
          if (!ministranciMap[matchedKey].szczegolyMinusow) {
            ministranciMap[matchedKey].szczegolyMinusow = [];
          }
          ministranciMap[matchedKey].szczegolyMinusow.push({
            dzien: dayNum,
            miesiac: polishMonths[m],
            miesiacGen: polishMonthsGenMinus[m],
            rok: currentYear,
            dzienTygodnia: dayNamesMinus[dtMinus.getDay()],
            punkty: minusVal
          });
        }
      }
    }
  }

  // Przekształcamy mapę na listę bazową
  var lista = [];
  for (var key in ministranciMap) {
    var item = ministranciMap[key];
    item.punktyMiesiac = Math.round(item.punktyMiesiac * 10) / 10;
    item.punktyRok = Math.round(item.punktyRok * 10) / 10;
    item.punktyMinusowe = Math.round(item.punktyMinusowe * 10) / 10;
    lista.push(item);
  }

  // Budujemy rankingi każdego miesiąca i przypisujemy pozycję w miesiącu
  var rankingiWszystkichMiesiecy = {};
  for (var mi = 0; mi <= currentMonthIdx; mi++) {
    var mData = miesiacRankingiData[mi];
    if (!mData) continue;
    var mList = [];
    for (var mk in mData) {
      var itemM = mData[mk];
      var nM = (itemM.normName || itemM.nazwisko || "").toLowerCase();
      if (nM === "kościelny" || nM === "koscielny") continue;
      if (itemM.punkty !== 0 || (mi === currentMonthIdx && itemM.czyAktywny)) {
        mList.push({
          nazwisko: itemM.nazwisko,
          normName: itemM.normName,
          punkty: itemM.punkty,
          pozycja: 1
        });
      }
    }
    mList.sort(function(a, b) {
      if (b.punkty !== a.punkty) return b.punkty - a.punkty;
      return a.nazwisko.localeCompare(b.nazwisko, "pl");
    });
    przypiszPozycjeRanking(mList, "punkty");

    // Przypisujemy pozycję do punktów tego miesiąca w punktyPoMiesiacach każdego ministranta
    for (var li = 0; li < mList.length; li++) {
      var itLi = mList[li];
      var minObj = ministranciMap[itLi.normName];
      if (minObj && minObj.punktyPoMiesiacach) {
        for (var pi = 0; pi < minObj.punktyPoMiesiacach.length; pi++) {
          if (minObj.punktyPoMiesiacach[pi].miesiacIdx === mi) {
            minObj.punktyPoMiesiacach[pi].pozycja = itLi.pozycja;
            break;
          }
        }
      }
    }

    rankingiWszystkichMiesiecy[polishMonths[mi]] = mList.map(function(it) {
      return {
        nazwisko: it.nazwisko,
        normName: it.normName,
        punkty: it.punkty,
        pozycja: it.pozycja
      };
    });
  }

  // 1. Ranking Miesiąca (TYLKO aktywni ministranci, bez kościelnego)
  var rankingMiesiac = lista
    .filter(function(it) {
      var n = (it.normName || it.nazwisko || "").toLowerCase();
      return it.czyAktywny && n !== "kościelny" && n !== "koscielny";
    })
    .map(function(it) {
      return { nazwisko: it.nazwisko, normName: it.normName, punkty: it.punktyMiesiac, pozycja: 1 };
    }).sort(function(a, b) {
      if (b.punkty !== a.punkty) return b.punkty - a.punkty;
      return a.nazwisko.localeCompare(b.nazwisko, "pl");
    });
  przypiszPozycjeRanking(rankingMiesiac, "punkty");

  // 2. Ranking Całego Roku (WSZYSCY ministranci, bez kościelnego)
  var rankingRok = lista
    .filter(function(it) {
      var n = (it.normName || it.nazwisko || "").toLowerCase();
      return n !== "kościelny" && n !== "koscielny";
    })
    .map(function(it) {
      return {
        nazwisko: it.nazwisko,
        normName: it.normName,
        punkty: it.punktyRok,
        punktyPoMiesiacach: it.punktyPoMiesiacach || [],
        pozycja: 1
      };
    }).sort(function(a, b) {
      if (b.punkty !== a.punkty) return b.punkty - a.punkty;
      return a.nazwisko.localeCompare(b.nazwisko, "pl");
    });
  przypiszPozycjeRanking(rankingRok, "punkty");

  // 3. Ranking Minusów (TYLKO aktywni ministranci, bez kościelnego)
  var rankingMinusy = lista
    .filter(function(it) {
      var n = (it.normName || it.nazwisko || "").toLowerCase();
      return it.czyAktywny && n !== "kościelny" && n !== "koscielny";
    })
    .map(function(it) {
      return {
        nazwisko: it.nazwisko,
        normName: it.normName,
        minusy: it.punktyMinusowe,
        szczegolyMinusow: it.szczegolyMinusow || [],
        pozycja: 0,
        opis: ""
      };
    }).sort(function(a, b) {
      if (a.minusy !== b.minusy) return a.minusy - b.minusy;
      return a.nazwisko.localeCompare(b.nazwisko, "pl");
    });
  przypiszPozycjeMinusow(rankingMinusy);

  // Znajdź pozycje zalogowanego ministranta
  function dopasujMinistranta(arr) {
    for (var i = 0; i < arr.length; i++) {
      var it = arr[i];
      if (it.normName.indexOf(targetNameLower) !== -1 || targetNameLower.indexOf(it.normName) !== -1) {
        return it;
      }
    }
    return null;
  }

  var userMiesiac = dopasujMinistranta(rankingMiesiac);
  var userRok = dopasujMinistranta(rankingRok);
  var userMinus = dopasujMinistranta(rankingMinusy);

  return {
    punktyMiesiac: userMiesiac ? userMiesiac.punkty : 0,
    pozycjaMiesiac: userMiesiac ? userMiesiac.pozycja : null,
    punktyOdPoczatkuRoku: userRok ? userRok.punkty : 0,
    pozycjaRok: userRok ? userRok.pozycja : null,
    punktyPoMiesiacach: userRok ? (userRok.punktyPoMiesiacach || []) : [],
    punktyMinusoweSuma: userMinus ? userMinus.minusy : 0,
    pozycjaMinusy: userMinus ? userMinus.pozycja : null,
    szczegolyMinusow: userMinus ? (userMinus.szczegolyMinusow || []) : [],
    rankingMiesiac: (rankingiWszystkichMiesiecy && rankingiWszystkichMiesiecy[polishMonths[currentMonthIdx]]) || rankingMiesiac.map(function(m) { return { nazwisko: m.nazwisko, punkty: m.punkty, pozycja: m.pozycja }; }),
    rankingRok: rankingRok.map(function(m) { return { nazwisko: m.nazwisko, punkty: m.punkty, pozycja: m.pozycja, punktyPoMiesiacach: m.punktyPoMiesiacach || [] }; }),
    rankingMinusy: rankingMinusy.map(function(m) { return { nazwisko: m.nazwisko, minusy: m.minusy, szczegolyMinusow: m.szczegolyMinusow || [], pozycja: m.pozycja, opis: m.opis }; }),
    rankingiMiesiecy: rankingiWszystkichMiesiecy
  };
}

function przypiszPozycjeRanking(arr, prop) {
  var aktPozycja = 1;
  for (var i = 0; i < arr.length; i++) {
    if (i > 0 && arr[i][prop] < arr[i - 1][prop]) {
      aktPozycja = i + 1;
    }
    arr[i].pozycja = aktPozycja;
  }
}

function przypiszPozycjeMinusow(arr) {
  var aktPozycja = 1;
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].minusy < 0) {
      if (i > 0 && arr[i].minusy > arr[i - 1].minusy) {
        aktPozycja = i + 1;
      }
      arr[i].pozycja = aktPozycja;
      arr[i].opis = aktPozycja + ". miejsce (" + arr[i].minusy + " pkt)";
    } else {
      arr[i].pozycja = 0;
      arr[i].opis = "Czyste konto ✨";
    }
  }
}

function pobierzGodzineMszyWTygodniu(rok, miesiacIdx, dzien) {
  var dt = new Date(rok, miesiacIdx, dzien);
  var dayOfWeek = dt.getDay(); // 0: Nd, 1: Pn, 2: Wt, 3: Śr, 4: Cz, 5: Pt, 6: Sb
  if (dayOfWeek === 1) return "18:00"; // Poniedziałek
  if (dayOfWeek === 2) return "18:00"; // Wtorek
  if (dayOfWeek === 3) return "08:00"; // Środa rano
  if (dayOfWeek === 4) return "17:00"; // Czwartek msza szkolna
  if (dayOfWeek === 5) return "18:00"; // Piątek
  return "18:00";
}

function pobierzPelnaNazweMszyWTygodniu(rok, miesiacIdx, dzien) {
  var dt = new Date(rok, miesiacIdx, dzien);
  var dayOfWeek = dt.getDay();
  if (dayOfWeek === 1) return "Poniedziałek 18:00";
  if (dayOfWeek === 2) return "Wtorek 18:00";
  if (dayOfWeek === 3) return "Środa 08:00 (Rano)";
  if (dayOfWeek === 4) return "Czwartek 17:00 (Szkolna)";
  if (dayOfWeek === 5) return "Piątek 18:00";
  return "18:00";
}

function obliczCutoffDlaDnia(rok, miesiacIdx, dzien) {
  var dt = new Date(rok, miesiacIdx, dzien);
  var dayOfWeek = dt.getDay();
  if (dayOfWeek === 3) {
    // Środa 08:00 rano -> cutoff to wtorek 20:00 (poprzedni wieczór)
    return new Date(rok, miesiacIdx, dzien - 1, 20, 0, 0);
  } else if (dayOfWeek === 4) {
    // Czwartek 17:00 msza szkolna -> cutoff to czwartek 13:00 (4h przed mszą)
    return new Date(rok, miesiacIdx, dzien, 13, 0, 0);
  } else {
    // Poniedziałek, Wtorek, Piątek 18:00 -> cutoff to dzień mszy 14:00 (4h przed mszą)
    return new Date(rok, miesiacIdx, dzien, 14, 0, 0);
  }
}

function obliczCutoffPrzedWlasnaMsza(rok, miesiacIdx, dzien) {
  var dt = new Date(rok, miesiacIdx, dzien);
  var dayOfWeek = dt.getDay();
  if (dayOfWeek === 3) {
    // Środa 08:00 rano -> 24h przed to wtorek 08:00 rano
    return new Date(rok, miesiacIdx, dzien - 1, 8, 0, 0);
  } else if (dayOfWeek === 4) {
    // Czwartek 17:00 -> 24h przed to środa 17:00
    return new Date(rok, miesiacIdx, dzien - 1, 17, 0, 0);
  } else {
    // Poniedziałek, Wtorek, Piątek 18:00 -> 24h przed to dzień wcześniej 18:00
    return new Date(rok, miesiacIdx, dzien - 1, 18, 0, 0);
  }
}

function wpiszZeroDlaMinistranta(mSheet, nazwisko, dzien) {
  if (!mSheet) return;
  var maxRows = Math.min(mSheet.getLastRow(), 32);
  var colB = mSheet.getRange(1, 2, maxRows, 1).getValues();
  var targetRow = -1;
  var nLower = nazwisko.trim().toLowerCase();
  for (var r = 2; r < maxRows; r++) {
    if (colB[r][0].toString().trim().toLowerCase().indexOf(nLower) !== -1) {
      targetRow = r + 1;
      break;
    }
  }
  if (targetRow !== -1) {
    var colDzien = dzien + 3;
    var targetCell = mSheet.getRange(targetRow, colDzien);
    targetCell.setValue(0);
  }
}

function przetworzWygasajaceOferty(ss, rok, miesiacIdx, dzisDzien, nazwaMiesiaca) {
  var tSheet = ss.getSheetByName("Zamiany_Tydzien");
  if (!tSheet || tSheet.getLastRow() < 2) return;

  var zSheet = pobierzArkuszZastepstw(ss);
  var mSheet = pobierzBiezacyArkuszMiesiaca(ss);
  var now = new Date();

  var tLastCol = Math.max(tSheet.getLastColumn(), 10);
  var tData = tSheet.getRange(2, 1, tSheet.getLastRow() - 1, tLastCol).getDisplayValues();

  for (var i = 0; i < tData.length; i++) {
    var status = tData[i][7].trim();
    if (status !== "OCZEKUJE") continue;

    var dOdd = parseInt(tData[i][2], 10);
    var wystawiajacy = tData[i][3];
    var akceptowaneRaw = tData[i][4].toString().replace(/'/g, '').split(/[,;]/);
    var akceptowaneDni = [];
    for (var a = 0; a < akceptowaneRaw.length; a++) {
      var num = parseInt(akceptowaneRaw[a].trim(), 10);
      if (!isNaN(num)) akceptowaneDni.push(num);
    }
    var autoOddajRaw = tData[i][9] ? tData[i][9].trim().toUpperCase() : "TAK";
    var autoOddaj = (autoOddajRaw !== "NIE" && autoOddajRaw !== "FALSE");

    // Cutoff 24h przed własną mszą
    var wlasnyCutoff = obliczCutoffPrzedWlasnaMsza(rok, miesiacIdx, dOdd);
    var wlasnaMszaZaBlisko = (now.getTime() >= wlasnyCutoff.getTime());

    // Cutoffy dni w zamian
    var aktywneDniWZamian = akceptowaneDni.filter(function(d) {
      var cutoffDlaDnia = obliczCutoffDlaDnia(rok, miesiacIdx, d);
      return now.getTime() < cutoffDlaDnia.getTime();
    });

    var wygaslaWymiana = (wlasnaMszaZaBlisko || aktywneDniWZamian.length === 0);

    if (wygaslaWymiana) {
      if (autoOddaj && dOdd >= dzisDzien) {
        tSheet.getRange(i + 2, 8).setValue("PRZEKSZTALCONA_NA_WOLNY");

        var newZId = "Z_" + new Date().getTime() + "_" + i;
        var nowStr = Utilities.formatDate(now, "Europe/Warsaw", "yyyy-MM-dd HH:mm:ss");
        var godzinaMszy = pobierzGodzineMszyWTygodniu(rok, miesiacIdx, dOdd);

        zSheet.appendRow([
          newZId,
          mSheet.getName(),
          dOdd,
          wystawiajacy,
          "",
          godzinaMszy,
          "Tydzień",
          "OCZEKUJE",
          nowStr,
          ""
        ]);

        wpiszZeroDlaMinistranta(mSheet, wystawiajacy, dOdd);

        // 1. Dedykowane powiadomienie dla WYSTAWIAJĄCEGO, że jego oferta przeszła na wolną mszę
        try {
          powiadomWystawiajacegoOPrzeksztalceniu(wystawiajacy, dOdd, nazwaMiesiaca, godzinaMszy);
        } catch (errW) {
          console.warn("Błąd powiadamiania wystawiającego o auto-konwersji:", errW);
        }

        // 2. Powiadomienie dla WSZYSTKICH KWALIFIKUJĄCYCH SIĘ ministrantów (którzy nie mają służby w tym dniu)
        try {
          powiadomOWolnymDyzurzeZAutoKonwersji(wystawiajacy, dOdd, nazwaMiesiaca, godzinaMszy);
        } catch (errP) {
          console.warn("Błąd wysyłki PUSH przy auto-konwersji:", errP);
        }
      } else {
        tSheet.getRange(i + 2, 8).setValue("WYGASLA");
      }
    }
  }
}

function wyznaczNajblizszaSluzba(rok, miesiacIdx, dzisDzien, daysInMonth, mojeDyzuryTydzien, godzinyWeekendy, nazwaMiesiacaGenitive, mojeOddaneZastepstwa, mojePrzejeteZastepstwa) {
  var polishDayNames = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];
  var nadchodzace = [];

  // 1. Dni powszednie
  (mojeDyzuryTydzien || []).forEach(function(d) {
    if (d >= dzisDzien) {
      // Jeśli oddałem ten dyżur na giełdę, to go nie pełnię
      if (mojeOddaneZastepstwa && mojeOddaneZastepstwa[d] && mojeOddaneZastepstwa[d].status !== "ANULOWANA") {
        return;
      }
      var dt = new Date(rok, miesiacIdx, d);
      var godzinaMszy = pobierzGodzineMszyWTygodniu(rok, miesiacIdx, d);
      if (d === dzisDzien && czyMszaJuzMinaDzis(godzinaMszy)) {
        return;
      }
      nadchodzace.push({
        dzien: d,
        dzienTygodnia: polishDayNames[dt.getDay()],
        typ: "Służba w tygodniu",
        godzina: godzinaMszy
      });
    }
  });

  // 2. Weekendy
  if (godzinyWeekendy) {
    for (var sunStr in godzinyWeekendy) {
      var sunDay = parseInt(sunStr, 10);
      var infoW = godzinyWeekendy[sunStr];
      if (!infoW || !infoW.godzina) continue;

      if (mojeOddaneZastepstwa && mojeOddaneZastepstwa[sunDay] && mojeOddaneZastepstwa[sunDay].status !== "ANULOWANA") {
        continue;
      }

      var actualDay = (infoW.godzina === "17:00") ? (sunDay - 1) : sunDay;
      if (actualDay >= dzisDzien) {
        if (actualDay === dzisDzien && czyMszaJuzMinaDzis(infoW.godzina)) {
          continue;
        }
        var dtW = new Date(rok, miesiacIdx, actualDay);
        nadchodzace.push({
          dzien: actualDay,
          dzienTygodnia: polishDayNames[dtW.getDay()],
          typ: (infoW.godzina === "17:00") ? "Sobota wieczór" : "Niedziela",
          godzina: infoW.godzina
        });
      }
    }
  }

  // 3. Przejęte zastępstwa (+4 pkt)
  if (mojePrzejeteZastepstwa) {
    for (var pDayStr in mojePrzejeteZastepstwa) {
      var pDay = parseInt(pDayStr, 10);
      if (pDay >= dzisDzien) {
        var pInfo = mojePrzejeteZastepstwa[pDayStr];
        if (!pInfo || pInfo.status !== "PRZEJETE") {
          continue;
        }
        var pGodz = pInfo.godzina || "18:00";
        if (pDay === dzisDzien && czyMszaJuzMinaDzis(pGodz)) {
          continue;
        }
        var dtP = new Date(rok, miesiacIdx, pDay);
        nadchodzace.push({
          dzien: pDay,
          dzienTygodnia: polishDayNames[dtP.getDay()],
          typ: "Zastępstwo (+4 pkt)",
          godzina: pGodz
        });
      }
    }
  }

  if (nadchodzace.length === 0) {
    return {
      jest: false,
      tekst: "Brak zaplanowanych służb do końca miesiąca"
    };
  }

  nadchodzace.sort(function(a, b) { return a.dzien - b.dzien; });

  var first = nadchodzace[0];
  var prefiks = "";
  if (first.dzien === dzisDzien) {
    prefiks = "Dzisiaj";
  } else if (first.dzien === dzisDzien + 1) {
    prefiks = "Jutro";
  } else {
    prefiks = first.dzienTygodnia.charAt(0).toUpperCase() + first.dzienTygodnia.slice(1);
  }

  var opisGodziny = (first.godzina === "Dyżur stały") ? "" : " (godz. " + first.godzina + ")";
  var pelnyTekst = prefiks + ", " + first.dzien + " " + nazwaMiesiacaGenitive + opisGodziny;

  return {
    jest: true,
    dzien: first.dzien,
    dzienTygodnia: first.dzienTygodnia,
    godzina: first.godzina,
    typ: first.typ,
    tekst: pelnyTekst
  };
}

function wystawOferteTydzien(nazwisko, pin, dzienOddawany, akceptowaneDni, autoOddaj) {
  var ss = pobierzAktywnyArkusz();
  var stan = pobierzStanDanych(nazwisko, pin);
  if (!stan.sukces) return stan;

  if (dzienOddawany < stan.dzisDzien) {
    return { sukces: false, wiadomosc: "Nie można wystawić oferty na dzień z przeszłości." };
  }

  if (stan.dniSwiateczne && stan.dniSwiateczne.indexOf(dzienOddawany) !== -1) {
    return { sukces: false, wiadomosc: "Ten dzień to święto/uroczystość. Nie podlega wymianie." };
  }

  if (stan.mojeDyzuryTydzien.indexOf(dzienOddawany) === -1) {
    return { sukces: false, wiadomosc: "Nie posiadasz dyżuru w tym dniu." };
  }

  var tSheet = ss.getSheetByName("Zamiany_Tydzien");
  if (tSheet && tSheet.getLastRow() > 1) {
    var checkData = tSheet.getRange(2, 1, tSheet.getLastRow() - 1, 8).getDisplayValues();
    for (var c = 0; c < checkData.length; c++) {
      if (checkData[c][3] === nazwisko && parseInt(checkData[c][2], 10) === dzienOddawany && checkData[c][7] === "OCZEKUJE") {
        return { sukces: false, wiadomosc: "Masz już aktywną ofertę wymiany dla tego dnia." };
      }
    }
  }

  var dozwoloneDni = wyznaczDniTygodnia(stan.rok, stan.miesiacIdx, dzienOddawany, stan.dniSwiateczne);
  for (var i = 0; i < akceptowaneDni.length; i++) {
    if (dozwoloneDni.indexOf(akceptowaneDni[i]) === -1) {
      return { sukces: false, wiadomosc: "Wymiana jest możliwa wyłącznie w obrębie dni roboczych tego samego tygodnia (z wyłączeniem świąt)." };
    }
    if (akceptowaneDni[i] < stan.dzisDzien) {
      return { sukces: false, wiadomosc: "Nie możesz wskazać minionego dnia na zamianę." };
    }
  }

  var mSheet = pobierzBiezacyArkuszMiesiaca(ss);
  var newId = "T_" + new Date().getTime();
  var nowStr = Utilities.formatDate(new Date(), "Europe/Warsaw", "yyyy-MM-dd HH:mm:ss");
  var czyAuto = (autoOddaj !== false && autoOddaj !== "false" && autoOddaj !== "NIE") ? "TAK" : "NIE";

  tSheet.appendRow([
    newId,
    mSheet.getName(),
    dzienOddawany,
    nazwisko,
    "'" + akceptowaneDni.join(','),
    "",
    "",
    "OCZEKUJE",
    nowStr,
    czyAuto
  ]);

  try {
    var formatDni = akceptowaneDni.map(function(d) { return d + " " + stan.nazwaMiesiaca; }).join(", ");
    powiadomONowejOfercie(nazwisko, "Tydzień", dzienOddawany + " " + stan.nazwaMiesiaca + " (zamiana na: " + formatDni + ")", {
      typOferty: "TYDZIEN",
      dzienOddawany: dzienOddawany,
      akceptowaneDni: akceptowaneDni
    });
  } catch (errPush) {
    console.warn("Błąd wysyłki powiadomienia:", errPush);
  }

  SpreadsheetApp.flush();
  try { synchronizujDoFirestore(ss); } catch (eSync) { Logger.log("Błąd sync: " + eSync.message); }
  return { sukces: true };
}

function anulujOferteTydzien(nazwisko, pin, ofertaId) {
  var ss = pobierzAktywnyArkusz();
  var stan = pobierzStanDanych(nazwisko, pin);
  if (!stan.sukces) return stan;

  var tSheet = ss.getSheetByName("Zamiany_Tydzien");
  var tData = tSheet.getRange(2, 1, tSheet.getLastRow() - 1, 8).getDisplayValues();
  for (var i = 0; i < tData.length; i++) {
    if (tData[i][0] === ofertaId) {
      if (tData[i][3] !== nazwisko) {
        return { sukces: false, wiadomosc: "Możesz anulować wyłącznie własną ofertę." };
      }
      if (tData[i][7] !== "OCZEKUJE") {
        return { sukces: false, wiadomosc: "Ta oferta została już zrealizowana." };
      }
      tSheet.getRange(i + 2, 8).setValue("ANULOWANA");
      SpreadsheetApp.flush();
  try { synchronizujDoFirestore(ss); } catch (eSync) { Logger.log("Błąd sync: " + eSync.message); }
  return { sukces: true };
    }
  }
  return { sukces: false, wiadomosc: "Nie znaleziono oferty." };
}

function zaakceptujOferteTydzien(nazwisko, pin, ofertaId, dzienWybrany) {
  var ss = pobierzAktywnyArkusz();
  var stan = pobierzStanDanych(nazwisko, pin);
  if (!stan.sukces) return stan;

  if (dzienWybrany < stan.dzisDzien) {
    return { sukces: false, wiadomosc: "Nie można wymienić minionego dyżuru." };
  }

  if (stan.dniSwiateczne && stan.dniSwiateczne.indexOf(dzienWybrany) !== -1) {
    return { sukces: false, wiadomosc: "Wybrany dzień to święto i nie podlega zamianie." };
  }

  if (stan.mojeDyzuryTydzien.indexOf(dzienWybrany) === -1) {
    return { sukces: false, wiadomosc: "Nie posiadasz dyżuru w wybranym dniu." };
  }

  var tSheet = ss.getSheetByName("Zamiany_Tydzien");
  var tData = tSheet.getRange(2, 1, tSheet.getLastRow() - 1, 8).getDisplayValues();
  var rowIdx = -1;
  var oferta = null;

  for (var i = 0; i < tData.length; i++) {
    if (tData[i][0] === ofertaId && tData[i][7] === "OCZEKUJE") {
      rowIdx = i + 2;
      oferta = tData[i];
      break;
    }
  }

  if (!oferta) return { sukces: false, wiadomosc: "Oferta nie jest już dostępna." };
  if (oferta[3] === nazwisko) return { sukces: false, wiadomosc: "Nie możesz zaakceptować własnej oferty." };

  if (parseInt(oferta[2], 10) < stan.dzisDzien) {
    return { sukces: false, wiadomosc: "Ta oferta dotyczy minionego dnia i straciła ważność." };
  }

  var akceptowane = oferta[4].toString().replace(/'/g, '').split(/[,;]/).map(function(n) { return parseInt(n.trim(), 10); }).filter(function(n) { return !isNaN(n); });
  if (akceptowane.indexOf(dzienWybrany) === -1) {
    return { sukces: false, wiadomosc: "Ten dzień nie pasuje wystawiającemu." };
  }

  var mSheet = ss.getSheetByName(oferta[1]);
  var wystawiajacyRow = -1;
  var przejmujacyRow = -1;
  var lastRow = Math.min(mSheet.getLastRow(), 32);

  for (var r = 3; r <= lastRow; r++) {
    var pName = mSheet.getRange(r, 2).getValue().toString().trim().toLowerCase();
    if (pName.indexOf(oferta[3].trim().toLowerCase()) !== -1) wystawiajacyRow = r;
    if (pName.indexOf(nazwisko.trim().toLowerCase()) !== -1) przejmujacyRow = r;
  }

  var colOddawany = parseInt(oferta[2], 10) + 3;
  var colWybrany = parseInt(dzienWybrany, 10) + 3;

  var bgWystawiajacy = mSheet.getRange(wystawiajacyRow, colOddawany).getBackground();
  var bgPrzejmujacy = mSheet.getRange(przejmujacyRow, colWybrany).getBackground();

  mSheet.getRange(wystawiajacyRow, colOddawany).setBackground("#ffffff");
  mSheet.getRange(wystawiajacyRow, colWybrany).setBackground(bgWystawiajacy);

  mSheet.getRange(przejmujacyRow, colWybrany).setBackground("#ffffff");
  mSheet.getRange(przejmujacyRow, colOddawany).setBackground(bgPrzejmujacy);

  tSheet.getRange(rowIdx, 6).setValue(nazwisko);
  tSheet.getRange(rowIdx, 7).setValue(dzienWybrany);
  tSheet.getRange(rowIdx, 8).setValue("ZAAKCEPTOWANA");

  try {
    powiadomOZamianie(oferta[3], nazwisko, "Dzień " + dzienWybrany + " " + stan.nazwaMiesiaca);
  } catch (errPush) {
    console.warn("Błąd powiadomienia o zamianie:", errPush);
  }

  SpreadsheetApp.flush();
  try { synchronizujDoFirestore(ss); } catch (eSync) { Logger.log("Błąd sync: " + eSync.message); }
  return { sukces: true };
}

function wystawOferteNiedziela(nazwisko, pin, dzienNiedzieli, akceptowaneGodziny) {
  var ss = pobierzAktywnyArkusz();
  var stan = pobierzStanDanych(nazwisko, pin);
  if (!stan.sukces) return stan;

  if (dzienNiedzieli < stan.dzisDzien) {
    return { sukces: false, wiadomosc: "Nie można wystawić oferty na miniony weekend." };
  }

  var mojaGodzinaNaTenWeekend = (stan.godzinyWeekendy && stan.godzinyWeekendy[dzienNiedzieli]) 
    ? stan.godzinyWeekendy[dzienNiedzieli].godzina 
    : stan.mojaGodzinaNiedziela;

  if (!mojaGodzinaNaTenWeekend) {
    return { sukces: false, wiadomosc: "Nie można ustalić Twojej godziny w grafiku niedzielnym." };
  }

  var czysteAkceptowane = akceptowaneGodziny
    .map(function(g) { return cleanTime(g); })
    .filter(function(g) { return g !== mojaGodzinaNaTenWeekend; });

  if (czysteAkceptowane.length === 0) {
    return { sukces: false, wiadomosc: "Nie możesz wybrać na zamianę godziny, którą już posiadasz." };
  }

  var nSheet = ss.getSheetByName("Zamiany_Niedziele");
  if (nSheet && nSheet.getLastRow() > 1) {
    var checkData = nSheet.getRange(2, 1, nSheet.getLastRow() - 1, 9).getDisplayValues();
    for (var c = 0; c < checkData.length; c++) {
      if (checkData[c][3] === nazwisko && parseInt(checkData[c][2], 10) === dzienNiedzieli && checkData[c][8] === "OCZEKUJE") {
        return { sukces: false, wiadomosc: "Masz już aktywną ofertę na ten weekend." };
      }
    }
  }

  var mSheet = pobierzBiezacyArkuszMiesiaca(ss);
  var newId = "N_" + new Date().getTime();

  nSheet.appendRow([
    newId,
    mSheet.getName(),
    dzienNiedzieli,
    nazwisko,
    "'" + mojaGodzinaNaTenWeekend,
    "'" + czysteAkceptowane.join(','),
    "",
    "",
    "OCZEKUJE"
  ]);

  try {
    powiadomONowejOfercie(nazwisko, "Weekend", "Niedziela " + dzienNiedzieli + " " + stan.nazwaMiesiaca + " (" + mojaGodzinaNaTenWeekend + ")", {
      typOferty: "NIEDZIELA",
      dzien: dzienNiedzieli,
      godzinaOddawana: mojaGodzinaNaTenWeekend,
      akceptowaneGodziny: czysteAkceptowane
    });
  } catch (errPush) {
    console.warn("Błąd wysyłki powiadomienia:", errPush);
  }

  SpreadsheetApp.flush();
  try { synchronizujDoFirestore(ss); } catch (eSync) { Logger.log("Błąd sync: " + eSync.message); }
  return { sukces: true };
}

function anulujOferteNiedziela(nazwisko, pin, ofertaId) {
  var ss = pobierzAktywnyArkusz();
  var stan = pobierzStanDanych(nazwisko, pin);
  if (!stan.sukces) return stan;

  var nSheet = ss.getSheetByName("Zamiany_Niedziele");
  var nData = nSheet.getRange(2, 1, nSheet.getLastRow() - 1, 9).getDisplayValues();
  for (var i = 0; i < nData.length; i++) {
    if (nData[i][0] === ofertaId) {
      if (nData[i][3] !== nazwisko) {
        return { sukces: false, wiadomosc: "Możesz anulować wyłącznie własną ofertę." };
      }
      if (nData[i][8] !== "OCZEKUJE") {
        return { sukces: false, wiadomosc: "Ta oferta została już zrealizowana." };
      }
      nSheet.getRange(i + 2, 9).setValue("ANULOWANA");
      SpreadsheetApp.flush();
  try { synchronizujDoFirestore(ss); } catch (eSync) { Logger.log("Błąd sync: " + eSync.message); }
  return { sukces: true };
    }
  }
  return { sukces: false, wiadomosc: "Nie znaleziono oferty." };
}

function zaakceptujOferteNiedziela(nazwisko, pin, ofertaId) {
  var ss = pobierzAktywnyArkusz();
  var stan = pobierzStanDanych(nazwisko, pin);
  if (!stan.sukces) return stan;

  var nSheet = ss.getSheetByName("Zamiany_Niedziele");
  var nData = nSheet.getRange(2, 1, nSheet.getLastRow() - 1, 9).getDisplayValues();
  var rowIdx = -1;
  var oferta = null;

  for (var i = 0; i < nData.length; i++) {
    if (nData[i][0] === ofertaId && nData[i][8] === "OCZEKUJE") {
      rowIdx = i + 2;
      oferta = nData[i];
      break;
    }
  }

  if (!oferta) return { sukces: false, wiadomosc: "Oferta nie jest już aktywna." };
  if (oferta[3] === nazwisko) return { sukces: false, wiadomosc: "Nie możesz przyjąć własnej oferty." };

  var sunDayNumber = parseInt(oferta[2], 10);
  if (sunDayNumber < stan.dzisDzien) {
    return { sukces: false, wiadomosc: "Ta oferta dotyczy minionego weekendu i wygasła." };
  }

  var mojaGodzinaNaTenWeekend = (stan.godzinyWeekendy && stan.godzinyWeekendy[sunDayNumber])
    ? stan.godzinyWeekendy[sunDayNumber].godzina
    : stan.mojaGodzinaNiedziela;

  var akceptowane = oferta[5].toString().replace(/'/g, '').split(/[,;]/).map(function(s) { return cleanTime(s); }).filter(function(s) { return s.length > 0; });
  if (akceptowane.indexOf(mojaGodzinaNaTenWeekend) === -1) {
    return { sukces: false, wiadomosc: "Twoja godzina w ten weekend (" + mojaGodzinaNaTenWeekend + ") nie pasuje wystawiającemu." };
  }

  var mSheet = ss.getSheetByName(oferta[1]);
  var colNiedziela = sunDayNumber + 3;
  var colSobota = colNiedziela - 1;

  var wystawiajacyRow = -1;
  var przejmujacyRow = -1;
  var lastRow = Math.min(mSheet.getLastRow(), 32);

  for (var r = 3; r <= lastRow; r++) {
    var pName = mSheet.getRange(r, 2).getValue().toString().trim().toLowerCase();
    if (pName.indexOf(oferta[3].trim().toLowerCase()) !== -1) wystawiajacyRow = r;
    if (pName.indexOf(nazwisko.trim().toLowerCase()) !== -1) przejmujacyRow = r;
  }

  var celKolumnyWystawiajacy = (mojaGodzinaNaTenWeekend === "17:00") ? colSobota : colNiedziela;
  var celKolumnyPrzejmujacy = (oferta[4] === "17:00") ? colSobota : colNiedziela;

  if (wystawiajacyRow !== -1) {
    mSheet.getRange(wystawiajacyRow, celKolumnyWystawiajacy).setNote("Zamiana z " + nazwisko + " na godzinę " + mojaGodzinaNaTenWeekend);
  }
  if (przejmujacyRow !== -1) {
    mSheet.getRange(przejmujacyRow, celKolumnyPrzejmujacy).setNote("Zamiana z " + oferta[3] + " na godzinę " + cleanTime(oferta[4]));
  }

  nSheet.getRange(rowIdx, 7).setValue(nazwisko);
  nSheet.getRange(rowIdx, 8).setValue("'" + mojaGodzinaNaTenWeekend);
  nSheet.getRange(rowIdx, 9).setValue("ZAAKCEPTOWANA");

  try {
    powiadomOZamianie(oferta[3], nazwisko, "Niedziela " + sunDayNumber + " " + stan.nazwaMiesiaca + " (" + mojaGodzinaNaTenWeekend + ")");
  } catch (errPush) {
    console.warn("Błąd powiadomienia o zamianie weekendowej:", errPush);
  }

  SpreadsheetApp.flush();
  try { synchronizujDoFirestore(ss); } catch (eSync) { Logger.log("Błąd sync: " + eSync.message); }
  return { sukces: true };
}

// ==========================================
// OBSŁUGA ZASTĘPSTW I WOLNYCH DYŻURÓW (+4 / +1 PKT)
// ==========================================

function pobierzArkuszZastepstw(ss) {
  var sheet = ss.getSheetByName("Zamiany_Zastepstwa");
  if (!sheet) {
    sheet = ss.insertSheet("Zamiany_Zastepstwa");
    sheet.appendRow([
      "ID", "Arkusz_Miesiaca", "Dzien", "Oddajacy", "Przejmujacy", "Godzina", "TypGrafiku", "Status", "Data_Wystawienia", "Data_Przejecia"
    ]);
    sheet.getRange("A1:J1").setFontWeight("bold").setBackground("#d9ead3");
  }
  return sheet;
}

function wystawZastepstwo(nazwisko, pin, dzien, typGrafiku, godzina) {
  var ss = pobierzAktywnyArkusz();
  var stan = pobierzStanDanych(nazwisko, pin, ss);
  if (!stan.sukces) return stan;

  dzien = parseInt(dzien, 10);
  if (isNaN(dzien) || dzien < stan.dzisDzien) {
    return { sukces: false, wiadomosc: "Nie można oddać dyżuru z minionego dnia." };
  }

  if (stan.dniSwiateczne && stan.dniSwiateczne.indexOf(dzien) !== -1) {
    return { sukces: false, wiadomosc: "Ten dzień to uroczystość/święto. Nie podlega oddawaniu." };
  }

  typGrafiku = typGrafiku || "Tydzień";
  var isNiedziela = (typGrafiku === "Niedziela" || typGrafiku === "Weekend");

  if (isNiedziela) {
    return { 
      sukces: false, 
      wiadomosc: "Dyżury niedzielne nie podlegają wystawianiu na giełdę wolnych zastępstw. Aby zgłosić nieobecność (0 pkt), skorzystaj z przycisku 'Nie mogę przyjść' na liście swoich dyżurów." 
    };
  } else {
    if (stan.mojeDyzuryTydzien.indexOf(dzien) === -1) {
      return { sukces: false, wiadomosc: "Nie posiadasz dyżuru w tym dniu." };
    }
    godzina = godzina || pobierzGodzineMszyWTygodniu(stan.rok, stan.miesiacIdx, dzien) || "18:00";
    typGrafiku = "Tydzień";
  }

  var zSheet = pobierzArkuszZastepstw(ss);
  var istniejaceId = null;
  if (zSheet.getLastRow() > 1) {
    var zData = zSheet.getRange(2, 1, zSheet.getLastRow() - 1, 8).getDisplayValues();
    for (var i = 0; i < zData.length; i++) {
      if (czyToTenSamMinistrant(zData[i][3], nazwisko) && parseInt(zData[i][2], 10) === dzien && zData[i][7] === "OCZEKUJE") {
        istniejaceId = zData[i][0];
        break;
      }
    }
  }

  var mSheet = pobierzBiezacyArkuszMiesiaca(ss);
  var maxRows = Math.min(mSheet.getLastRow(), 45);
  var colB = mSheet.getRange(1, 2, maxRows, 1).getValues();
  var targetRow = -1;
  for (var r = 2; r < maxRows; r++) {
    if (czyToTenSamMinistrant(colB[r][0], nazwisko)) {
      targetRow = r + 1;
      break;
    }
  }

  if (targetRow !== -1) {
    var colDzien = dzien + 3;
    var targetCell = mSheet.getRange(targetRow, colDzien);
    targetCell.setValue(0);
  }

  if (istniejaceId) {
    SpreadsheetApp.flush();
    try { synchronizujDoFirestore(ss); } catch (eSync) { Logger.log("Błąd sync: " + eSync.message); }
    return {
      sukces: true,
      id: istniejaceId,
      wiadomosc: "Dyżur jest już wystawiony na giełdzie! Komórka została zabezpieczona (0 pkt)."
    };
  }

  var newId = "Z_" + new Date().getTime();
  var nowStr = Utilities.formatDate(new Date(), "Europe/Warsaw", "yyyy-MM-dd HH:mm:ss");

  zSheet.appendRow([
    newId,
    mSheet.getName(),
    dzien,
    nazwisko,
    "",
    godzina || "",
    typGrafiku,
    "OCZEKUJE",
    nowStr,
    ""
  ]);

  try {
    var opisDnia = dzien + " " + stan.nazwaMiesiaca + (isNiedziela ? " (Niedziela" + (godzina ? " " + godzina : "") + ")" : (godzina ? " (" + godzina + ")" : ""));
    powiadomONowejOfercie(nazwisko, "Wolny dyżur (+4 pkt)", opisDnia + " - Wolne zastępstwo do wzięcia!", {
      typOferty: "ZASTEPSTWO",
      dzien: dzien
    });
  } catch (errPush) {
    console.warn("Błąd wysyłki powiadomienia PUSH:", errPush);
  }

  SpreadsheetApp.flush();
  try { synchronizujDoFirestore(ss); } catch (eSync) { Logger.log("Błąd sync: " + eSync.message); }
  return { sukces: true, id: newId, wiadomosc: "Dyżur został wystawiony na giełdę! Masz wpisane 0 pkt (brak minusa). Jeśli ktoś przejmie dyżur i przyjdzie na mszę, otrzymasz +1 pkt." };
}

function anulujZastepstwo(nazwisko, pin, ofertaId, dzien) {
  var ss = pobierzAktywnyArkusz();
  var stan = pobierzStanDanych(nazwisko, pin, ss);
  if (!stan.sukces) return stan;

  var zSheet = pobierzArkuszZastepstw(ss);
  if (zSheet.getLastRow() < 2) return { sukces: false, wiadomosc: "Brak ofert." };

  var zData = zSheet.getRange(2, 1, zSheet.getLastRow() - 1, 8).getDisplayValues();
  var targetIndex = -1;

  // 1. Szukamy po ID oferty (o ile to nie pending)
  if (ofertaId && !ofertaId.toString().startsWith("pending_")) {
    for (var i = 0; i < zData.length; i++) {
      if (zData[i][0] === ofertaId) {
        targetIndex = i;
        break;
      }
    }
  }

  // 2. Jeśli nie znaleziono po ID (np. pending lub anulowanie po numerze dnia)
  if (targetIndex === -1 && dzien) {
    var dInt = parseInt(dzien, 10);
    for (var i = 0; i < zData.length; i++) {
      if (czyToTenSamMinistrant(zData[i][3], nazwisko) && parseInt(zData[i][2], 10) === dInt && zData[i][7] === "OCZEKUJE") {
        targetIndex = i;
        break;
      }
    }
  }

  // 3. Fallback ogólny: jeśli brak ID i brak dnia, lub nie znaleziono po ID
  if (targetIndex === -1) {
    for (var i = 0; i < zData.length; i++) {
      if (czyToTenSamMinistrant(zData[i][3], nazwisko) && zData[i][7] === "OCZEKUJE") {
        targetIndex = i;
        break;
      }
    }
  }

  if (targetIndex === -1) {
    return { sukces: false, wiadomosc: "Nie znaleziono aktywnej oferty do anulowania." };
  }

  if (!czyToTenSamMinistrant(zData[targetIndex][3], nazwisko)) {
    return { sukces: false, wiadomosc: "Możesz anulować wyłącznie własną ofertę." };
  }
  if (zData[targetIndex][7] !== "OCZEKUJE") {
    return { sukces: false, wiadomosc: "Ta oferta została już przejęta przez inną osobę." };
  }

  zSheet.getRange(targetIndex + 2, 8).setValue("ANULOWANA");

  // Przywracamy czystą komórkę dyżuru
  var mSheet = ss.getSheetByName(zData[targetIndex][1]) || pobierzBiezacyArkuszMiesiaca(ss);
  var maxRows = Math.min(mSheet.getLastRow(), 45);
  var colB = mSheet.getRange(1, 2, maxRows, 1).getValues();
  var targetRow = -1;
  for (var r = 2; r < maxRows; r++) {
    if (czyToTenSamMinistrant(colB[r][0], nazwisko)) {
      targetRow = r + 1;
      break;
    }
  }
  if (targetRow !== -1) {
    var colDzien = parseInt(zData[targetIndex][2], 10) + 3;
    var targetCell = mSheet.getRange(targetRow, colDzien);
    if (targetCell.getValue() === 0 || targetCell.getValue() === "0") {
      targetCell.setValue("");
    }
  }
  SpreadsheetApp.flush();
  try { synchronizujDoFirestore(ss); } catch (eSync) { Logger.log("Błąd sync: " + eSync.message); }
  return { sukces: true, wiadomosc: "Wycofano ofertę z giełdy. Twój dyżur powrócił do normy." };
}

function zaakceptujZastepstwo(nazwisko, pin, ofertaId) {
  var ss = pobierzAktywnyArkusz();
  var stan = pobierzStanDanych(nazwisko, pin, ss);
  if (!stan.sukces) return stan;

  var zSheet = pobierzArkuszZastepstw(ss);
  if (zSheet.getLastRow() < 2) return { sukces: false, wiadomosc: "Oferta nie jest już dostępna." };

  var zData = zSheet.getRange(2, 1, zSheet.getLastRow() - 1, 8).getDisplayValues();
  var rowIdx = -1;
  var oferta = null;

  for (var i = 0; i < zData.length; i++) {
    if (zData[i][0] === ofertaId && zData[i][7] === "OCZEKUJE") {
      rowIdx = i + 2;
      oferta = zData[i];
      break;
    }
  }

  if (!oferta) return { sukces: false, wiadomosc: "Oferta nie jest już dostępna." };
  if (oferta[3] === nazwisko) return { sukces: false, wiadomosc: "Nie możesz przejąć własnego dyżuru." };

  var dNum = parseInt(oferta[2], 10);
  if (dNum < stan.dzisDzien) {
    return { sukces: false, wiadomosc: "Ta oferta dotyczy minionego dnia i straciła ważność." };
  }

  // Sprawdź czy biorący nie ma już wtedy dyżuru ani nie przejął innego zastępstwa
  if (oferta[6] === "Tydzień" && stan.mojeDyzuryTydzien.indexOf(dNum) !== -1) {
    return { sukces: false, wiadomosc: "Masz już wyznaczony własny dyżur w tym dniu." };
  }
  if ((oferta[6] === "Niedziela" || oferta[6] === "Weekend") && stan.godzinyWeekendy && stan.godzinyWeekendy[dNum]) {
    var mojaGodz = cleanTime(stan.godzinyWeekendy[dNum].godzina);
    var oferGodz = cleanTime(oferta[5]);
    if (mojaGodz && oferGodz && mojaGodz === oferGodz) {
      return { sukces: false, wiadomosc: "Masz już wyznaczony własny dyżur o tej samej godzinie w niedzielę (" + mojaGodz + ")." };
    }
  }
  if (stan.mojePrzejeteZastepstwa && stan.mojePrzejeteZastepstwa[dNum]) {
    return { sukces: false, wiadomosc: "Masz już podjęte inne zastępstwo w tym dniu." };
  }

  var nowStr = Utilities.formatDate(new Date(), "Europe/Warsaw", "yyyy-MM-dd HH:mm:ss");
  zSheet.getRange(rowIdx, 5).setValue(nazwisko);
  zSheet.getRange(rowIdx, 8).setValue("PRZEJETE");
  zSheet.getRange(rowIdx, 10).setValue(nowStr);

  try {
    powiadomOZamianie(oferta[3], nazwisko, "Dzień " + dNum + " " + stan.nazwaMiesiaca + " (Przejęcie dyżuru +4 pkt)");
  } catch (errPush) {
    console.warn("Błąd powiadomienia o zastępstwie:", errPush);
  }

  SpreadsheetApp.flush();
  try { synchronizujDoFirestore(ss); } catch (eSync) { Logger.log("Błąd sync: " + eSync.message); }
  return { sukces: true, wiadomosc: "Gratulacje! Przejąłeś dyżur na " + dNum + " " + stan.nazwaMiesiaca + ". Za obecność otrzymasz +4 pkt!" };
}

// ==========================================
// USPRAWIEDLIWIENIE SŁUŻBY NIEDZIELNEJ (0 PKT, BRAK GIEŁDY)
// ==========================================

function usprawiedliwNiedziele(nazwisko, pin, dzien) {
  var ss = pobierzAktywnyArkusz();
  var stan = pobierzStanDanych(nazwisko, pin, ss);
  if (!stan.sukces) return stan;

  dzien = parseInt(dzien, 10);
  if (isNaN(dzien) || dzien < stan.dzisDzien) {
    return { sukces: false, wiadomosc: "Nie można usprawiedliwić minionego dyżuru." };
  }

  var dt = new Date(stan.rok, stan.miesiacIdx, dzien);
  if (dt.getDay() !== 0 && dt.getDay() !== 6) {
    return { sukces: false, wiadomosc: "Wskazany dzień nie jest niedzielą ani sobotą." };
  }

  var mSheet = pobierzBiezacyArkuszMiesiaca(ss);
  var maxRows = Math.min(mSheet.getLastRow(), 45);
  var colB = mSheet.getRange(1, 2, maxRows, 1).getValues();
  var targetRow = -1;
  for (var r = 2; r < maxRows; r++) {
    if (czyToTenSamMinistrant(colB[r][0], nazwisko)) {
      targetRow = r + 1;
      break;
    }
  }

  if (targetRow === -1) {
    return { sukces: false, wiadomosc: "Nie znaleziono Twojego nazwiska w arkuszu." };
  }

  var colDzien = dzien + 3;
  var targetCell = mSheet.getRange(targetRow, colDzien);
  targetCell.setValue(0);

  SpreadsheetApp.flush();
  try { synchronizujDoFirestore(ss); } catch (eSync) { Logger.log("Błąd sync: " + eSync.message); }

  return {
    sukces: true,
    wiadomosc: "Zgłoszono nieobecność na niedzielę " + dzien + " " + stan.nazwaMiesiaca + ". Masz wpisane 0 pkt (ochrona przed -5 pkt)."
  };
}

function anulujUsprawiedliwienieNiedziela(nazwisko, pin, dzien) {
  var ss = pobierzAktywnyArkusz();
  var stan = pobierzStanDanych(nazwisko, pin, ss);
  if (!stan.sukces) return stan;

  dzien = parseInt(dzien, 10);
  var mSheet = pobierzBiezacyArkuszMiesiaca(ss);
  var maxRows = Math.min(mSheet.getLastRow(), 45);
  var colB = mSheet.getRange(1, 2, maxRows, 1).getValues();
  var targetRow = -1;
  for (var r = 2; r < maxRows; r++) {
    if (czyToTenSamMinistrant(colB[r][0], nazwisko)) {
      targetRow = r + 1;
      break;
    }
  }

  if (targetRow !== -1) {
    var colDzien = dzien + 3;
    var targetCell = mSheet.getRange(targetRow, colDzien);
    if (targetCell.getValue() === 0 || targetCell.getValue() === "0") {
      targetCell.setValue("");
    }
  }

  // Ważne: Jeśli w Zamiany_Zastepstwa istnieje oferta na ten dzień ze statusem OCZEKUJE, anulujemy ją!
  var zSheet = ss.getSheetByName("Zamiany_Zastepstwa");
  if (zSheet && zSheet.getLastRow() > 1) {
    var zData = zSheet.getRange(2, 1, zSheet.getLastRow() - 1, 8).getDisplayValues();
    for (var i = 0; i < zData.length; i++) {
      if (czyToTenSamMinistrant(zData[i][3], nazwisko) && parseInt(zData[i][2], 10) === dzien && zData[i][7] === "OCZEKUJE") {
        zSheet.getRange(i + 2, 8).setValue("ANULOWANA");
      }
    }
  }

  SpreadsheetApp.flush();
  try { synchronizujDoFirestore(ss); } catch (eSync) { Logger.log("Błąd sync: " + eSync.message); }
  return {
    sukces: true,
    wiadomosc: "Wycofano zgłoszenie nieobecności. Twój dyżur niedzielny powrócił do normy."
  };
}

// =============================================================
// TRYB ZAKRYSTIA I TABELA MIESIĄCA (NOWE ENDPOINTY)
// =============================================================

function pobierzDaneDlaZakrystii(dzien, godzina, optionalSs) {
  var ss = optionalSs || pobierzAktywnyArkusz();
  var cache = przygotujDaneHarmonogramu(ss);
  if (!cache || !cache.mSheet) {
    return { sukces: false, wiadomosc: "Brak arkusza bieżącego miesiąca." };
  }

  var now = new Date();
  var dNum = parseInt(dzien, 10);
  if (isNaN(dNum) || dNum < 1 || dNum > cache.daysInMonth) {
    dNum = cache.currentDay;
  }

  var dt = new Date(cache.currentYear, cache.currentMonthIdx, dNum);
  var dow = dt.getDay(); // 0=Nd, 1=Pn, ..., 6=Sb

  var gStr = cleanTime(godzina);
  if (!gStr) {
    // Autodetekcja godziny dla danego dnia
    if (dow === 0) {
      var sunHours = ["08:30", "10:00", "11:30"];
      var curH = now.getHours();
      var curM = now.getMinutes();
      var curTotal = curH * 60 + curM;
      var bestH = "10:00";
      if (curTotal > 12 * 60) {
        bestH = "11:30";
      } else {
        var minDiff = 9999;
        for (var shi = 0; shi < sunHours.length; shi++) {
          var parts = sunHours[shi].split(":");
          var totalM = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
          var diff = Math.abs(curTotal - totalM);
          if (diff < minDiff) {
            minDiff = diff;
            bestH = sunHours[shi];
          }
        }
      }
      gStr = bestH;
    } else if (dow === 6) {
      gStr = "17:00";
    } else if (dow === 3) {
      gStr = "08:00";
    } else if (dow === 4) {
      gStr = "17:00";
    } else {
      gStr = "18:00";
    }
  }

  var polishMonthsGenitive = [
    "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
    "lipca", "sierpnia", "września", "października", "listopada", "grudnia"
  ];
  var polishDayNames = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];

  var colValues0Idx = dNum - 1;
  var ministranci = [];
  var juzZapisane = false;

  // Lista wszystkich ministrantów parafii (do wyszukiwarki / dopisania dodatkowego)
  var allUsers = pobierzListeUzytkownikow(ss);
  var allNames = allUsers.map(function(u) { return u.nazwisko; }).filter(function(n) {
    return n.toLowerCase() !== "kościelny" && n.toLowerCase() !== "koscielny";
  }).sort(function(a, b) { return a.localeCompare(b, "pl"); });

  // 1. Zbieramy ministrantów zaplanowanych z grafiku (lub z zamian)
  for (var normName in cache.userRowMap) {
    var uRow = cache.userRowMap[normName];
    if (!uRow || uRow < 3) continue;

    var originalName = cache.colBValues[uRow - 1][0].toString().trim();
    if (!originalName || originalName.toUpperCase().indexOf("GRUPA") !== -1 || originalName.toUpperCase().indexOf("LEKTORZY") !== -1) {
      continue;
    }

    // Wyznacz grupę
    var userGroup = "";
    for (var bR = uRow - 2; bR >= 1; bR--) {
      var valH = cache.colBValues[bR][0].toString().trim();
      if (valH.toUpperCase().indexOf("GRUPA") !== -1 || valH.toUpperCase().indexOf("LEKTOR") !== -1) {
        userGroup = valH;
        break;
      }
    }

    var dyzurInfo = sprawdzCzyMinistrantMaDyzurWDniu(normName, dNum, cache);
    var cellVal = cache.allValues[uRow - 3][colValues0Idx];
    var maDyzur = dyzurInfo.maDyzur;

    // Sprawdzenie godziny mszy
    var czyTaGodzina = false;
    if (dow >= 1 && dow <= 5) {
      var expectedGodz = pobierzGodzineMszyWTygodniu(cache.currentYear, cache.currentMonthIdx, dNum);
      if (cleanTime(expectedGodz) === gStr) {
        czyTaGodzina = true;
      }
    } else if (dow === 0) {
      if (cleanTime(dyzurInfo.godzina) === gStr) {
        czyTaGodzina = true;
      }
    } else if (dow === 6) {
      if (gStr === "17:00" && dyzurInfo.godzina === "17:00") {
        czyTaGodzina = true;
      }
    }

    var hasRecordedVal = (cellVal !== "" && cellVal !== null && typeof cellVal !== "undefined");
    if (hasRecordedVal && (cellVal === 5 || cellVal === -5 || cellVal === 4 || cellVal === 1)) {
      juzZapisane = true;
    }

    if ((maDyzur && czyTaGodzina) || (hasRecordedVal && czyTaGodzina)) {
      var status = "OBECNY";
      var domyslnyStatus = "OBECNY";
      var typ = (dyzurInfo.typ === "ZASTEPSTWO") ? "ZASTEPCA" : "REGULARNY";
      var punkty = 5;
      var zastepuje = null;

      if (typ === "ZASTEPCA") {
        punkty = 4;
        var zList = cache.zastepstwaDni[dNum] || [];
        for (var zi = 0; zi < zList.length; zi++) {
          if (zList[zi].przejmujacy && (zList[zi].przejmujacy.indexOf(normName) !== -1 || normName.indexOf(zList[zi].przejmujacy) !== -1)) {
            zastepuje = zList[zi].oddajacy;
            break;
          }
        }
      }

      // Sprawdź czy usprawiedliwiony (wpisane 0)
      if (cellVal === 0 || cellVal === "0") {
        status = "USPRAWIEDLIWIONY";
        domyslnyStatus = "USPRAWIEDLIWIONY";
      } else if (cellVal === -5 || cellVal === "-5") {
        status = "NIEOBECNY";
        domyslnyStatus = "NIEOBECNY";
      } else if (cellVal === 5 || cellVal === "5" || cellVal === 4 || cellVal === "4") {
        status = "OBECNY";
        domyslnyStatus = "OBECNY";
      }

      ministranci.push({
        nazwisko: originalName,
        normName: normName,
        grupa: userGroup,
        typ: typ,
        zastepuje: zastepuje,
        status: status,
        domyslnyStatus: domyslnyStatus,
        obecnyPkt: punkty,
        poprzedniaWartosc: hasRecordedVal ? cellVal : null
      });
    }
  }

  // 2. Dodatkowo upewnijmy się, że wolne zastępstwa z arkusza Zamiany_Zastepstwa są uwzględnione
  var zListDay = cache.zastepstwaDni[dNum] || [];
  for (var zdi = 0; zdi < zListDay.length; zdi++) {
    var zObj = zListDay[zdi];
    var zGodz = cleanTime(zObj.godzina);
    if (!zGodz) {
      zGodz = (dow >= 1 && dow <= 5) ? cleanTime(pobierzGodzineMszyWTygodniu(cache.currentYear, cache.currentMonthIdx, dNum)) : "";
    }
    if (zGodz === gStr && (zObj.status === "PRZEJETE" || zObj.status === "ZREALIZOWANE")) {
      var przejName = zObj.przejmujacy;
      var przejNorm = oczyscNazwiskoMinistranta(przejName).toLowerCase();
      var alreadyIn = false;
      for (var mi = 0; mi < ministranci.length; mi++) {
        if (ministranci[mi].normName === przejNorm || ministranci[mi].nazwisko.toLowerCase() === przejName.toLowerCase()) {
          alreadyIn = true;
          break;
        }
      }
      if (!alreadyIn) {
        var pRow = cache.userRowMap[przejNorm] || -1;
        var pVal = (pRow !== -1) ? cache.allValues[pRow - 3][colValues0Idx] : null;
        var pStatus = (pVal === -5 || pVal === "-5") ? "NIEOBECNY" : ((pVal === 0 || pVal === "0") ? "USPRAWIEDLIWIONY" : "OBECNY");
        ministranci.push({
          nazwisko: przejName,
          normName: przejNorm,
          grupa: "Zastępca",
          typ: "ZASTEPCA",
          zastepuje: zObj.oddajacy,
          status: pStatus,
          domyslnyStatus: pStatus,
          obecnyPkt: 4,
          poprzedniaWartosc: pVal
        });
      }
    }
  }

  // Posortuj alfabetycznie
  ministranci.sort(function(a, b) {
    return a.nazwisko.localeCompare(b.nazwisko, "pl");
  });

  return {
    sukces: true,
    rok: cache.currentYear,
    miesiacIdx: cache.currentMonthIdx,
    nazwaMiesiaca: polishMonthsGenitive[cache.currentMonthIdx],
    dzien: dNum,
    godzina: gStr,
    dzienTygodnia: polishDayNames[dow],
    dataTekst: dNum + " " + polishMonthsGenitive[cache.currentMonthIdx] + " (" + polishDayNames[dow] + ")",
    juzZapisane: juzZapisane,
    ministranci: ministranci,
    wszyscyMinistranciParafii: allNames
  };
}

function zapiszObecnoscZZakrystii(rok, miesiacIdx, dzien, godzina, obecnosciList, autor, domyslnePunkty, nazwaLiturgii, usunieciList) {
  var ss = pobierzAktywnyArkusz();
  var mSheet = pobierzBiezacyArkuszMiesiaca(ss);
  if (!mSheet) return { sukces: false, wiadomosc: "Brak arkusza bieżącego miesiąca." };

  var dNum = parseInt(dzien, 10);
  var targetCol = dNum + 3; // Kolumna D to dzień 1
  var maxRows = Math.min(mSheet.getLastRow(), 35);
  var colBValues = mSheet.getRange(1, 2, maxRows, 1).getValues();

  var zSheet = ss.getSheetByName("Zamiany_Zastepstwa");
  var logSheet = ss.getSheetByName("Logi_Zakrystia");
  if (!logSheet) {
    try {
      logSheet = ss.insertSheet("Logi_Zakrystia");
      logSheet.appendRow(["Czas Wpisu", "Data Służby", "Godzina", "Liturgia", "Ministrant", "Status", "Typ", "Punkty", "Zastępuje", "Wpisał"]);
      logSheet.getRange("A1:J1").setFontWeight("bold").setBackground("#d9ead3");
    } catch(eLog) {
      logSheet = null;
    }
  }

  var zapisano = 0;
  var autorStr = autor || "Kościelny";
  var timeStamp = Utilities.formatDate(new Date(), "Europe/Warsaw", "dd.MM.yyyy HH:mm");
  var litNazwa = nazwaLiturgii || "Msza";
  var domPunkty = (typeof domyslnePunkty === "number") ? domyslnePunkty : 5;

  // Cofnij punkty dla usuniętych z tej mszy:
  var usunArray = usunieciList || [];
  for (var ui = 0; ui < usunArray.length; ui++) {
    var uItem = usunArray[ui];
    var uName = oczyscNazwiskoMinistranta(uItem.nazwisko).toLowerCase();
    for (var rU = 2; rU < maxRows; rU++) {
      var rawCellU = colBValues[rU][0] ? colBValues[rU][0].toString().trim() : "";
      if (!rawCellU || rawCellU.length < 3) continue;
      var rawUpperU = rawCellU.toUpperCase();
      if (rawUpperU.indexOf("GRUPA") !== -1 || rawUpperU.indexOf("LEKTOR") !== -1 || rawUpperU.indexOf("SUMA") !== -1) continue;
      var cNameU = oczyscNazwiskoMinistranta(rawCellU).toLowerCase();
      if (cNameU === uName || (cNameU.length >= 4 && uName.indexOf(cNameU) !== -1) || (uName.length >= 4 && cNameU.indexOf(uName) !== -1)) {
        var cellU = mSheet.getRange(rU + 1, targetCol);
        var curValU = cellU.getValue();
        if (curValU !== "" && curValU !== null && curValU !== undefined) {
          var ptsToSub = domPunkty || 3;
          var nextValU = parseFloat(curValU) - ptsToSub;
          if (nextValU <= 0) {
            cellU.clearContent();
            cellU.clearNote();
          } else {
            cellU.setValue(nextValU);
            cellU.setNote("Zmniejszono punkty po usunięciu z: " + litNazwa + " " + godzina + " (-" + ptsToSub + " pkt)\n" + timeStamp);
          }
        }
        if (logSheet) {
          try {
            logSheet.appendRow([timeStamp, dNum + " września", godzina, litNazwa, uItem.nazwisko, "USUNIĘTO", "DODATKOWY", -(domPunkty || 3), "-", autorStr]);
          } catch(e) {}
        }
        break;
      }
    }
  }

  for (var i = 0; i < obecnosciList.length; i++) {
    var item = obecnosciList[i];
    var nName = oczyscNazwiskoMinistranta(item.nazwisko).toLowerCase();
    var status = item.status; // "OBECNY", "NIEOBECNY", "USPRAWIEDLIWIONY"
    var typ = item.typ || "REGULARNY"; // "REGULARNY", "ZASTEPCA", "DODATKOWY"
    var zastepuje = item.zastepuje;
    var ptsObecny = (typeof item.punkty === "number") ? item.punkty : domPunkty;

    // Znajdź wiersz ministranta (ignoruj puste wiersze, nagłówki grup i sumy)
    var targetRow = -1;
    for (var r = 2; r < maxRows; r++) {
      var rawCell = colBValues[r][0] ? colBValues[r][0].toString().trim() : "";
      if (!rawCell || rawCell.length < 3) continue;
      var rawUpper = rawCell.toUpperCase();
      if (rawUpper.indexOf("GRUPA") !== -1 || rawUpper.indexOf("LEKTOR") !== -1 || rawUpper.indexOf("SUMA") !== -1) continue;

      var cName = oczyscNazwiskoMinistranta(rawCell).toLowerCase();
      if (!cName) continue;

      if (cName === nName || (cName.length >= 4 && nName.indexOf(cName) !== -1) || (nName.length >= 4 && cName.indexOf(nName) !== -1)) {
        targetRow = r + 1;
        break;
      }
    }

    if (targetRow === -1) {
      // Ministrant nie ma wiersza w arkuszu (np. ręcznie dodany spoza grafiku) — zapisz tylko do logu
      if (logSheet) {
        try {
          var ptsLog = (typeof item.punkty === "number") ? item.punkty : (status === "NIEOBECNY" ? -5 : status === "OBECNY" ? ptsObecny : 0);
          logSheet.appendRow([timeStamp, dNum + " września " + (rok || 2026), godzina, litNazwa, item.nazwisko, status, typ, ptsLog, zastepuje || "-", autorStr]);
        } catch(eL) {}
      }
      continue;
    }

    var cell = mSheet.getRange(targetRow, targetCol);
    var noteText = litNazwa + " (" + godzina + ")\nStatus: " + status + "\nWpisał: " + autorStr + " (" + timeStamp + ")";

    if (status === "OBECNY") {
      if (typ === "ZASTEPCA") {
        var dtSub = new Date(rok || 2026, (miesiacIdx !== undefined) ? miesiacIdx : 8, dNum);
        var isSunSub = (dtSub.getDay() === 0);
        var subPts = isSunSub ? 3 : 4;
        cell.setValue(subPts);
        noteText += "\nZastępstwo za: " + (zastepuje || "brak") + " (+" + subPts + " pkt)";
        // Przyznaj 1 pkt dla oddającego!
        if (zastepuje) {
          var oddLower = oczyscNazwiskoMinistranta(zastepuje).toLowerCase();
          for (var rOdd = 2; rOdd < maxRows; rOdd++) {
            var rawOdd = colBValues[rOdd][0] ? colBValues[rOdd][0].toString().trim() : "";
            if (!rawOdd || rawOdd.length < 3) continue;
            var rawOddUpper = rawOdd.toUpperCase();
            if (rawOddUpper.indexOf("GRUPA") !== -1 || rawOddUpper.indexOf("LEKTOR") !== -1 || rawOddUpper.indexOf("SUMA") !== -1) continue;

            var oName = oczyscNazwiskoMinistranta(rawOdd).toLowerCase();
            if (!oName) continue;

            if (oName === oddLower || (oName.length >= 4 && oddLower.indexOf(oName) !== -1) || (oddLower.length >= 4 && oName.indexOf(oddLower) !== -1)) {
              var oddCell = mSheet.getRange(rOdd + 1, targetCol);
              oddCell.setValue(1);
              oddCell.setNote("Oddany dyżur zrealizowany przez: " + item.nazwisko + "\n" + litNazwa + " " + godzina + " (+1 pkt) (" + timeStamp + ")");
              break;
            }
          }
        }
        // Zaktualizuj Zamiany_Zastepstwa na ZREALIZOWANE
        if (zSheet && zSheet.getLastRow() > 1) {
          var zVals = zSheet.getRange(2, 1, zSheet.getLastRow() - 1, 8).getValues();
          var subTarget = oczyscNazwiskoMinistranta(item.nazwisko || "").toLowerCase();
          var oddTarget = oczyscNazwiskoMinistranta(zastepuje || "").toLowerCase();
          for (var zi = 0; zi < zVals.length; zi++) {
            var rowDay = parseInt(zVals[zi][2], 10);
            var rowOdd = oczyscNazwiskoMinistranta(zVals[zi][3] || "").toLowerCase();
            var rowPrzej = oczyscNazwiskoMinistranta(zVals[zi][4] || "").toLowerCase();
            var rowStat = (zVals[zi][7] || "").toString().trim();

            if (rowDay === dNum && (rowStat === "PRZEJETE" || rowStat === "OCZEKUJE")) {
              var matchesOdd = (!oddTarget || rowOdd === oddTarget || (rowOdd.length >= 4 && oddTarget.indexOf(rowOdd) !== -1) || (oddTarget.length >= 4 && rowOdd.indexOf(oddTarget) !== -1));
              var matchesPrzej = (!rowPrzej || rowPrzej === subTarget || (rowPrzej.length >= 4 && subTarget.indexOf(rowPrzej) !== -1) || (subTarget.length >= 4 && rowPrzej.indexOf(subTarget) !== -1));
              if (matchesOdd && matchesPrzej) {
                zSheet.getRange(zi + 2, 8).setValue("ZREALIZOWANE");
                break;
              }
            }
          }
        }
      } else {
        cell.setValue(ptsObecny);
        noteText += " (+" + ptsObecny + " pkt)";
      }
      cell.setNote(noteText);
      zapisano++;

      // Jeśli ministrant przyszedł na mszę weekendową (niedziela lub sobota 17:00 wigilijna),
      // to ewentualne -5 za opuszczoną mszę z tego samego weekendu zostaje skasowane!
      try {
        var dtObj = new Date(rok || 2026, (miesiacIdx !== undefined) ? miesiacIdx : 8, dNum);
        var dayOfWeek = dtObj.getDay(); // 0 = niedziela, 6 = sobota
        var czyMszaWeekendowa = (dayOfWeek === 0 || (dayOfWeek === 6 && (godzina === "17:00" || (litNazwa && litNazwa.indexOf("wigil") !== -1))) || (litNazwa && litNazwa.indexOf("niedziel") !== -1));
        if (czyMszaWeekendowa) {
          var weekendDays = [];
          if (dayOfWeek === 0) {
            weekendDays.push(dNum - 1); // Sobota wigilijna wczoraj
          } else if (dayOfWeek === 6) {
            weekendDays.push(dNum + 1); // Niedziela jutro
          }
          weekendDays.forEach(function(wD) {
            if (wD >= 1 && wD <= 31) {
              var wCell = mSheet.getRange(targetRow, wD + 3);
              var wVal = wCell.getValue();
              if (wVal === -5 || wVal === "-5" || parseFloat(wVal) === -5) {
                wCell.clearContent();
                wCell.setNote("Anulowano -5 pkt (ministrant stawił się na innej mszy w ten weekend: " + litNazwa + " " + godzina + ")\n" + timeStamp);
              }
            }
          });
        }
      } catch(eWknd) {}
      if (logSheet) {
        try {
          logSheet.appendRow([
            timeStamp,
            dNum + " września " + (rok || 2026),
            godzina,
            litNazwa,
            item.nazwisko,
            status,
            typ,
            (typ === "ZASTEPCA" ? subPts : ptsObecny),
            zastepuje || "-",
            autorStr
          ]);
        } catch(eAppend) {}
      }
    } else if (status === "NIEOBECNY") {
      if (typ === "ZASTEPCA") {
        cell.setValue(-5);
        noteText += "\nNiestawiony na przejętym dyżurze za: " + (zastepuje || "") + " (-5 pkt)";
        if (zastepuje) {
          var oddLower2 = oczyscNazwiskoMinistranta(zastepuje).toLowerCase();
          for (var rOdd2 = 2; rOdd2 < maxRows; rOdd2++) {
            var rawOdd2 = colBValues[rOdd2][0] ? colBValues[rOdd2][0].toString().trim() : "";
            if (!rawOdd2 || rawOdd2.length < 3) continue;
            var rawOdd2Upper = rawOdd2.toUpperCase();
            if (rawOdd2Upper.indexOf("GRUPA") !== -1 || rawOdd2Upper.indexOf("LEKTOR") !== -1 || rawOdd2Upper.indexOf("SUMA") !== -1) continue;

            var oName2 = oczyscNazwiskoMinistranta(rawOdd2).toLowerCase();
            if (!oName2) continue;

            if (oName2 === oddLower2 || (oName2.length >= 4 && oddLower2.indexOf(oName2) !== -1) || (oddLower2.length >= 4 && oName2.indexOf(oddLower2) !== -1)) {
              var oddCell2 = mSheet.getRange(rOdd2 + 1, targetCol);
              oddCell2.setValue(0);
              oddCell2.setNote("Oddany dyżur (zastępca nie stawił się)\n" + litNazwa + " " + godzina + " (" + timeStamp + ")");
              break;
            }
          }
        }
        if (zSheet && zSheet.getLastRow() > 1) {
          var zVals2 = zSheet.getRange(2, 1, zSheet.getLastRow() - 1, 8).getValues();
          var subTarget2 = oczyscNazwiskoMinistranta(item.nazwisko || "").toLowerCase();
          var oddTarget2 = oczyscNazwiskoMinistranta(zastepuje || "").toLowerCase();
          for (var zi2 = 0; zi2 < zVals2.length; zi2++) {
            var rowDay2 = parseInt(zVals2[zi2][2], 10);
            var rowOdd2 = oczyscNazwiskoMinistranta(zVals2[zi2][3] || "").toLowerCase();
            var rowPrzej2 = oczyscNazwiskoMinistranta(zVals2[zi2][4] || "").toLowerCase();
            var rowStat2 = (zVals2[zi2][7] || "").toString().trim();

            if (rowDay2 === dNum && (rowStat2 === "PRZEJETE" || rowStat2 === "OCZEKUJE")) {
              var matchesOdd2 = (!oddTarget2 || rowOdd2 === oddTarget2 || (rowOdd2.length >= 4 && oddTarget2.indexOf(rowOdd2) !== -1) || (oddTarget2.length >= 4 && rowOdd2.indexOf(oddTarget2) !== -1));
              var matchesPrzej2 = (!rowPrzej2 || rowPrzej2 === subTarget2 || (rowPrzej2.length >= 4 && subTarget2.indexOf(rowPrzej2) !== -1) || (subTarget2.length >= 4 && rowPrzej2.indexOf(subTarget2) !== -1));
              if (matchesOdd2 && matchesPrzej2) {
                zSheet.getRange(zi2 + 2, 8).setValue("NIESTAWIONY");
                break;
              }
            }
          }
        }
      } else {
        cell.setValue(-5);
        noteText += " (-5 pkt)";
      }
      cell.setNote(noteText);
      zapisano++;
      if (logSheet) {
        try {
          logSheet.appendRow([
            timeStamp,
            dNum + " września " + (rok || 2026),
            godzina,
            litNazwa,
            item.nazwisko,
            status,
            typ,
            -5,
            zastepuje || "-",
            autorStr
          ]);
        } catch(eAppend) {}
      }
    } else if (status === "USPRAWIEDLIWIONY") {
      cell.setValue(0);
      noteText += " (0 pkt)";
      cell.setNote(noteText);
      zapisano++;
      if (logSheet) {
        try {
          logSheet.appendRow([
            timeStamp,
            dNum + " września " + (rok || 2026),
            godzina,
            litNazwa,
            item.nazwisko,
            status,
            typ,
            0,
            zastepuje || "-",
            autorStr
          ]);
        } catch(eAppend) {}
      }
    } else if (status === "ODDANY") {
      cell.setValue(1);
      noteText += " (Oddany dyżur +1 pkt)";
      cell.setNote(noteText);
      zapisano++;
      if (logSheet) {
        try {
          logSheet.appendRow([
            timeStamp,
            dNum + " września " + (rok || 2026),
            godzina,
            litNazwa,
            item.nazwisko,
            status,
            typ,
            1,
            zastepuje || "-",
            autorStr
          ]);
        } catch(eAppend) {}
      }
    }
  }

  // Wyczyść ewentualne puste wiersze/nagłówki/sumy w sprawdzanym dniu
  for (var rChk = 2; rChk < maxRows; rChk++) {
    var checkCell = colBValues[rChk][0] ? colBValues[rChk][0].toString().trim() : "";
    var checkUpper = checkCell.toUpperCase();
    if (!checkCell || checkUpper.indexOf("GRUPA") !== -1 || checkUpper.indexOf("LEKTOR") !== -1 || checkUpper.indexOf("SUMA") !== -1) {
      var emptyCell = mSheet.getRange(rChk + 1, targetCol);
      if (emptyCell.getValue() !== "" || emptyCell.getNote() !== "") {
        emptyCell.clearContent();
        emptyCell.clearNote();
      }
    }
  }

  SpreadsheetApp.flush();

  try {
    synchronizujDoFirestore(ss);
  } catch (eSync) {
    Logger.log("Błąd auto-sync Firestore: " + eSync.message);
  }

  return {
    sukces: true,
    zapisano: zapisano,
    wiadomosc: "Pomyślnie zapisano obecność dla " + zapisano + " ministrantów!"
  };
}

function zarejestrujZastepstwoIMsze(oddajacy, przejmujacy, dzien, godzina, punktyPrzejmujacy, punktyOddajacy) {
  var ss = pobierzAktywnyArkusz();
  var sheet = pobierzBiezacyArkuszMiesiaca(ss);
  if (!sheet) return { sukces: false, wiadomosc: "Brak arkusza bieżącego miesiąca." };
  var zSheet = pobierzArkuszZastepstw(ss);
  var dNum = parseInt(dzien, 10);
  var col = dNum + 3;
  var timeStamp = Utilities.formatDate(new Date(), "Europe/Warsaw", "dd.MM.yyyy HH:mm");
  var pPrzej = (typeof punktyPrzejmujacy === "number") ? punktyPrzejmujacy : 4;
  var pOdd = (typeof punktyOddajacy === "number") ? punktyOddajacy : 1;

  // 1. Dodaj wpis w Zamiany_Zastepstwa
  var id = "ZAST_" + dNum + "_" + (godzina ? godzina.replace(":", "") : "1700") + "_" + new Date().getTime();
  zSheet.appendRow([
    id,
    sheet.getName(),
    dNum,
    oddajacy,
    przejmujacy,
    godzina || "17:00",
    "Niedziela",
    "ZREALIZOWANE",
    timeStamp,
    timeStamp
  ]);

  // 2. Wpisanie punktów do arkusza miesiąca
  var maxRows = Math.min(sheet.getLastRow(), 35);
  var names = sheet.getRange(1, 2, maxRows, 1).getValues();

  var oddRow = -1, przejRow = -1;
  for (var r = 0; r < names.length; r++) {
    var val = (names[r][0] || "").toString().trim();
    if (czyToTenSamMinistrant(val, oddajacy)) oddRow = r + 1;
    if (czyToTenSamMinistrant(val, przejmujacy)) przejRow = r + 1;
  }

  if (przejRow !== -1) {
    var cPrzej = sheet.getRange(przejRow, col);
    cPrzej.setValue(pPrzej);
    cPrzej.setNote("Msza wigilijna (" + (godzina || "17:00") + ")\nZastępstwo za: " + oddajacy + " (+" + pPrzej + " pkt)\n" + timeStamp);
  }

  if (oddRow !== -1) {
    var cOdd = sheet.getRange(oddRow, col);
    cOdd.setValue(pOdd);
    cOdd.setNote("Oddany dyżur (" + (godzina || "17:00") + ")\nZastąpił: " + przejmujacy + " (+" + pOdd + " pkt)\n" + timeStamp);
  }

  SpreadsheetApp.flush();

  // 3. Natychmiastowa synchronizacja do Firestore stan_grafiku
  var resTabela = pobierzPelnaTabeleMiesiaca(sheet.getName(), ss);

  return {
    sukces: true,
    wiadomosc: "Pomyślnie zarejestrowano: " + przejmujacy + " (+" + pPrzej + " pkt, zastępca), " + oddajacy + " (+" + pOdd + " pkt)",
    tabela: resTabela
  };
}

function resetujObecnoscDnia(dzien) {
  var ss = pobierzAktywnyArkusz();
  var mSheet = pobierzBiezacyArkuszMiesiaca(ss);
  if (!mSheet) return { sukces: false, wiadomosc: "Brak arkusza" };
  var dNum = parseInt(dzien, 10);
  var targetCol = dNum + 3;
  var maxRows = Math.min(mSheet.getLastRow(), 35);
  var range = mSheet.getRange(3, targetCol, maxRows - 2, 1);
  range.clearContent();
  range.clearNote();
  SpreadsheetApp.flush();
  synchronizujDoFirestore(ss);
  return { sukces: true, wiadomosc: "Wyczyszczono obecność dla dnia " + dNum };
}

function wyczyscPusteWierszeArkusza() {
  var ss = pobierzAktywnyArkusz();
  var mSheet = pobierzBiezacyArkuszMiesiaca(ss);
  if (!mSheet) return { sukces: false, wiadomosc: "Brak arkusza" };
  var maxRows = Math.min(mSheet.getLastRow(), 35);
  var maxCols = Math.min(mSheet.getLastColumn(), 36);
  var colBValues = mSheet.getRange(1, 2, maxRows, 1).getValues();

  var wyczyszczone = [];
  for (var r = 2; r < maxRows; r++) {
    var rawCell = colBValues[r][0] ? colBValues[r][0].toString().trim() : "";
    var rawUpper = rawCell.toUpperCase();
    if (!rawCell || rawUpper.indexOf("GRUPA") !== -1 || rawUpper.indexOf("SUMA") !== -1 || rawUpper.indexOf("LEKTOR") !== -1) {
      var rowRange = mSheet.getRange(r + 1, 4, 1, maxCols - 3);
      rowRange.clearContent();
      rowRange.clearNote();
      wyczyszczone.push(r + 1);
    }
  }
  SpreadsheetApp.flush();
  synchronizujDoFirestore(ss);
  return { sukces: true, wiadomosc: "Wyczyszczono puste wiersze i nagłówki", wiersze: wyczyszczone };
}

function usunKolumneIloscMszy() {
  var ss = pobierzAktywnyArkusz();
  var sheets = ss.getSheets();
  var usunieto = 0;
  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s];
    var sName = sheet.getName();
    if (sName.indexOf("Zamiany") !== -1 || sName.indexOf("Uzytkownicy") !== -1 || sName.indexOf("Wzorzec") !== -1 || sName.indexOf("Odpowiedzi") !== -1 || sName.indexOf("Form") !== -1) {
      continue;
    }
    try {
      var maxCols = sheet.getLastColumn();
      if (maxCols < 4) continue;
      var row1 = sheet.getRange(1, 1, 1, maxCols).getValues()[0];
      for (var c = maxCols - 1; c >= 3; c--) {
        var val = (row1[c] || "").toString().trim().toUpperCase();
        if (val.indexOf("ILOŚĆ") !== -1 || val.indexOf("ILOSC") !== -1 || val.indexOf("MSZY") !== -1) {
          try {
            sheet.deleteColumn(c + 1);
            usunieto++;
          } catch(eDel) {
            sheet.hideColumns(c + 1);
            sheet.getRange(1, c + 1, sheet.getLastRow(), 1).clearContent();
            usunieto++;
          }
        }
      }
    } catch(eSheet) {
      Logger.log("Pominięto arkusz " + sName + ": " + eSheet.message);
    }
  }
  SpreadsheetApp.flush();
  try {
    synchronizujDoFirestore(ss);
  } catch (eSync) {
    Logger.log("Błąd sync Firestore: " + eSync.message);
  }
  return { sukces: true, usunieto: usunieto, wiadomosc: "Pomyślnie sprawdzono arkusze i usunięto " + usunieto + " kolumn ILOŚĆ MSZY." };
}

function pobierzPelnaTabeleMiesiaca(nazwaMiesiaca, optionalSs) {
  var ss;
  if (nazwaMiesiaca && typeof nazwaMiesiaca !== "string") {
    ss = nazwaMiesiaca;
    nazwaMiesiaca = null;
  } else {
    ss = optionalSs || pobierzAktywnyArkusz();
  }

  var mSheet = null;
  if (nazwaMiesiaca && typeof nazwaMiesiaca === "string") {
    mSheet = ss.getSheetByName(nazwaMiesiaca);
  }
  if (!mSheet) {
    mSheet = pobierzBiezacyArkuszMiesiaca(ss);
  }
  if (!mSheet) return { sukces: false, wiadomosc: "Brak arkusza miesiąca." };

  var now = new Date();
  var currentYear = now.getFullYear();
  var currentMonthIdx = now.getMonth();

  var sheetName = mSheet.getName();
  var parts = sheetName.split('_');
  var mPrefix = parts[0].toLowerCase();
  if (parts.length > 1 && !isNaN(parseInt(parts[1], 10))) {
    currentYear = parseInt(parts[1], 10);
  }

  var polishMonths = [
    "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
    "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
  ];
  var polishMonthsAlt = [
    "styczen", "luty", "marzec", "kwiecien", "maj", "czerwiec",
    "lipiec", "sierpien", "wrzesien", "pazdziernik", "listopad", "grudzien"
  ];

  for (var mi = 0; mi < 12; mi++) {
    if (polishMonthsAlt[mi] === mPrefix || polishMonths[mi].toLowerCase() === mPrefix) {
      currentMonthIdx = mi;
      break;
    }
  }

  var daysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
  var polishMonthsGenitive = [
    "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
    "lipca", "sierpnia", "września", "października", "listopada", "grudnia"
  ];
  var shortDayNames = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"];

  var maxRows = Math.min(mSheet.getLastRow(), 35);
  var colB = mSheet.getRange(1, 2, maxRows, 1).getValues();

  var row1 = mSheet.getRange(1, 1, 1, Math.min(mSheet.getLastColumn(), 45)).getValues()[0];
  var sumaColIdx = -1;
  for (var c = 3; c < row1.length; c++) {
    var hVal = row1[c].toString().trim().toUpperCase();
    if (hVal === "SUMA") {
      sumaColIdx = c + 1;
      break;
    }
  }
  if (sumaColIdx === -1) {
    sumaColIdx = 4 + daysInMonth;
  }

  var backgrounds = mSheet.getRange(3, 4, maxRows - 2, daysInMonth).getBackgrounds();
  var values = mSheet.getRange(3, 4, maxRows - 2, daysInMonth).getValues();
  var sumaValues = mSheet.getRange(3, sumaColIdx, maxRows - 2, 1).getValues();

  var dniNaglowek = [];
  for (var d = 1; d <= daysInMonth; d++) {
    var dt = new Date(currentYear, currentMonthIdx, d);
    var dow = dt.getDay();
    dniNaglowek.push({
      dzien: d,
      skrotDnia: shortDayNames[dow],
      czyNiedziela: (dow === 0),
      czySobota: (dow === 6)
    });
  }

  var wiersze = [];
  var currentGroup = "I GRUPA (CZERWONA)";
  var unikalneGrupy = ["I GRUPA (CZERWONA)", "II GRUPA (POMARAŃCZOWA)", "III GRUPA (ZIELONA)", "IV GRUPA (ŻÓŁTA)"];

  var groupsByRow = {
    3: "I GRUPA (CZERWONA)", 4: "I GRUPA (CZERWONA)", 5: "I GRUPA (CZERWONA)", 6: "I GRUPA (CZERWONA)",
    8: "II GRUPA (POMARAŃCZOWA)", 9: "II GRUPA (POMARAŃCZOWA)", 10: "II GRUPA (POMARAŃCZOWA)", 11: "II GRUPA (POMARAŃCZOWA)", 12: "II GRUPA (POMARAŃCZOWA)",
    14: "III GRUPA (ZIELONA)", 15: "III GRUPA (ZIELONA)", 16: "III GRUPA (ZIELONA)", 17: "III GRUPA (ZIELONA)", 18: "III GRUPA (ZIELONA)", 19: "III GRUPA (ZIELONA)",
    21: "IV GRUPA (ŻÓŁTA)", 22: "IV GRUPA (ŻÓŁTA)", 23: "IV GRUPA (ŻÓŁTA)", 24: "IV GRUPA (ŻÓŁTA)", 25: "IV GRUPA (ŻÓŁTA)", 26: "IV GRUPA (ŻÓŁTA)"
  };

  for (var r = 0; r < maxRows - 2; r++) {
    var rowNum = r + 3; // Wiersz w arkuszu (1-indexed)
    var rawName = colB[r + 2][0].toString().trim();
    if (!rawName) continue;

    var rawUpper = rawName.toUpperCase();
    if (rawUpper.indexOf("RANKING") !== -1) {
      // Koniec grafiku służby - poniżej znajduje się podsumowanie/ranking, przerywamy pętlę!
      break;
    }

    if (rawUpper.indexOf("GRUPA") !== -1) {
      if (rawUpper.indexOf("CZERWON") !== -1 || rawUpper.indexOf("I GRUPA") !== -1) currentGroup = "I GRUPA (CZERWONA)";
      else if (rawUpper.indexOf("POMARAŃCZ") !== -1 || rawUpper.indexOf("POMARANCZ") !== -1 || rawUpper.indexOf("II GRUPA") !== -1) currentGroup = "II GRUPA (POMARAŃCZOWA)";
      else if (rawUpper.indexOf("ZIELON") !== -1 || rawUpper.indexOf("III GRUPA") !== -1) currentGroup = "III GRUPA (ZIELONA)";
      else if (rawUpper.indexOf("ŻÓŁT") !== -1 || rawUpper.indexOf("ZOLT") !== -1 || rawUpper.indexOf("IV GRUPA") !== -1) currentGroup = "IV GRUPA (ŻÓŁTA)";
      continue;
    }

    // Pomiń sumy, nagłówek kolumny "MINISTRANT", błędy formuł #REF! i zbędne komórki
    if (rawUpper === "SUMA" || rawUpper === "MINISTRANT" || rawUpper === "MINISTRANCI" || rawUpper.indexOf("#REF") !== -1 || rawUpper.indexOf("ILOŚĆ MSZY") !== -1 || rawUpper.indexOf("ILOSC MSZY") !== -1) {
      continue;
    }

    var cleanName = oczyscNazwiskoMinistranta(rawName);
    var stopienInfo = wyciagnijStopienMinistranta(rawName);
    if (!cleanName || cleanName.length < 4 || cleanName.toLowerCase() === "kościelny" || cleanName.indexOf("#") !== -1 || cleanName.toUpperCase() === "MINISTRANT") {
      continue;
    }

    // Zabezpieczenie przed duplikatami ministrantów (np. z tabel podsumowań na dole arkusza)
    var juzJest = wiersze.some(function(w) { return w.nazwisko.toLowerCase() === cleanName.toLowerCase(); });
    if (juzJest) {
      continue;
    }

    // Przypisz grupę: z mapy wierszy lub bieżącej wykrytej grupy
    var userGroup = groupsByRow[rowNum] || currentGroup;

    var komorki = [];
    for (var dIdx = 0; dIdx < daysInMonth; dIdx++) {
      var bg = (backgrounds[r][dIdx] || "").toLowerCase();
      var isColored = (bg !== "#ffffff" && bg !== "" && bg !== "transparent");
      var val = values[r][dIdx];
      var hasVal = (val !== "" && val !== null && typeof val !== "undefined");
      var numVal = hasVal ? parseFloat(val) : null;

      komorki.push({
        dzien: dIdx + 1,
        maDyzur: isColored,
        bg: isColored ? bg : "",
        wartosc: hasVal ? (isNaN(numVal) ? val : numVal) : null
      });
    }

    var rawSuma = sumaValues[r][0];
    var pts = parseFloat(rawSuma);
    if (isNaN(pts)) pts = 0;

    wiersze.push({
      nazwisko: cleanName,
      grupa: userGroup,
      stopien: stopienInfo.stopien,
      stopienRanga: stopienInfo.ranga,
      komorki: komorki,
      suma: Math.round(pts * 10) / 10
    });
  }

  var rankingiInfo = null;
  try {
    rankingiInfo = obliczRankingiIPunkty(ss, "", currentYear, currentMonthIdx);
  } catch (eRank) {
    Logger.log("Błąd rankingu w pobierzPelnaTabeleMiesiaca: " + eRank.message);
  }

  var zamianyZastepstwa = [];
  var wolneZastepstwa = [];
  var currentDay = now.getDate();
  var zSheet = ss.getSheetByName("Zamiany_Zastepstwa");
  if (zSheet && zSheet.getLastRow() > 1) {
    var zDataAll = zSheet.getRange(2, 1, zSheet.getLastRow() - 1, 10).getDisplayValues();
    var polishDayNames = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];
    for (var zi = 0; zi < zDataAll.length; zi++) {
      var zRow = zDataAll[zi];
      var zId = zRow[0];
      var zDay = parseInt(zRow[2], 10);
      var zOdd = zRow[3];
      var zPrzej = zRow[4];
      var zGodz = cleanTime(zRow[5]);
      var zTyp = zRow[6] || "Tydzień";
      var zStat = zRow[7].trim();
      if (zStat === "ANULOWANA") continue;
      zamianyZastepstwa.push({
        id: zId,
        dzien: zDay,
        oddajacy: zOdd,
        przejmujacy: zPrzej,
        godzina: zGodz,
        typ: zTyp,
        status: zStat
      });
      var czyMinelo = (zDay === currentDay && czyMszaJuzMinaDzis(zGodz));
      if (zStat === "OCZEKUJE" && zDay >= currentDay && !czyMinelo && zTyp === "Tydzień") {
        var dtZ = new Date(currentYear, currentMonthIdx, zDay);
        wolneZastepstwa.push({
          id: zId,
          dzien: zDay,
          dzienTygodnia: polishDayNames[dtZ.getDay()],
          oddajacy: zOdd,
          godzina: zGodz,
          typ: "Tydzień",
          punkty: 4
        });
      }
    }
  }

  // Auto-korekta komórek w arkuszu: jeśli oferta w Zamiany_Zastepstwa ma status OCZEKUJE, w arkuszu MUSI być wpisane 0
  if (zSheet && zSheet.getLastRow() > 1 && zamianyZastepstwa.length > 0) {
    var maxRowsArk = Math.min(mSheet.getLastRow(), 45);
    var colBArk = mSheet.getRange(1, 2, maxRowsArk, 1).getValues();
    var needFlushArk = false;
    for (var zi = 0; zi < zamianyZastepstwa.length; zi++) {
      var zz = zamianyZastepstwa[zi];
      if (zz.status === "OCZEKUJE") {
        var tRow = -1;
        for (var r = 2; r < maxRowsArk; r++) {
          if (czyToTenSamMinistrant(colBArk[r][0], zz.oddajacy)) {
            tRow = r + 1;
            break;
          }
        }
        if (tRow !== -1) {
          var colD = parseInt(zz.dzien, 10) + 3;
          var curCell = mSheet.getRange(tRow, colD);
          var curVal = curCell.getValue();
          if (curVal === "" || curVal === null || typeof curVal === "undefined") {
            curCell.setValue(0);
            needFlushArk = true;
            // Zaktualizuj komórkę również w zwracanej tablicy wiersze
            for (var wi = 0; wi < wiersze.length; wi++) {
              if (czyToTenSamMinistrant(wiersze[wi].nazwisko, zz.oddajacy)) {
                if (wiersze[wi].komorki && wiersze[wi].komorki[parseInt(zz.dzien, 10) - 1]) {
                  wiersze[wi].komorki[parseInt(zz.dzien, 10) - 1].wartosc = 0;
                }
                break;
              }
            }
          }
        }
      }
    }
    if (needFlushArk) {
      SpreadsheetApp.flush();
    }
  }

  var rotowaneGodziny = wyznaczRotowaneGodzinyGrup(currentYear, currentMonthIdx);
  var sundaySheet = ss.getSheetByName("Grafik_Niedziele");
  var godzinyGrup = {};
  if (sundaySheet && currentMonthIdx === 8 && currentYear === 2026) {
    var gData = sundaySheet.getRange("A2:B5").getDisplayValues();
    for (var gIdx = 0; gIdx < gData.length; gIdx++) {
      var grpKey = gData[gIdx][0].toString().trim();
      var grpVal = cleanTime(gData[gIdx][1]);
      if (grpKey && grpVal) {
        godzinyGrup[grpKey] = grpVal;
      }
    }
  } else {
    godzinyGrup = rotowaneGodziny;
  }

  var wynik = {
    sukces: true,
    sheetName: sheetName,
    rok: currentYear,
    miesiacIdx: currentMonthIdx,
    nazwaMiesiaca: polishMonths[currentMonthIdx],
    nazwaMiesiacaDopelniacz: polishMonthsGenitive[currentMonthIdx],
    daysInMonth: daysInMonth,
    dniNaglowek: dniNaglowek,
    grupy: unikalneGrupy,
    godzinyGrup: godzinyGrup,
    wiersze: wiersze,
    ranking: (rankingiInfo && rankingiInfo.rankingMiesiac) || [],
    rankingMiesiac: (rankingiInfo && rankingiInfo.rankingMiesiac) || [],
    rankingRok: (rankingiInfo && rankingiInfo.rankingRok) || [],
    rankingMinusy: (rankingiInfo && rankingiInfo.rankingMinusy) || [],
    rankingiMiesiecy: (rankingiInfo && rankingiInfo.rankingiMiesiecy) || {},
    zamianyZastepstwa: zamianyZastepstwa,
    wolneZastepstwa: wolneZastepstwa,
    liturgieDodatkowe: pobierzWszystkieLiturgieDodatkowe(ss),
    historiaWpisow: pobierzHistorieWpisowZakrystii(ss, 60)
  };

  try {
    zapiszDokumentFirestore("stan_grafiku", sheetName, wynik);
  } catch (eF) {
    Logger.log("Błąd zapisu do Firestore: " + eF.message);
  }

  return wynik;
}

function pobierzDostepneMiesiace(optionalSs) {
  var ss = optionalSs || pobierzAktywnyArkusz();
  var sheets = ss.getSheets();
  var polishMonths = [
    "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
    "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
  ];
  var polishMonthsAlt = [
    "styczen", "luty", "marzec", "kwiecien", "maj", "czerwiec",
    "lipiec", "sierpien", "wrzesien", "pazdziernik", "listopad", "grudzien"
  ];
  var result = [];
  var now = new Date();
  for (var s = 0; s < sheets.length; s++) {
    var name = sheets[s].getName();
    var p = name.split('_');
    if (p.length === 2 && !isNaN(parseInt(p[1], 10))) {
      var mStr = p[0].toLowerCase();
      for (var mi = 0; mi < 12; mi++) {
        if (polishMonthsAlt[mi] === mStr || polishMonths[mi].toLowerCase() === mStr) {
          result.push({
            id: name,
            rok: parseInt(p[1], 10),
            miesiacIdx: mi,
            nazwa: polishMonths[mi] + " " + p[1],
            czyBiezacy: (mi === now.getMonth() && parseInt(p[1], 10) === now.getFullYear())
          });
          break;
        }
      }
    }
  }
  result.sort(function(a, b) {
    return (a.rok - b.rok) || (a.miesiacIdx - b.miesiacIdx);
  });
  return result;
}

function synchronizujWszystkieMiesiaceDoFirestore(optionalSs) {
  var ss = optionalSs || pobierzAktywnyArkusz();
  var miesiace = pobierzDostepneMiesiace(ss);
  var zsynchronizowane = [];
  for (var i = 0; i < miesiace.length; i++) {
    try {
      pobierzPelnaTabeleMiesiaca(miesiace[i].id, ss);
      zsynchronizowane.push(miesiace[i].id);
    } catch (e) {
      Logger.log("Błąd sync miesiąca " + miesiace[i].id + ": " + e.message);
    }
  }
  return { sukces: true, zsynchronizowane: zsynchronizowane };
}

// =============================================================
// MODUŁ SYNCHRONIZACJI Z CLOUD FIRESTORE (WARSZAWA - europe-central2)
// =============================================================

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
    var fields = {};
    for (var k in val) {
      if (val.hasOwnProperty(k)) {
        fields[k] = toFirestoreValue(val[k]);
      }
    }
    return { mapValue: { fields: fields } };
  }
  return { stringValue: String(val) };
}

function zapiszDokumentFirestore(kolekcja, docId, obiektDanych) {
  try {
    var apiKey = "AIzaSyAsgkKWXr-L3fDHQODxioVssvIGL9SQePk";
    var projectId = "makole-85f32";
    var url = "https://firestore.googleapis.com/v1/projects/" + projectId + "/databases/(default)/documents/" + encodeURIComponent(kolekcja) + "/" + encodeURIComponent(docId) + "?key=" + apiKey;

    var fields = {};
    for (var k in obiektDanych) {
      if (obiektDanych.hasOwnProperty(k)) {
        fields[k] = toFirestoreValue(obiektDanych[k]);
      }
    }

    var payload = JSON.stringify({ fields: fields });
    var opcje = {
      method: "patch",
      contentType: "application/json",
      payload: payload,
      muteHttpExceptions: true
    };

    var resp = UrlFetchApp.fetch(url, opcje);
    return { sukces: (resp.getResponseCode() === 200), kod: resp.getResponseCode() };
  } catch (e) {
    Logger.log("Błąd zapiszDokumentFirestore: " + e.message);
    return { sukces: false, blad: e.message };
  }
}

function synchronizujDoFirestore(optionalSs) {
  try {
    var ss = optionalSs || pobierzAktywnyArkusz();
    var uzytkownicyList = pobierzListeUzytkownikow(ss);
    if (uzytkownicyList && Array.isArray(uzytkownicyList)) {
      var sanitizedUsers = uzytkownicyList.map(function(u) {
        return { nazwisko: u.nazwisko, maPin: !!u.maPin };
      });
      zapiszDokumentFirestore("konfiguracja", "uzytkownicy", {
        lista: sanitizedUsers,
        zaktualizowano: new Date().toISOString()
      });
    }

    var tabelaRes = pobierzPelnaTabeleMiesiaca(ss);
    var now = new Date();
    var currentYear = (tabelaRes && tabelaRes.rok) || now.getFullYear();
    var currentMonthIdx = (tabelaRes && tabelaRes.miesiacIdx !== undefined) ? tabelaRes.miesiacIdx : now.getMonth();
    var currentDay = now.getDate();

    // 1. Rankingi (miesięczny, roczny, minusy)
    var rankingiInfo = obliczRankingiIPunkty(ss, "", currentYear, currentMonthIdx);

    // 2. Giełda Tydzień (oferty aktywne 1:1)
    var gieldaTydzien = [];
    var tSheet = ss.getSheetByName("Zamiany_Tydzien");
    if (tSheet && tSheet.getLastRow() > 1) {
      var tLastCol = Math.max(tSheet.getLastColumn(), 10);
      var tData = tSheet.getRange(2, 1, tSheet.getLastRow() - 1, tLastCol).getDisplayValues();
      for (var t = 0; t < tData.length; t++) {
        var dOdd = parseInt(tData[t][2], 10);
        var tStatus = tData[t][7].trim();
        if (tStatus === "OCZEKUJE" && dOdd >= currentDay) {
          var akceptowaneRaw = tData[t][4].toString().replace(/'/g, '').split(/[,;]/);
          var akceptowaneDni = [];
          for (var a = 0; a < akceptowaneRaw.length; a++) {
            var num = parseInt(akceptowaneRaw[a].trim(), 10);
            if (!isNaN(num)) akceptowaneDni.push(num);
          }
          var godzOdd = pobierzGodzineMszyWTygodniu(currentYear, currentMonthIdx, dOdd);
          var godzNazwa = pobierzPelnaNazweMszyWTygodniu(currentYear, currentMonthIdx, dOdd);
          var autoOddVal = tData[t][9] ? tData[t][9].trim().toUpperCase() : "TAK";

          gieldaTydzien.push({
            id: tData[t][0],
            dzienOddawany: dOdd,
            godzina: godzOdd,
            nazwaMszy: godzNazwa,
            wystawiajacy: tData[t][3],
            akceptowaneDni: akceptowaneDni,
            autoOddaj: (autoOddVal !== "NIE" && autoOddVal !== "FALSE")
          });
        }
      }
    }

    // 3. Giełda Niedziele
    var gieldaNiedziele = [];
    var nSheet = ss.getSheetByName("Zamiany_Niedziele");
    if (nSheet && nSheet.getLastRow() > 1) {
      var nData = nSheet.getRange(2, 1, nSheet.getLastRow() - 1, 9).getDisplayValues();
      for (var n = 0; n < nData.length; n++) {
        var dSun = parseInt(nData[n][2], 10);
        if (nData[n][8] === "OCZEKUJE" && dSun >= currentDay) {
          gieldaNiedziele.push({
            id: nData[n][0],
            dzien: dSun,
            wystawiajacy: nData[n][3],
            godzinaOddawana: cleanTime(nData[n][4]),
            akceptowaneGodziny: nData[n][5].toString().replace(/'/g, '').split(/[,;]/).map(function(s) { return cleanTime(s); }).filter(function(s) { return s.length > 0; })
          });
        }
      }
    }

    // 4. Wolne zastępstwa i rejestr zastępstw
    var wolneZastepstwa = [];
    var zamianyZastepstwa = [];
    var zSheet = ss.getSheetByName("Zamiany_Zastepstwa");
    if (zSheet && zSheet.getLastRow() > 1) {
      var zDataAll = zSheet.getRange(2, 1, zSheet.getLastRow() - 1, 10).getDisplayValues();
      var polishDayNames = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];
      for (var zi = 0; zi < zDataAll.length; zi++) {
        var zRow = zDataAll[zi];
        var zId = zRow[0];
        var zDay = parseInt(zRow[2], 10);
        var zOdd = zRow[3];
        var zPrzej = zRow[4];
        var zGodz = cleanTime(zRow[5]);
        var zTyp = zRow[6] || "Tydzień";
        var zStat = zRow[7].trim();

        // Dyżury niedzielne/weekendowe nigdy nie mogą oczekiwać jako wolne zastępstwa
        if ((zTyp === "Niedziela" || zTyp === "Weekend") && zStat === "OCZEKUJE") {
          zStat = "ANULOWANA";
          try { zSheet.getRange(zi + 2, 8).setValue("ANULOWANA"); } catch(eCancel) {}
        }

        if (zStat === "ANULOWANA") continue;

        zamianyZastepstwa.push({
          id: zId,
          dzien: zDay,
          oddajacy: zOdd,
          przejmujacy: zPrzej,
          godzina: zGodz,
          typ: zTyp,
          status: zStat
        });

        var czyMinelo = (zDay === currentDay && czyMszaJuzMinaDzis(zGodz));
        if (zStat === "OCZEKUJE" && zDay >= currentDay && !czyMinelo && zTyp === "Tydzień") {
          var dtZ = new Date(currentYear, currentMonthIdx, zDay);
          wolneZastepstwa.push({
            id: zId,
            dzien: zDay,
            dzienTygodnia: polishDayNames[dtZ.getDay()],
            oddajacy: zOdd,
            godzina: zGodz,
            typ: "Tydzień",
            punkty: 4
          });
        }
      }
    }
    wolneZastepstwa.sort(function(a, b) { return a.dzien - b.dzien; });

    var docNazwa = (tabelaRes && tabelaRes.nazwaMiesiaca) ? (tabelaRes.nazwaMiesiaca + "_" + currentYear) : "Wrzesień_2026";

    var payloadGrafik = {
      zaktualizowano: new Date().toISOString(),
      rok: currentYear,
      miesiacIdx: currentMonthIdx,
      nazwaMiesiaca: (tabelaRes && tabelaRes.nazwaMiesiaca) || "Wrzesień",
      grupy: (tabelaRes && tabelaRes.grupy) || [],
      dniNaglowek: (tabelaRes && tabelaRes.dniNaglowek) || [],
      wiersze: (tabelaRes && tabelaRes.wiersze) || [],
      ranking: (rankingiInfo && rankingiInfo.rankingMiesiac) || [],
      rankingMiesiac: (rankingiInfo && rankingiInfo.rankingMiesiac) || [],
      rankingRok: (rankingiInfo && rankingiInfo.rankingRok) || [],
      rankingMinusy: (rankingiInfo && rankingiInfo.rankingMinusy) || [],
      rankingiMiesiecy: (rankingiInfo && rankingiInfo.rankingiMiesiecy) || {},
      gieldaTydzien: gieldaTydzien,
      gieldaNiedziele: gieldaNiedziele,
      wolneZastepstwa: wolneZastepstwa,
      zamianyZastepstwa: zamianyZastepstwa,
      liturgieDodatkowe: pobierzWszystkieLiturgieDodatkowe(ss),
      historiaWpisow: pobierzHistorieWpisowZakrystii(ss, 60)
    };

    var resGrafik = zapiszDokumentFirestore("stan_grafiku", docNazwa, payloadGrafik);
    return { sukces: true, wynikGrafik: resGrafik };
  } catch (e) {
    Logger.log("Błąd synchronizujDoFirestore: " + e.message);
    return { sukces: false, blad: e.message };
  }
}


function oglosDodatkowaLiturgie(liturgia) {
  try {
    if (!liturgia) return { sukces: false, wiadomosc: "Brak danych liturgii." };
    var ss = pobierzAktywnyArkusz();
    var sheet = ss.getSheetByName("Liturgie_Dodatkowe");
    if (!sheet) {
      sheet = ss.insertSheet("Liturgie_Dodatkowe");
      sheet.appendRow(["ID", "Rok", "Miesiąc", "Dzień", "Godzina", "Rodzaj", "Punkty", "Data Tekst", "Opis", "Utworzył", "Zgłoszeni", "Data Utworzenia"]);
      sheet.getRange("A1:L1").setFontWeight("bold").setBackground("#cfe2f3");
    }

    var id = liturgia.id || ("LIT_" + new Date().getTime());
    var rok = liturgia.rok || new Date().getFullYear();
    var miesiac = (liturgia.miesiacIdx !== undefined) ? liturgia.miesiacIdx : new Date().getMonth();
    var dzien = parseInt(liturgia.dzien, 10);
    var godzina = cleanTime(liturgia.godzina) || "11:00";
    var mGodz = godzina.match(/^(\d{1,2}):(\d{2})$/);
    if (!mGodz || parseInt(mGodz[1], 10) < 6 || parseInt(mGodz[1], 10) > 22) {
      godzina = "11:00";
    }
    var rodzaj = liturgia.rodzaj || "Pogrzeb";
    var punkty = parseInt(liturgia.punkty, 10) || 3;
    var dataTekst = liturgia.dataTekst || (dzien + " września");
    var opis = liturgia.opis || rodzaj;
    var utworzyl = liturgia.utworzyl || "Kościelny";
    var zgloszeni = Array.isArray(liturgia.zgloszeni) ? liturgia.zgloszeni.join(", ") : (liturgia.zgloszeni || "");
    var utworzono = new Date().toISOString();

    sheet.appendRow([id, rok, miesiac, dzien, "'" + godzina, rodzaj, punkty, dataTekst, opis, utworzyl, zgloszeni, utworzono]);
    sheet.getRange(sheet.getLastRow(), 5).setNumberFormat("@").setValue("'" + godzina);

    // Wysłanie powiadomień PUSH (FCM) do ministrantów
    var tSheet = ss.getSheetByName("Powiadomienia_Tokeny");
    var powiadomionoLiczba = 0;
    if (tSheet && tSheet.getLastRow() > 1) {
      var tokensData = tSheet.getRange(2, 1, tSheet.getLastRow() - 1, 2).getValues();
      var tytul = "📢 Dodatkowa służba: " + rodzaj + " (+" + punkty + " pkt)!";
      var tresc = dataTekst + ", godz. " + godzina + ". Kliknij, aby się zgłosić i zdobyć darmowe punkty do Ligi!";

      for (var ti = 0; ti < tokensData.length; ti++) {
        var tokName = tokensData[ti][0];
        var tok = tokensData[ti][1];
        if (!tok || tok.indexOf("test-token") !== -1) continue;

        var resFcm = wyslijWiadomoscFCM(tok, tytul, tresc, {
          typ: "LITURGIA_DODATKOWA",
          rodzaj: rodzaj,
          godzina: godzina,
          punkty: String(punkty),
          widok: "pulpit",
          liturgiaId: id,
          url: "https://ministranci.web.app/?open=pulpit"
        });
        if (resFcm && resFcm.sukces) powiadomionoLiczba++;
      }
    }

    return {
      sukces: true,
      liturgiaId: id,
      powiadomionoLiczba: powiadomionoLiczba,
      wiadomosc: "Pomyślnie ogłoszono " + rodzaj + " i wysłano " + powiadomionoLiczba + " powiadomień PUSH!"
    };
  } catch (err) {
    Logger.log("Błąd oglosDodatkowaLiturgie: " + err.message);
    return { sukces: false, wiadomosc: err.message };
  }
}

function wyznaczGrupeParafialna(nazwisko, grupa) {
  if (grupa && (grupa.indexOf('CZERWON') !== -1 || grupa.indexOf('POMARAŃCZ') !== -1 || grupa.indexOf('POMARANCZ') !== -1 || grupa.indexOf('ZIELON') !== -1 || grupa.indexOf('ŻÓŁT') !== -1 || grupa.indexOf('ZOLT') !== -1)) {
    return grupa;
  }
  var n = (nazwisko || '').toLowerCase();
  if (/maks|pier[sś]|radli|wiktor/.test(n)) return 'I GRUPA (CZERWONA)';
  if (/maciej|pokojsk|skrzypek|rafał|rafal/.test(n)) return 'II GRUPA (POMARAŃCZOWA)';
  if (/kupiec|g[łl]az|miko[łl]|brytner|kik/.test(n)) return 'III GRUPA (ZIELONA)';
  if (/micha[łl]s*danielczok|mazurkiewicz|czech|rozik/.test(n)) return 'IV GRUPA (ŻÓŁTA)';
  return 'I GRUPA (CZERWONA)';
}

function naprawGodzineOfertyRozika() {
  var ss = pobierzAktywnyArkusz();
  var zSheet = ss.getSheetByName("Zamiany_Zastepstwa");
  var zmieniono = false;
  if (zSheet && zSheet.getLastRow() > 1) {
    var data = zSheet.getRange(2, 1, zSheet.getLastRow() - 1, 8).getDisplayValues();
    for (var i = 0; i < data.length; i++) {
      var id = data[i][0];
      var odd = data[i][3];
      var dzien = parseInt(data[i][2], 10);
      var typ = data[i][6];
      if (id === "Z_1789124731303" || (czyToTenSamMinistrant(odd, "Bartosz Rozik") && dzien === 20 && (typ === "Niedziela" || typ === "Weekend"))) {
        zSheet.getRange(i + 2, 6).setValue("08:30");
        zmieniono = true;
      }
    }
  }
  SpreadsheetApp.flush();
  var syncRes = synchronizujDoFirestore(ss);
  return { sukces: true, zmieniono: zmieniono, sync: syncRes };
}

function naprawBledneStatusyZastepstw() {
  var ss = pobierzAktywnyArkusz();
  var zSheet = ss.getSheetByName("Zamiany_Zastepstwa");
  var zmieniono = 0;
  if (zSheet && zSheet.getLastRow() > 1) {
    var data = zSheet.getRange(2, 1, zSheet.getLastRow() - 1, 8).getDisplayValues();
    for (var i = 0; i < data.length; i++) {
      var id = data[i][0];
      var przej = (data[i][4] || "").toString().trim();
      var stat = (data[i][7] || "").toString().trim();
      // Jeśli oferta jest oznaczona jako ZREALIZOWANE, ale nikt jej nie przejął
      if ((id === "Z_1788982609814" || !przej) && stat === "ZREALIZOWANE") {
        zSheet.getRange(i + 2, 8).setValue("WYGASŁA");
        zmieniono++;
      }
    }
  }
  SpreadsheetApp.flush();
  var syncRes = synchronizujDoFirestore(ss);
  return { sukces: true, zmieniono: zmieniono, sync: syncRes };
}




// =============================================================
// MODUŁ LITURGIE DODATKOWE, LOGI ZAKRYSTII I KOREKTY DANYCH
// =============================================================

function pobierzWszystkieLiturgieDodatkowe(ss) {
  try {
    var ssObj = ss || pobierzAktywnyArkusz();
    var sheet = ssObj.getSheetByName("Liturgie_Dodatkowe");
    if (!sheet) {
      sheet = ssObj.insertSheet("Liturgie_Dodatkowe");
      sheet.appendRow(["ID", "Rok", "Miesiąc", "Dzień", "Godzina", "Rodzaj", "Punkty", "Data Tekst", "Opis", "Utworzył", "Zgłoszeni", "Data Utworzenia"]);
      sheet.getRange("A1:L1").setFontWeight("bold").setBackground("#cfe2f3");
    }

    if (sheet.getLastRow() < 2) {
      var nowIso = new Date().toISOString();
      sheet.appendRow(["LIT_1789232249801", 2026, 8, 14, "10:00", "Pogrzeb", 3, "14 września", "Pogrzeb", "Kościelny", "", nowIso]);
      sheet.appendRow(["LIT_1789232273642", 2026, 8, 16, "11:00", "Pogrzeb", 3, "16 września", "Pogrzeb", "Kościelny", "", nowIso]);
    }

    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 12).getDisplayValues();
    var lits = [];
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (!row[0]) continue;
      var zg = [];
      if (row[10]) {
        zg = String(row[10]).split(",").map(function(s){ return s.trim(); }).filter(Boolean);
      }
      var gVal = cleanTime(row[4]);
      var dNum = Number(row[3]);
      if (!gVal || gVal.indexOf("24") !== -1 || gVal === "19:24" || gVal === "20:24") {
        gVal = (dNum === 14) ? "10:00" : "11:00";
        try {
          sheet.getRange(i + 2, 5).setNumberFormat("@").setValue("'" + gVal);
        } catch(eSet) {}
      }
      lits.push({
        id: String(row[0]),
        rok: Number(row[1]) || 2026,
        miesiacIdx: (row[2] !== "" && row[2] !== null) ? Number(row[2]) : 8,
        dzien: dNum,
        godzina: gVal,
        rodzaj: String(row[5] || "Pogrzeb"),
        punkty: Number(row[6]) || 3,
        dataTekst: String(row[7] || (row[3] + " września")),
        opis: String(row[8] || ""),
        utworzyl: String(row[9] || "Kościelny"),
        zgloszeni: zg,
        utworzono: String(row[11] || "")
      });
    }
    return lits;
  } catch (e) {
    Logger.log("Błąd pobierzWszystkieLiturgieDodatkowe: " + e.message);
    return [];
  }
}

function pobierzHistorieWpisowZakrystii(ss, limit) {
  try {
    var ssObj = ss || pobierzAktywnyArkusz();
    var sheet = ssObj.getSheetByName("Logi_Zakrystia");
    if (!sheet || sheet.getLastRow() < 2) return [];
    var lastRow = sheet.getLastRow();
    var maxCount = limit || 60;
    var startRow = Math.max(2, lastRow - maxCount + 1);
    var numRows = lastRow - startRow + 1;
    var data = sheet.getRange(startRow, 1, numRows, 10).getValues();
    var logs = [];
    for (var i = data.length - 1; i >= 0; i--) {
      var r = data[i];
      if (!r[0]) continue;
      var czasVal = r[0];
      var czasStr = (czasVal instanceof Date) ? Utilities.formatDate(czasVal, "Europe/Warsaw", "dd.MM.yyyy HH:mm") : String(czasVal);
      logs.push({
        czas: czasStr,
        dzien: String(r[1] || ""),
        godzina: String(r[2] || ""),
        liturgia: String(r[3] || ""),
        nazwisko: String(r[4] || ""),
        status: String(r[5] || ""),
        typ: String(r[6] || ""),
        punkty: Number(r[7]) || 0,
        zastepuje: String(r[8] || "-"),
        wpisal: String(r[9] || "Kościelny")
      });
    }
    return logs;
  } catch (e) {
    Logger.log("Błąd pobierzHistorieWpisowZakrystii: " + e.message);
    return [];
  }
}

function naprawPunktyDnia11() {
  var ss = pobierzAktywnyArkusz();
  var sheet = ss.getSheetByName("Wrzesień_2026");
  if (!sheet) return { sukces: false, wiadomosc: "Brak arkusza Wrzesień_2026" };

  var maxRows = Math.min(sheet.getLastRow(), 45);
  var colB = sheet.getRange(1, 2, maxRows, 1).getValues();
  var col11 = 11 + 3; // Kolumna N (Dzień 11)
  var cellsChanged = [];

  for (var r = 0; r < maxRows; r++) {
    var rawName = (colB[r][0] || "").toString().trim();
    if (!rawName) continue;
    var rowIdx = r + 1;

    // Franek Kik: 6 -> 4 (zastępstwo za Maciej Erich, odjęcie 2 pkt ze starego formularza)
    if (czyToTenSamMinistrant(rawName, "Franek Kik")) {
      var cellF = sheet.getRange(rowIdx, col11);
      var oldValF = cellF.getValue();
      cellF.setValue(4);
      cellF.setNote("Zastępstwo za: Maciej Erich (18:00) (+4 pkt)\nKorekta: usunięto 2 pkt ze starego formularza Google");
      cellsChanged.push({ nazwisko: "Franek Kik", przed: oldValF, po: 4 });
    }

    // Jakub Brytner: 4 -> 2 (służba dodatkowa w tygodniu = 2 pkt, usunięcie 2 pkt ze starego formularza)
    if (czyToTenSamMinistrant(rawName, "Jakub Brytner")) {
      var cellJ = sheet.getRange(rowIdx, col11);
      var oldValJ = cellJ.getValue();
      if (oldValJ === 4 || oldValJ === "4") {
        cellJ.setValue(2);
        cellJ.setNote("Służba dodatkowa w tygodniu (18:00) (+2 pkt)\nKorekta: usunięto 2 pkt ze starego formularza Google");
        cellsChanged.push({ nazwisko: "Jakub Brytner", przed: oldValJ, po: 2 });
      }
    }

    // Emil Czech: 10 -> 2 (dyżur regularny w tygodniu = 2 pkt)
    if (czyToTenSamMinistrant(rawName, "Emil Czech")) {
      var cellE = sheet.getRange(rowIdx, col11);
      var oldValE = cellE.getValue();
      if (oldValE === 10 || oldValE === "10") {
        cellE.setValue(2);
        cellE.setNote("Dyżur regularny w tygodniu (18:00) (+2 pkt)\nKorekta: usunięto zdublowany stary formularz Google");
        cellsChanged.push({ nazwisko: "Emil Czech", przed: oldValE, po: 2 });
      }
    }
  }

  SpreadsheetApp.flush();
  var syncRes = synchronizujDoFirestore(ss);
  return { sukces: true, zmieniono: cellsChanged, sync: syncRes };
}

function korektaPunktowNiedzielaITydzien() {
  var ss = pobierzAktywnyArkusz();
  var sheet = ss.getSheetByName("Wrzesień_2026");
  if (!sheet) return { sukces: false, wiadomosc: "Brak arkusza Wrzesień_2026" };

  var maxRows = Math.min(sheet.getLastRow(), 45);
  var colB = sheet.getRange(1, 2, maxRows, 1).getValues();
  var col11 = 11 + 3; // Kolumna N (Dzień 11)
  var col13 = 13 + 3; // Kolumna P (Dzień 13)
  var cellsChanged = [];

  for (var r = 0; r < maxRows; r++) {
    var rawName = (colB[r][0] || "").toString().trim();
    if (!rawName) continue;
    var rowIdx = r + 1;

    // 1. Emil Czech: Dzień 11 = 5 pkt (dyżur regularny w piątek), Dzień 13 = 3 pkt (swoja służba o 8:30)
    if (czyToTenSamMinistrant(rawName, "Emil Czech")) {
      sheet.getRange(rowIdx, col11).setValue(5);
      sheet.getRange(rowIdx, col11).setNote("Dyżur w tygodniu (18:00) (+5 pkt)");

      sheet.getRange(rowIdx, col13).setValue(3);
      sheet.getRange(rowIdx, col13).setNote("Msza w niedzielę (08:30) (+3 pkt)");
      cellsChanged.push({ nazwisko: "Emil Czech", d11: 5, d13: 3 });
    }

    // 2. Mikołaj Erich: Dzień 13 = puste (msza dopiero o 17:00, oddał sobotę 12.09 a nie niedzielę)
    if (czyToTenSamMinistrant(rawName, "Mikołaj Erich")) {
      sheet.getRange(rowIdx, col13).clearContent();
      sheet.getRange(rowIdx, col13).clearNote();
      cellsChanged.push({ nazwisko: "Mikołaj Erich", d13: "puste" });
    }

    // 3. Grupa Macieja na Dzień 13 (godz. 11:30): po 3 pkt
    if (czyToTenSamMinistrant(rawName, "Maciej Erich") ||
        czyToTenSamMinistrant(rawName, "Ksawery Skrzypek") ||
        czyToTenSamMinistrant(rawName, "Rafał Danielczok")) {
      sheet.getRange(rowIdx, col13).setValue(3);
      sheet.getRange(rowIdx, col13).setNote("Msza w niedzielę (11:30) (+3 pkt)\nWpisał: Kościelny");
      cellsChanged.push({ nazwisko: rawName, d13: 3 });
    }
  }

  // 4. Usuń błędny wpis zastępstwa z dnia 13 w Zamiany_Zastepstwa
  var zSheet = ss.getSheetByName("Zamiany_Zastepstwa");
  if (zSheet && zSheet.getLastRow() > 1) {
    var zData = zSheet.getRange(2, 1, zSheet.getLastRow() - 1, 8).getValues();
    for (var zi = zData.length - 1; zi >= 0; zi--) {
      var zDay = parseInt(zData[zi][2], 10);
      var zOdd = zData[zi][3];
      var zPrzej = zData[zi][4];
      if (zDay === 13 && czyToTenSamMinistrant(zOdd, "Mikołaj Erich") && czyToTenSamMinistrant(zPrzej, "Emil Czech")) {
        zSheet.deleteRow(zi + 2);
      }
    }
  }

  SpreadsheetApp.flush();
  var syncRes = synchronizujDoFirestore(ss);
  return { sukces: true, zmieniono: cellsChanged, sync: syncRes };
}

function sprawdzINaprawLosoweWpisy() {
  var ss = pobierzAktywnyArkusz();
  var sheet = ss.getSheetByName("Wrzesień_2026");
  if (!sheet) return { sukces: false, wiadomosc: "Brak arkusza Wrzesień_2026" };

  var diagnoza = {};

  // 1. Sprawdź komórki w IV grupie:
  var rowsIV = [22, 23, 24, 25];
  var checkCols = [
    { col: 16, dzien: 13, lit: "P" },
    { col: 18, dzien: 15, lit: "R" },
    { col: 21, dzien: 18, lit: "U" }
  ];

  diagnoza.komorkiIV = [];
  rowsIV.forEach(function(r) {
    var name = sheet.getRange(r, 2).getValue();
    checkCols.forEach(function(c) {
      var cell = sheet.getRange(r, c.col);
      var val = cell.getValue();
      var note = cell.getNote();
      if (val !== "" || note !== "") {
        diagnoza.komorkiIV.push({
          row: r,
          nazwisko: name,
          kolumna: c.lit,
          dzien: c.dzien,
          wartosc: val,
          notatka: note
        });
      }
    });
  });

  // 2. Znajdź i wyczyść zaśmiecone komórki w tabeli rankingu i poniżej grup (wiersze 26 do 55, kolumny od E wzwyż)
  // Wiersze 26-55 dla kolumn E (5) do AG (35) - tu w ogóle nie powinno być punktów dniowych!
  diagnoza.wyczyszczoneStray = [];
  for (var r = 26; r <= 55; r++) {
    for (var c = 5; c <= 35; c++) {
      var cell = sheet.getRange(r, c);
      var v = cell.getValue();
      var n = cell.getNote();
      if (v !== "" || n !== "") {
        diagnoza.wyczyszczoneStray.push({
          row: r,
          col: c,
          wartosc: v,
          notatka: n
        });
        cell.clearContent();
        cell.clearNote();
      }
    }
  }

  SpreadsheetApp.flush();
  diagnoza.sync = synchronizujDoFirestore(ss);
  return { sukces: true, diagnoza: diagnoza };
}

function naprawPawelGlazWeekend() {
  var ss = pobierzAktywnyArkusz();
  var sheet = ss.getSheetByName("Wrzesień_2026");
  if (!sheet) return { sukces: false, wiadomosc: "Brak arkusza Wrzesień_2026" };

  var maxRows = Math.min(sheet.getLastRow(), 30);
  var colB = sheet.getRange(1, 2, maxRows, 1).getValues();
  var targetRow = -1;

  for (var r = 0; r < maxRows; r++) {
    var rawName = (colB[r][0] || "").toString().trim();
    if (czyToTenSamMinistrant(rawName, "Paweł Głaz")) {
      targetRow = r + 1;
      break;
    }
  }

  if (targetRow === -1) {
    return { sukces: false, wiadomosc: "Nie znaleziono Pawła Głaza" };
  }

  var col12 = 12 + 3; // Sobota 12.09
  var col13 = 13 + 3; // Niedziela 13.09

  // 1. Skasuj wczorajsze -5 (sobota 12.09), ponieważ stawił się dzisiaj na mszę 11:30
  var cell12 = sheet.getRange(targetRow, col12);
  cell12.clearContent();
  cell12.setNote("Anulowano -5 pkt (ministrant stawił się w niedzielę 13.09 na 11:30 jako służba dodatkowa +1 pkt)");

  // 2. Upewnij się, że na dzień 13 ma 1 pkt
  var cell13 = sheet.getRange(targetRow, col13);
  cell13.setValue(1);
  cell13.setNote("Msza w niedzielę (11:30)\nStatus: OBECNY (służba dodatkowa)\nWpisał: Kościelny (+1 pkt)");

  SpreadsheetApp.flush();
  var syncRes = synchronizujDoFirestore(ss);

  return {
    sukces: true,
    wiadomosc: "Wczorajsze -5 pkt Pawła Głaza zostało skasowane, a dzisiejszy 1 pkt zachowany!",
    sync: syncRes
  };
}

function przelaczZgloszenieLiturgia(litId, nazwisko) {
  try {
    var ss = pobierzAktywnyArkusz();
    var sheet = ss.getSheetByName("Liturgie_Dodatkowe");
    if (!sheet || sheet.getLastRow() < 2) return { sukces: false, wiadomosc: "Brak liturgii" };
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 12).getValues();
    var found = false;
    var nClean = String(nazwisko || "").trim().toLowerCase();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]) === String(litId)) {
        found = true;
        var curStr = String(data[i][10] || "");
        var list = curStr ? curStr.split(",").map(function(s) { return s.trim(); }).filter(Boolean) : [];
        var idx = list.findIndex(function(x) { 
          var xLower = x.trim().toLowerCase();
          return xLower === nClean || xLower.indexOf(nClean) !== -1 || nClean.indexOf(xLower) !== -1;
        });
        if (idx !== -1) {
          list.splice(idx, 1);
        } else if (nazwisko) {
          list.push(String(nazwisko).trim());
        }
        nowiZgloszeni = list;
        sheet.getRange(i + 2, 11).setValue(list.join(", "));
        break;
      }
    }
    SpreadsheetApp.flush();
    try { synchronizujDoFirestore(ss); } catch(eSync) {}
    return { sukces: true, litId: litId, zgloszeni: nowiZgloszeni };
  } catch(e) {
    return { sukces: false, wiadomosc: e.message };
  }
}

function poprawGodzinyLiturgii() {
  var ss = pobierzAktywnyArkusz();
  var sheet = ss.getSheetByName("Liturgie_Dodatkowe");
  if (!sheet || sheet.getLastRow() < 2) return { sukces: false, wiadomosc: "Brak liturgii dodatkowych" };

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 12).getValues();
  var zmieniono = [];
  for (var i = 0; i < data.length; i++) {
    var dzien = parseInt(data[i][3], 10);
    var rowIdx = i + 2;
    if (dzien === 14) {
      sheet.getRange(rowIdx, 5).setNumberFormat("@").setValue("'10:00");
      zmieniono.push({ dzien: 14, nowaGodzina: "10:00" });
    } else if (dzien === 16) {
      sheet.getRange(rowIdx, 5).setNumberFormat("@").setValue("'11:00");
      zmieniono.push({ dzien: 16, nowaGodzina: "11:00" });
    }
  }

  SpreadsheetApp.flush();
  var syncRes = synchronizujDoFirestore(ss);

  return {
    sukces: true,
    zmieniono: zmieniono,
    sync: syncRes
  };
}



