// =============================================================
    // KONFIGURACJA FIREBASE (100% PURE FIREBASE CLOUD)
    // =============================================================
    var VAPID_KEY = "BC-QK1tCNOMovNurDkrqaN9YcBrIll-5omRBqBVB3rZZCz7lN7fXdojm9aUV1jqxARVywXKuJsu-QFVzsxqu9Ws";

    var firebaseConfig = {
      apiKey: "AIzaSyAsgkKWXr-L3fDHQODxioVssvIGL9SQePk",
      authDomain: "makole-85f32.firebaseapp.com",
      projectId: "makole-85f32",
      storageBucket: "makole-85f32.firebasestorage.app",
      messagingSenderId: "1017347967393",
      appId: "1:1017347967393:web:aaf5c6a0e7d51c103663e0"
    };

    var polishMonthsGenitive = [
      "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
      "lipca", "sierpnia", "września", "października", "listopada", "grudnia"
    ];

    var dbFirestore = null;
    var messaging = null;

    try {
      if (typeof firebase !== 'undefined' && firebase.initializeApp) {
        if (!firebase.apps.length) {
          firebase.initializeApp(firebaseConfig);
        }
        if (firebase.firestore) {
          dbFirestore = firebase.firestore();
          // Bezpieczna persistencja bez synchronizacji kart, aby zapobiec zawieszeniom w PWA/Safari
          try {
            dbFirestore.enablePersistence().catch(function(err) {
              console.warn('Firestore persistence note:', err.code);
            });
          } catch(ePers) {}
          console.log('Firebase Firestore (Warszawa europe-central2) gotowy!');
          try { if (typeof nasluchujLiturgiiFirestore === 'function') nasluchujLiturgiiFirestore(); } catch(eNL) {}
        }
        if (firebase.messaging) {
          try {
            messaging = firebase.messaging();
            messaging.onMessage(function(payload) {
              var title = (payload.notification && payload.notification.title) || 'Nowe powiadomienie';
              var body  = (payload.notification && payload.notification.body)  || '';
              pokazToast(title + ': ' + body);
              odswiezDane();
            });
          } catch(eM) {}
        }
      }
    } catch(eF) {
      console.warn('Firebase init error:', eF);
    }