// Service Worker v1.0.9 - Ministranci PWA
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

firebase.initializeApp({
  apiKey: "AIzaSyAsgkKWXr-L3fDHQODxioVssvIGL9SQePk",
  authDomain: "makole-85f32.firebaseapp.com",
  projectId: "makole-85f32",
  storageBucket: "makole-85f32.firebasestorage.app",
  messagingSenderId: "1017347967393",
  appId: "1:1017347967393:web:aaf5c6a0e7d51c103663e0"
});

const messaging = firebase.messaging();

// SDK Firebase automatycznie wyświetla powiadomienie, gdy serwer wysyła obiekt "notification".
// onBackgroundMessage używamy tylko jako fallback, gdyby przyszła wiadomość wyłącznie z danymi (data-only).
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Odebrano w tle:', payload);
  if (!payload.notification && payload.data) {
    const notificationTitle = payload.data.title || 'Ministranci - Powiadomienie';
    const notificationOptions = {
      body: payload.data.body || 'Masz nowe powiadomienie dotyczące służby.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'ministranci-alert',
      data: payload.data,
      vibrate: [200, 100, 200]
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Odczytaj dane powiadomienia
  const notifData = event.notification.data || {};
  const fcmData = (notifData.FCM_MSG && notifData.FCM_MSG.data) ? notifData.FCM_MSG.data : notifData;
  const title = event.notification.title || '';
  const widok = fcmData.widok || notifData.widok || (title.toLowerCase().indexOf('giełd') !== -1 ? 'gielda' : 'pulpit');

  const targetPath = (widok === 'gielda') ? '/?open=gielda' : '/';
  const targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      // 1. Sprawdź czy okno aplikacji jest już otwarte w przeglądarce
      for (const client of clientList) {
        if (client.url && client.url.startsWith(self.location.origin)) {
          if ('focus' in client) {
            await client.focus();
          }
          client.postMessage({
            type: 'OTWORZ_WIDOK',
            widok: widok
          });
          if ('navigate' in client && client.url.indexOf('open=gielda') === -1 && widok === 'gielda') {
            return client.navigate(targetUrl);
          }
          return;
        }
      }

      // 2. Jeśli aplikacja nie była otwarta, otwórz nowe okno pod PEŁNYM bezwzględnym URL
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});