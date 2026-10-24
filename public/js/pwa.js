// =============================================================
    // INTEGRACJA APPS SCRIPT DLA POWIADOMIEŃ PUSH (FCM)
    // =============================================================
    var GAS_URL = 'https://script.google.com/macros/s/AKfycbw4inpFTSAMv22GQpz_AYOytBx04CcEuCgwhHCAU0qwVFZ5H2BdjyA1PrnhxtP6KtCazg/exec';

    function callBackend(fnName, args, successCb, errorCb) {
      try {
        var payload = encodeURIComponent(JSON.stringify({ funkcja: fnName, args: args || [] }));
        fetch(GAS_URL + '?payload=' + payload, { redirect: 'follow' })
          .then(function(res) { return res.json(); })
          .then(function(data) {
            if (typeof successCb === 'function') successCb(data);
          })
          .catch(function(err) {
            console.warn('callBackend push error:', err);
            if (typeof errorCb === 'function') errorCb(err);
            else if (typeof successCb === 'function') successCb({ sukces: false, wiadomosc: err.message });
          });
      } catch(e) {
        if (typeof errorCb === 'function') errorCb(e);
      }
    }

// =============================================================
    // OBSŁUGA PWA I POWIADOMIEŃ PUSH
    // =============================================================
    function czyUrzadzenieMobilne() {
      var ua = navigator.userAgent || "";
      var isMobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
      var isTouchSmall = (window.matchMedia && window.matchMedia('(max-width: 900px)').matches && 'ontouchstart' in window);
      return isMobileUA || isTouchSmall;
    }

    window.addEventListener('beforeinstallprompt', function(e) {
      e.preventDefault();
      deferredPrompt = e;
      // Pokazujemy baner instalacji TYLKO na telefonach / tabletach, NIGDY na komputerze PC
      if (czyUrzadzenieMobilne()) {
        var banner = document.getElementById('install-banner');
        if (banner) banner.style.display = 'flex';
      }
    });

    function zainstalujPWA() {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function(choiceResult) {
          if (choiceResult.outcome === 'accepted') {
            document.getElementById('install-banner').style.display = 'none';
          }
          deferredPrompt = null;
        });
      }
    }

    function zainstalujAplikacjeZakrystia() {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function(choiceResult) {
          if (choiceResult.outcome === 'accepted') {
            pokazToast('Rozpoczęto instalację aplikacji Zakrystia');
            var b = document.getElementById('btn-zakrystia-install');
            if (b) b.style.display = 'none';
          }
          deferredPrompt = null;
        });
      } else {
        var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS) {
          alert('Aby zainstalować aplikację Zakrystia na telefonie iPhone (Safari):\n1. Kliknij ikonę Udostępnij (kwadrat ze strzałką w górę)\n2. Przewiń i wybierz "Do początku" ("Dodaj do ekranu początkowego")\n3. Wpisz nazwę "Zakrystia" i kliknij "Dodaj"');
        } else {
          alert('Aby zainstalować aplikację Zakrystia na telefonie (Android / Chrome):\n1. Otwórz stronę ministranci.web.app/zakrystia\n2. Kliknij menu przeglądarki (3 kropki w prawym górnym rogu)\n3. Wybierz "Zainstaluj aplikację" lub "Dodaj do ekranu głównego"\n4. Potwierdź instalację – na ekranie pojawi się osobna aplikacja Zakrystia!');
        }
      }
    }

    // Wykrywanie iOS Safari
    function sprawdzIOS() {
      if (!czyUrzadzenieMobilne()) return;
      var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      var isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
      if (isIOS && !isStandalone && !localStorage.getItem('ios_banner_closed')) {
        var b = document.getElementById('ios-install-banner');
        if (b) b.style.display = 'block';
      }
    }

    function zamknijIosBanner() {
      var b = document.getElementById('ios-install-banner');
      if (b) b.style.display = 'none';
      localStorage.setItem('ios_banner_closed', '1');
    }

    
    function aktualizujBlokadeScrolla() {
      var anyOpen = false;
      var overlays = document.querySelectorAll('.modal-overlay');
      for (var i = 0; i < overlays.length; i++) {
        var d = overlays[i].style.display || window.getComputedStyle(overlays[i]).display;
        if (d === 'flex' || d === 'block') {
          anyOpen = true;
          break;
        }
      }
      if (anyOpen) {
        document.body.classList.add('modal-open');
      } else {
        document.body.classList.remove('modal-open');
      }
    }

    try {
      var modalScrollObserver = new MutationObserver(function() {
        aktualizujBlokadeScrolla();
      });
      function initModalObserver() {
        document.querySelectorAll('.modal-overlay').forEach(function(el) {
          modalScrollObserver.observe(el, { attributes: true, attributeFilter: ['style', 'class'] });
        });
      }
      if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', initModalObserver);
      } else {
        initModalObserver();
      }
    } catch(eMO) {}

    function otworzIosModal() {
      var m = document.getElementById('modal-ios-install');
      if (m) m.style.display = 'flex';
    }

    function zamknijIosModal() {
      var m = document.getElementById('modal-ios-install');
      if (m) m.style.display = 'none';
    }

    function sprawdzStanPowiadomien() {
      var cardBox = document.getElementById('push-card-box');
      var linkOpcje = document.getElementById('link-opcje-powiadomien');
      if (!cardBox) return;

      var badge = document.getElementById('push-badge');
      var desc = document.getElementById('push-desc');
      var btnEnable = document.getElementById('btn-enable-push');
      var btnTest = document.getElementById('btn-test-push');
      var btnReminder = document.getElementById('btn-test-reminder');
      var btnRenew = document.getElementById('btn-renew-push');

      // Jeśli przeglądarka w ogóle nie obsługuje powiadomień
      if (!('Notification' in window)) {
        var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        var isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
        if (isIOS && !isStandalone) {
          cardBox.style.display = 'block';
          if (badge) { badge.innerText = 'Wymaga dodania do ekranu'; badge.className = 'push-badge inactive'; }
          if (desc) desc.innerHTML = '<b>Na iPhone:</b> Apple wymaga dodania aplikacji do ekranu początkowego, aby włączyć powiadomienia. <a href="javascript:void(0)" onclick="otworzIosModal()" style="color:#60a5fa; font-weight:bold; text-decoration:underline;">Kliknij tutaj po instrukcję</a>.';
          if (btnEnable) btnEnable.style.display = 'none';
        } else {
          cardBox.style.display = 'none';
        }
        if (linkOpcje) linkOpcje.style.display = 'none';
        if (btnTest) btnTest.style.display = 'none';
        if (btnReminder) btnReminder.style.display = 'none';
        var btnGieldaHide = document.getElementById('btn-test-gielda');
        if (btnGieldaHide) btnGieldaHide.style.display = 'none';
        if (btnRenew) btnRenew.style.display = 'none';
        return;
      }

      var hasLocalToken = !!localStorage.getItem('fcm_token');
      var tokenUser = localStorage.getItem('fcm_user') || '';
      var isCurrentUser = (hasLocalToken && tokenUser && globalUser.nazwisko && tokenUser.trim().toLowerCase() === globalUser.nazwisko.trim().toLowerCase());

      // 1. Jeśli użytkownik ma już aktywny token i włączone powiadomienia -> CAŁKOWICIE UKRYJ KARTĘ!
      if (Notification.permission === 'granted' && hasLocalToken && isCurrentUser) {
        if (!cardBox.dataset.reczniePokazane) {
          cardBox.style.display = 'none';
        } else {
          cardBox.style.display = 'block';
        }
        if (linkOpcje) linkOpcje.style.display = 'inline-block';

        if (badge) { badge.innerText = 'Aktywne'; badge.className = 'push-badge active'; }
        var curFCMToken = localStorage.getItem('fcm_token') || '';
        var tokenShort = curFCMToken ? (curFCMToken.substring(0, 14) + '...' + curFCMToken.substring(curFCMToken.length - 8)) : 'Brak';
        if (desc) {
          desc.innerHTML = 'Powiadomienia PUSH są <b>aktywne</b> na tym telefonie (profil: <b>' + (globalUser.nazwisko || 'Twój profil') + '</b>).<br>' +
            '<div style="margin-top:8px; font-size:11px; color:#fafafa; background:#18181b; border:1px solid #27272a; padding:8px 10px; border-radius:6px; font-family:monospace; word-break:break-all;">' +
              '<b>Token FCM:</b> ' + tokenShort + ' • <span style="color:#34d399; font-weight:700;">Aktywny</span>' +
            '</div>' +
            '<div style="margin-top:6px; font-size:12px; color:#15803d; font-weight:500;">' +
              'Telefon odbiera poranne przypomnienia o 7:00 oraz alerty o nowych służbach.' +
            '</div>';
        }
        if (btnEnable) btnEnable.style.display = 'none';
        if (btnTest) btnTest.style.display = 'inline-block';
        if (btnReminder) btnReminder.style.display = 'inline-block';
        var btnGielda = document.getElementById('btn-test-gielda');
        if (btnGielda) btnGielda.style.display = 'inline-block';
        if (btnRenew) btnRenew.style.display = 'inline-block';
        return;
      }

      // 2. Jeśli powiadomienia nie są jeszcze aktywne -> POKAŻ KARTĘ z opcją włączenia
      cardBox.style.display = 'block';
      if (linkOpcje) linkOpcje.style.display = 'none';

      if (Notification.permission === 'granted') {
        // Zgoda w przeglądarce jest, ale profil niepołączony
        if (badge) { badge.innerText = 'Wymaga połączenia'; badge.className = 'push-badge warning'; }
        if (desc) desc.innerHTML = '<b>Telefon wymaga połączenia z powiadomieniami.</b> Przeglądarka ma przyznaną zgodę. Kliknij poniższy przycisk, aby połączyć powiadomienia z profilem <b>' + (globalUser.nazwisko || 'Twój profil') + '</b>.';
        if (btnEnable) {
          btnEnable.style.display = 'inline-block';
          btnEnable.innerHTML = 'Połącz i aktywuj powiadomienia';
        }
        if (btnTest) btnTest.style.display = 'none';
        if (btnReminder) btnReminder.style.display = 'none';
        var btnGieldaHide = document.getElementById('btn-test-gielda');
        if (btnGieldaHide) btnGieldaHide.style.display = 'none';
        if (btnRenew) btnRenew.style.display = 'none';
        zarejestrujTokenFCM(false);
      } else if (Notification.permission === 'denied') {
        if (badge) { badge.innerText = 'Zablokowane'; badge.className = 'push-badge inactive'; }
        var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (desc) {
          if (isIOS) {
            desc.innerText = 'Powiadomienia zostały zablokowane. Aby je włączyć, przejdź do: Ustawienia iPhone → Powiadomienia → Ministranci i zezwól na powiadomienia.';
          } else {
            desc.innerText = 'Powiadomienia zostały zablokowane w przeglądarce. Aby je włączyć, kliknij ikonę kłódki przy pasku adresu i zezwól na powiadomienia.';
          }
        }
        if (btnEnable) btnEnable.style.display = 'none';
        if (btnTest) btnTest.style.display = 'none';
        if (btnReminder) btnReminder.style.display = 'none';
        var btnGieldaHide = document.getElementById('btn-test-gielda');
        if (btnGieldaHide) btnGieldaHide.style.display = 'none';
        if (btnRenew) btnRenew.style.display = 'none';
      } else {
        // Domyślny stan - czysty przycisk włączenia
        if (badge) { badge.innerText = 'Nieaktywne'; badge.className = 'push-badge inactive'; }
        if (desc) desc.innerText = 'Włącz powiadomienia, aby otrzymywać poranne przypomnienia o służbie (o godz. 7:00 w dniu Twojego dyżuru) oraz alerty o wolnych dyżurach i zamianach.';
        if (btnEnable) {
          btnEnable.style.display = 'inline-block';
          btnEnable.innerHTML = 'Włącz powiadomienia';
        }
        if (btnTest) btnTest.style.display = 'none';
        if (btnReminder) btnReminder.style.display = 'none';
        var btnGieldaHide = document.getElementById('btn-test-gielda');
        if (btnGieldaHide) btnGieldaHide.style.display = 'none';
        if (btnRenew) btnRenew.style.display = 'none';
      }
    }

    function pokazOpcjePowiadomien() {
      var cardBox = document.getElementById('push-card-box');
      if (!cardBox) return;
      if (cardBox.style.display === 'none') {
        cardBox.dataset.reczniePokazane = 'true';
        cardBox.style.display = 'block';
        cardBox.scrollIntoView({ behavior: 'smooth' });
      } else {
        delete cardBox.dataset.reczniePokazane;
        cardBox.style.display = 'none';
      }
    }

    async function włączPowiadomieniaPush() {
      if (!('Notification' in window)) {
        alert('Twoja przeglądarka nie obsługuje powiadomień.');
        return;
      }

      if (Notification.permission === 'granted') {
        pokazToast('Rejestrowanie telefonu w usłudze powiadomień... ⏳');
        await zarejestrujTokenFCM(true);
        return;
      }

      var perm = await Notification.requestPermission();
      if (perm === 'granted') {
        pokazToast('Uprawnienia przyznane! Rejestrowanie telefonu...');
        await zarejestrujTokenFCM(true);
      } else {
        alert('Nie przyznano zgody na powiadomienia.');
        sprawdzStanPowiadomien();
      }
    }

    async function ponowRejestracjePush() {
      localStorage.removeItem('fcm_token');
      localStorage.removeItem('fcm_user');
      pokazToast('Ponawianie rejestracji urządzenia... ⏳');
      await zarejestrujTokenFCM(true);
    }

    async function zarejestrujTokenFCM(wyswietlKomunikat) {
      try {
        if (!('serviceWorker' in navigator)) {
          if (wyswietlKomunikat) alert("Twoja przeglądarka nie obsługuje Service Workerów.");
          return;
        }

        // Czekamy na załadowanie modułu Firebase Messaging jeśli jeszcze nie gotowy
        if (!messaging) {
          if (typeof firebase !== 'undefined' && firebase.messaging) {
            try { messaging = firebase.messaging(); } catch(e) {}
          }
          if (!messaging) {
            for (var w = 0; w < 15; w++) {
              await new Promise(function(r) { setTimeout(r, 200); });
              if (messaging) break;
            }
          }
        }
        if (!messaging) {
          if (wyswietlKomunikat) {
            alert("Moduł powiadomień Firebase nie zdążył się załadować. Odśwież stronę i spróbuj ponownie.");
          }
          return;
        }

        var swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js?v=1.0.9', { scope: '/' });
        await navigator.serviceWorker.ready;

        if (swReg.installing) {
          await new Promise(function(resolve) {
            swReg.installing.addEventListener('statechange', function(e) {
              if (e.target.state === 'activated') resolve();
            });
            setTimeout(resolve, 2500);
          });
        }

        var token = await messaging.getToken({
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: swReg
        });

        if (token) {
          console.log("Uzyskano token FCM:", token);
          localStorage.setItem('fcm_token', token);
          localStorage.setItem('fcm_user', globalUser.nazwisko || '');
          var urzadzenie = /Android/i.test(navigator.userAgent) ? 'Android PWA' : (/iPhone|iPad/i.test(navigator.userAgent) ? 'iOS PWA' : 'Komputer');

          // Zapis lustrzany w Firestore dla odporności na awarie
          if (typeof dbFirestore !== 'undefined' && dbFirestore) {
            try {
              dbFirestore.collection('tokeny_fcm').doc(token).set({
                nazwisko: globalUser.nazwisko || 'Anonim',
                urzadzenie: urzadzenie,
                token: token,
                fcmToken: token,
                zaktualizowano: firebase.firestore.FieldValue.serverTimestamp()
              }, { merge: true });
            } catch(e) {
              console.warn("Błąd zapisu tokenu do Firestore:", e);
            }
          }

          callBackend('zapiszTokenFCM', [globalUser.nazwisko || 'Anonim', token, urzadzenie], function(res) {
            console.log("Odpowiedź zapisu tokenu:", res);
            if (res && res.sukces) {
              if (wyswietlKomunikat) {
                pokazToast('Powiadomienia pomyślnie połączone');
              }
            } else {
              if (wyswietlKomunikat) {
                alert("Token urządzenia został wygenerowany, ale wystąpił problem z jego rejestracją: " + (res ? res.wiadomosc : 'Nieznany błąd'));
              }
            }
            sprawdzStanPowiadomien();
          }, function(errB) {
            if (wyswietlKomunikat) {
              alert("Błąd połączenia z serwerem: " + (errB.message || errB));
            }
            sprawdzStanPowiadomien();
          });
        } else {
          throw new Error("Nie udało się pobrać identyfikatora tokenu z Firebase.");
        }
        sprawdzStanPowiadomien();
      } catch (err) {
        console.error("Błąd rejestracji FCM:", err);
        sprawdzStanPowiadomien();
        if (wyswietlKomunikat) {
          var errMsg = err.message || err.toString();
          if (errMsg.indexOf("permission-blocked") !== -1 || errMsg.indexOf("Permission denied") !== -1) {
            alert("Powiadomienia są zablokowane w ustawieniach przeglądarki. Kliknij ikonę kłódki przy adresie strony i zezwól na powiadomienia.");
          } else {
            alert("Błąd rejestracji powiadomień: " + errMsg + "\n\nSpróbuj ponownie za chwilę lub odśwież stronę.");
          }
        }
      }
    }

    function wyslijTestPush() {
      if (!globalUser.nazwisko) return;
      pokazToast('Wysyłanie testu powiadomień PUSH... ⏳');
      callBackend('testFCM', [globalUser.nazwisko], function(res) {
        if (res && res.sukces) {
          pokazToast('Wysłano testowe powiadomienie');
        } else {
          // Fallback lokalny
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(function(reg) {
              reg.showNotification('Test Powiadomień', {
                body: 'Powiadomienia na Twoim telefonie działają prawidłowo!',
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                vibrate: [200, 100, 200]
              });
              pokazToast('Wysłano powiadomienie testowe!');
            });
          }
        }
      });
    }

    function wyslijTestPrzypomnieniaGieldy() {
      pokazToast('Sprawdzanie giełdy i wysyłanie przypomnień... ⏳');
      callBackend('przypomnijOGieldzie', [], function(res) {
        if (res && res.sukces) {
          pokazToast(res.wiadomosc || 'Wysłano przypomnienia o wolnych służbach!');
        } else {
          alert(res ? res.wiadomosc : 'Nie udało się wysłać przypomnienia o giełdzie.');
        }
      }, function(err) {
        alert('Błąd połączenia: ' + (err.message || err));
      });
    }

    function wyslijTestPrzypomnieniaOSluzbie() {
      if (!globalUser.nazwisko) return;
      pokazToast('Wysyłanie testu porannego przypomnienia... ⏳');
      callBackend('symulujPorannePrzypomnienie', [globalUser.nazwisko], function(res) {
        if (res && res.sukces) {
          pokazToast('Wysłano przypomnienie o służbie! ⏰ Sprawdź pasek powiadomień');
        } else {
          alert(res ? res.wiadomosc : 'Nie udało się wysłać testowego przypomnienia.');
        }
      }, function(err) {
        alert('Błąd połączenia: ' + (err.message || err));
      });
    }

    function sprawdzURLParametry() {
      try {
        var params = new URLSearchParams(window.location.search);
        if (params.get('open') === 'gielda' || window.location.hash === '#gielda') {
          otworzGielde();
          if (window.history && window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }
      } catch(e) {}
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'OTWORZ_WIDOK') {
          if (event.data.widok === 'gielda') {
            otworzGielde();
          } else {
            zamknijGielde();
          }
          odswiezDane();
          pokazToast('Otwarto giełdę z powiadomienia');
        }
      });
    }

    function sprawdzAutomatycznyPromptPowiadomien() {
      // Promptujemy tylko zalogowane osoby
      if (!globalUser || !globalUser.nazwisko || globalUser.nazwisko === 'Anonim') {
        return;
      }

      // Sprawdzamy czy powiadomienia są w ogóle wspierane
      if (!('Notification' in window)) {
        return;
      }

      var hasLocalToken = !!localStorage.getItem('fcm_token');
      var tokenUser = localStorage.getItem('fcm_user') || '';
      var isCurrentUser = (hasLocalToken && tokenUser && tokenUser.trim().toLowerCase() === globalUser.nazwisko.trim().toLowerCase());

      // Jeśli profil ma już aktywny token na tym urządzeniu -> nie pytamy
      if (isCurrentUser) {
        return;
      }

      // Jeśli przeglądarka ma już uprawnienie 'granted', ale token się zresetował -> cicho rejestrujemy w tle bez okna
      if (Notification.permission === 'granted') {
        zarejestrujTokenFCM(false);
        return;
      }

      // Jeśli użytkownik na stałe zablokował powiadomienia ('denied') -> nie spamujemy modalem
      if (Notification.permission === 'denied') {
        return;
      }

      // Sprawdzamy czy użytkownik nie kliknął "Przypomnij później" w ciągu ostatnich 24h
      var snooze = parseInt(localStorage.getItem('fcm_prompt_snooze') || '0', 10);
      if (Date.now() < snooze) {
        return;
      }

      var m = document.getElementById('modal-push-prompt');
      if (!m) return;

      var subtitle = document.getElementById('push-prompt-subtitle');
      if (subtitle) {
        subtitle.innerHTML = 'Cześć <b>' + globalUser.nazwisko + '</b>! Nie przegap swoich dyżurów i okazji na dodatkowe punkty.';
      }

      var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      var isStandalone = window.navigator.standalone || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);

      var iosNote = document.getElementById('push-prompt-ios-note');
      var btnAction = document.getElementById('btn-push-prompt-action');

      if (isIOS && !isStandalone) {
        if (iosNote) iosNote.style.display = 'block';
        if (btnAction) {
          btnAction.innerHTML = '<span>📱 Zobacz jak włączyć na iPhone</span>';
        }
      } else {
        if (iosNote) iosNote.style.display = 'none';
        if (btnAction) {
          btnAction.innerHTML = '<span>🔔 Włącz powiadomienia</span>';
        }
      }

      // Otwórz modal z delikatnym opóźnieniem (1.2s), aby pulpit zdążył się płynnie załadować
      setTimeout(function() {
        var stillNoToken = !localStorage.getItem('fcm_token');
        if (stillNoToken && globalUser && globalUser.nazwisko && m) {
          m.style.display = 'flex';
        }
      }, 1200);
    }

    async function zaakceptujPromptPowiadomien() {
      var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      var isStandalone = window.navigator.standalone || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);

      if (isIOS && !isStandalone) {
        zamknijModalPushPrompt();
        otworzIosModal();
        return;
      }

      var btn = document.getElementById('btn-push-prompt-action');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="mini-spin"></span> Włączanie powiadomień...';
      }

      try {
        if (!('Notification' in window)) {
          alert('Twoja przeglądarka nie obsługuje powiadomień.');
          zamknijModalPushPrompt();
          return;
        }

        var perm = Notification.permission;
        if (perm !== 'granted') {
          perm = await Notification.requestPermission();
        }

        if (perm === 'granted') {
          pokazToast('Uprawnienia przyznane! Rejestrowanie telefonu... ⏳');
          await zarejestrujTokenFCM(true);
          zamknijModalPushPrompt();
          localStorage.removeItem('fcm_prompt_snooze');
          pokazToast('🔔 Powiadomienia włączone pomyślnie!');
        } else {
          zamknijModalPushPrompt();
          // Jeśli odmówił, odłóż prompt na 48h
          localStorage.setItem('fcm_prompt_snooze', String(Date.now() + 48 * 60 * 60 * 1000));
          alert('Nie zezwolono na powiadomienia w przeglądarce.');
          sprawdzStanPowiadomien();
        }
      } catch(err) {
        console.error('Błąd włączania powiadomień:', err);
        zamknijModalPushPrompt();
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<span>🔔 Włącz powiadomienia</span>';
        }
      }
    }

    function odrzucPromptPowiadomien() {
      zamknijModalPushPrompt();
      // Odłóż na 24 godziny
      localStorage.setItem('fcm_prompt_snooze', String(Date.now() + 24 * 60 * 60 * 1000));
    }

    function zamknijModalPushPrompt() {
      var m = document.getElementById('modal-push-prompt');
      if (m) m.style.display = 'none';
    }

    window.sprawdzAutomatycznyPromptPowiadomien = sprawdzAutomatycznyPromptPowiadomien;
    window.zaakceptujPromptPowiadomien = zaakceptujPromptPowiadomien;
    window.odrzucPromptPowiadomien = odrzucPromptPowiadomien;
    window.zamknijModalPushPrompt = zamknijModalPushPrompt;
