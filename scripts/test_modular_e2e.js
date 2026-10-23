const fs = require('fs');
const vm = require('vm');

// Mock browser window and document environment
const mockWindow = {
  location: { pathname: '/', search: '', hash: '' },
  localStorage: {
    data: {},
    getItem(k) { return this.data[k] || null; },
    setItem(k, v) { this.data[k] = String(v); },
    removeItem(k) { delete this.data[k]; },
    key(i) { return Object.keys(this.data)[i]; },
    get length() { return Object.keys(this.data).length; }
  },
  addEventListener() {},
  scrollTo() {},
  matchMedia() { return { matches: false }; },
  navigator: { userAgent: 'Chrome', serviceWorker: { register: async () => ({}), addEventListener() {} }, standalone: false }
};

const mockDocument = {
  title: '',
  getElementById(id) {
    return {
      style: {},
      innerText: '',
      innerHTML: '',
      value: '',
      classList: { add() {}, remove() {}, contains() { return false; } },
      appendChild() {},
      querySelectorAll() { return []; }
    };
  },
  write() {},
  createElement() {
    return {
      style: {},
      innerText: '',
      innerHTML: '',
      value: '',
      appendChild() {}
    };
  },
  querySelectorAll() { return []; },
  addEventListener() {}
};

const sandbox = {
  window: mockWindow,
  document: mockDocument,
  localStorage: mockWindow.localStorage,
  location: mockWindow.location,
  navigator: { userAgent: 'Chrome', serviceWorker: { register: async () => ({}), addEventListener() {} } },
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  Date: Date,
  Math: Math,
  JSON: JSON,
  encodeURIComponent: encodeURIComponent,
  decodeURIComponent: decodeURIComponent,
  parseInt: parseInt,
  parseFloat: parseFloat,
  String: String,
  Array: Array,
  Object: Object,
  RegExp: RegExp,
  fetch: () => Promise.resolve({ json: () => Promise.resolve({}) }),
  firebase: {
    apps: [],
    initializeApp: () => ({}),
    firestore: () => ({
      settings: () => {},
      enablePersistence: () => Promise.resolve(),
      collection: () => ({ doc: () => ({ get: () => Promise.resolve({ exists: false }), onSnapshot: () => () => {} }) })
    }),
    messaging: () => ({ isSupported: () => Promise.resolve(false) })
  }
};

vm.createContext(sandbox);

const scriptOrder = [
  'firebase-config.js',
  'utils.js',
  'auth.js',
  'pwa.js',
  'liturgia.js',
  'gamification.js',
  'ranking.js',
  'gielda.js',
  'zakrystia.js',
  'tabela.js',
  'app.js'
];

console.log('Testing modules execution in sandbox...');
scriptOrder.forEach(f => {
  const code = fs.readFileSync('public/js/' + f, 'utf8');
  vm.runInContext(code, sandbox, { filename: f });
  console.log(`[PASS] Executed public/js/${f}`);
});

// Test key functions across modules
console.log('\nTesting cross-module function calls:');

// 1. Version check
console.log('APP_VERSION:', sandbox.APP_VERSION);
if (sandbox.APP_VERSION !== '1.7.0') throw new Error('Wrong APP_VERSION: ' + sandbox.APP_VERSION);

// 2. Liturgy check
const litDzis = sandbox.wyznaczDaneLiturgiczne(new Date());
console.log('Liturgy today:', litDzis.kolor, '-', litDzis.nazwa);
if (!litDzis.kolor) throw new Error('Liturgy failed');

// 3. Name normalization & row matching (the bug that affected Maks Erich)
const testRows = [
  { nazwisko: 'Maks Erich' },
  { nazwisko: 'Mateusz Pierścieński' },
  { nazwisko: 'Franek Kik' }
];
const idxMaks = sandbox.znajdzWierszMinistranta(testRows, 'Maks Erich');
const idxMateusz = sandbox.znajdzWierszMinistranta(testRows, 'Mateusz Pierścieński');
const idxFranek = sandbox.znajdzWierszMinistranta(testRows, 'Franek Kik');
console.log('Matched indices:', { Maks: idxMaks, Mateusz: idxMateusz, Franek: idxFranek });
if (!idxMaks || idxMaks.nazwisko !== 'Maks Erich' ||
    !idxMateusz || idxMateusz.nazwisko !== 'Mateusz Pierścieński' ||
    !idxFranek || idxFranek.nazwisko !== 'Franek Kik') {
  throw new Error('Name matching logic failed!');
}

