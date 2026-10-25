const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('Testing Telegram deduplication & save debounce...');

// Setup minimal DOM and browser globals
const sandbox = {
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  Date: Date,
  JSON: JSON,
  document: {
    getElementById: (id) => {
      if (id === 'btn-zapisz-zakrystia') {
        return { disabled: false, innerText: '', style: {} };
      }
      return null;
    }
  },
  localStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; }
  },
  navigator: { onLine: true },
  window: {},
  globalUser: { nazwisko: 'Kościelny' },
  addEventListener: () => {},
  setInterval: () => {},
  clearInterval: () => {},
  cleanTime: (t) => (t || '').replace(':', '')
};
sandbox.window = sandbox;
sandbox.window.addEventListener = () => {};

// Mock fetch to track calls
let telegramCalls = [];
sandbox.fetch = async (url, opts) => {
  if (url.includes('api.telegram.org')) {
    telegramCalls.push(JSON.parse(opts.body));
    return { json: async () => ({ ok: true }) };
  }
  return { json: async () => ({}) };
};

const zakrystiaCode = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'zakrystia.js'), 'utf8');

vm.createContext(sandbox);
vm.runInContext(zakrystiaCode, sandbox);

// Test 1: wyslijAlertTelegramZakrystia deduplication
const mockStan = {
  dzien: 25,
  godzina: '08:30',
  dataTekst: '25 października',
  nazwaLiturgii: 'Msza św.',
  ministranci: [
    { nazwisko: 'Jan Kowalski', status: 'OBECNY', punkty: 3 }
  ]
};

assert.strictEqual(telegramCalls.length, 0);

// First call -> should send
sandbox.wyslijAlertTelegramZakrystia(mockStan);
assert.strictEqual(telegramCalls.length, 1, 'First call should send a Telegram message');

// Second call with same stan immediately -> should be deduplicated / ignored
sandbox.wyslijAlertTelegramZakrystia(mockStan);
assert.strictEqual(telegramCalls.length, 1, 'Second identical call within 5m must be dropped');

// Third call -> should still be ignored
sandbox.wyslijAlertTelegramZakrystia(mockStan);
assert.strictEqual(telegramCalls.length, 1, 'Third identical call within 5m must be dropped');

// Test 2: Different liturgy (10:00) -> should send
const mockStan10 = {
  dzien: 25,
  godzina: '10:00',
  dataTekst: '25 października',
  nazwaLiturgii: 'Msza św.',
  ministranci: [
    { nazwisko: 'Piotr Nowak', status: 'OBECNY', punkty: 3 }
  ]
};

sandbox.wyslijAlertTelegramZakrystia(mockStan10);
assert.strictEqual(telegramCalls.length, 2, 'Call for a different mass should send');

// Repeat for 10:00 -> should be deduplicated
sandbox.wyslijAlertTelegramZakrystia(mockStan10);
assert.strictEqual(telegramCalls.length, 2, 'Duplicate for 10:00 must be dropped');

console.log('✓ Telegram deduplication test PASSED: Exactly 1 message per liturgy sent.');
