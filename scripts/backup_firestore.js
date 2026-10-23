const https = require('https');
const fs = require('fs');
const path = require('path');
const { sendTelegramMessage } = require('./notify_telegram');

const API_KEY = "AIzaSyAsgkKWXr-L3fDHQODxioVssvIGL9SQePk";
const PROJECT_ID = "makole-85f32";

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

function fetchCollection(collectionName) {
  return new Promise((resolve) => {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${encodeURIComponent(collectionName)}?pageSize=300&key=${API_KEY}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.documents && Array.isArray(json.documents)) {
            const result = {};
            json.documents.forEach(doc => {
              const docId = doc.name.split('/').pop();
              const fields = doc.fields || {};
              const plain = {};
              for (const k in fields) plain[k] = fromFirestoreValue(fields[k]);
              result[docId] = plain;
            });
            resolve(result);
          } else {
            resolve({});
          }
        } catch (e) {
          console.warn(`[Backup] Błąd parsowania kolekcji ${collectionName}:`, e.message);
          resolve({});
        }
      });
    }).on('error', (err) => {
      console.warn(`[Backup] Błąd sieci dla ${collectionName}:`, err.message);
      resolve({});
    });
  });
}

async function runBackup() {
  console.log('[Backup] Rozpoczynanie pobierania kopii zapasowej Firestore...');
  const collections = ['stan_grafiku', 'obecnosc', 'konfiguracja', 'gamifikacja', 'nagrody_miesieczne'];
  const fullBackup = {
    timestamp: new Date().toISOString(),
    collections: {}
  };

  let totalDocs = 0;
  for (const col of collections) {
    console.log(`[Backup] Pobieranie kolekcji: ${col}...`);
    const docs = await fetchCollection(col);
    const count = Object.keys(docs).length;
    fullBackup.collections[col] = docs;
    totalDocs += count;
    console.log(`[Backup] Pobrana kolekcja ${col}: ${count} dokumentów.`);
  }

  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const dateStr = new Date().toISOString().split('T')[0];
  const filePath = path.join(backupDir, `backup_${dateStr}.json`);
  const jsonContent = JSON.stringify(fullBackup, null, 2);
  fs.writeFileSync(filePath, jsonContent, 'utf8');

  const sizeKb = (Buffer.byteLength(jsonContent, 'utf8') / 1024).toFixed(1);
  console.log(`[Backup] Zapisano plik: ${filePath} (${sizeKb} KB, łącznie ${totalDocs} dokumentów).`);

  const msg = `🛡️ <b>Kopia zapasowa Firestore wykonana!</b>\n\n` +
    `📦 <b>Dokumentów:</b> ${totalDocs}\n` +
    `💾 <b>Rozmiar:</b> ${sizeKb} KB\n` +
    `🗂️ <b>Plik:</b> <code>backup_${dateStr}.json</code> (zapisano jako artefakt na GitHubie)`;
  await sendTelegramMessage(msg);

  return { sukces: true, totalDocs, sizeKb, filePath };
}

if (require.main === module) {
  runBackup().catch(err => {
    console.error('[Backup] Błąd krytyczny:', err);
    process.exit(1);
  });
}

module.exports = { runBackup };