// 4. wycofajPrzyjeteZastepstwo exists
if (typeof sandbox.wycofajPrzyjeteZastepstwo !== 'function') {
  throw new Error('wycofajPrzyjeteZastepstwo function missing!');
}
console.log('wycofajPrzyjeteZastepstwo function: OK');

// 5. Holiday attendance scoring tests (1 Nov: 1st mass = 5 pkt, 2nd mass = 2 pkt -> total 7 pkt)
const isNov1Holiday = sandbox.czyToDzienSwiateczny5Pkt(1, 10, 2026, {});
if (!isNov1Holiday) throw new Error('1 Nov must be detected as a 5-point holiday!');

const dummyRow = {
  nazwisko: 'Maciej Erich',
  komorki: [
    {
      maDyzur: true,
      wartosc: 5,
      liturgie: { '10:00': 5 }
    }
  ]
};
const alreadyServedAt10 = sandbox.czyMinistrantBylJuzNaInnejMszyWSwieto(dummyRow, 0, '16:00');
if (!alreadyServedAt10) throw new Error('Should detect that altar server already served at 10:00 on holiday!');
const notServedYet = sandbox.czyMinistrantBylJuzNaInnejMszyWSwieto({ komorki: [{ liturgie: {} }] }, 0, '10:00');
if (notServedYet) throw new Error('Should detect altar server has not served yet on holiday!');
console.log('Holiday scoring tests (5 pkt for 1st mass, +2 for 2nd mass): OK');

// 6. Test cutoff rules:
// - Wystawienie mszy na giełdę: min. 2h przed rozpoczęciem mszy
// - Wzięcie mszy / przejęcie dyżuru: brak 2h cutoffu (można wziąć np. 10 minut przed rozpoczęciem)
const now = new Date();
const targetDateIn3h = new Date(now.getTime() + 3 * 3600 * 1000);
const targetDateIn10m = new Date(now.getTime() + 10 * 60 * 1000);
const targetDatePast = new Date(now.getTime() - 10 * 60 * 1000);

const h3Str = String(targetDateIn3h.getHours()).padStart(2, '0') + ':' + String(targetDateIn3h.getMinutes()).padStart(2, '0');
const h10mStr = String(targetDateIn10m.getHours()).padStart(2, '0') + ':' + String(targetDateIn10m.getMinutes()).padStart(2, '0');
const hPastStr = String(targetDatePast.getHours()).padStart(2, '0') + ':' + String(targetDatePast.getMinutes()).padStart(2, '0');

// Wystawienie w 3h: DOZWOLONE
if (sandbox.czyZbytPoznoNaWystawienie(targetDateIn3h.getDate(), h3Str, targetDateIn3h.getFullYear(), targetDateIn3h.getMonth())) {
  throw new Error('Should allow offering mass that is in 3 hours!');
}
// Wystawienie w 10m: ZABLOKOWANE (mniej niż 2h)
if (!sandbox.czyZbytPoznoNaWystawienie(targetDateIn10m.getDate(), h10mStr, targetDateIn10m.getFullYear(), targetDateIn10m.getMonth())) {
  throw new Error('Should block offering mass that is in 10 minutes (less than 2 hours)!');
}

// Wzięcie mszy w 10m: DOZWOLONE (msza jeszcze się nie rozpoczęła, brak 2h cutoffu!)
if (sandbox.czyMszaJuzSieRozpoczela(targetDateIn10m.getDate(), h10mStr, targetDateIn10m.getFullYear(), targetDateIn10m.getMonth())) {
  throw new Error('Should allow taking mass 10 minutes before start (mass has not started yet)!');
}
// Wzięcie mszy po rozpoczęciu: ZABLOKOWANE
if (!sandbox.czyMszaJuzSieRozpoczela(targetDatePast.getDate(), hPastStr, targetDatePast.getFullYear(), targetDatePast.getMonth())) {
  throw new Error('Should block taking mass that has already started!');
}
console.log('Exchange cutoff rules (offer >= 2h, take until start with no cutoff): OK');

console.log('\nAll integration tests passed successfully!');
process.exit(0);
