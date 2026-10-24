const fs = require('fs');
const https = require('https');

async function deployGas() {
  console.log('[Deploy GAS] Odczytuję kod Zamiany.js...');
  const code = fs.readFileSync('Zamiany.js', 'utf8');

  const claspRc = JSON.parse(fs.readFileSync('C:/Users/Maciek/.clasprc.json'));
  const creds = claspRc.tokens.default;

  const postData = new URLSearchParams({
    client_id: creds.client_id,
    client_secret: creds.client_secret,
    refresh_token: creds.refresh_token,
    grant_type: 'refresh_token'
  }).toString();

  console.log('[Deploy GAS] Pobieram nowy token dostępowy OAuth2...');
  const accessToken = await new Promise((resolve, reject) => {
    const tokenReq = https.request('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.access_token) resolve(json.access_token);
          else reject(new Error('Brak access_token w odpowiedzi: ' + data));
        } catch(e) { reject(e); }
      });
    }).on('error', reject);
    tokenReq.write(postData);
    tokenReq.end();
  });

  const scriptId = '1JApA9KUap-P1lGe8Lh7elscqo3koW_Lo6Sh6onPkKD04X27Y4Z1qm-9T';

  console.log('[Deploy GAS] Pobieram pliki projektu Apps Script...');
  const existingFiles = await new Promise((resolve, reject) => {
    https.get('https://script.googleapis.com/v1/projects/' + scriptId + '/content', {
      headers: { 'Authorization': 'Bearer ' + accessToken }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.files || []);
        } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });

  let files = existingFiles;
  const zFile = files.find(f => f.name === 'Zamiany');
  if (zFile) {
    zFile.source = code;
  } else {
    files.push({ name: 'Zamiany', type: 'SERVER_JS', source: code });
  }

  console.log('[Deploy GAS] Zapisuję zaktualizowany plik Zamiany do Apps Script...');
  const putPayload = JSON.stringify({ files: files });
  await new Promise((resolve, reject) => {
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
        if (putRes.statusCode === 200) {
          console.log('[Deploy GAS] SUKCES! Kod Google Apps Script został zaktualizowany.');
          resolve();
        } else {
          reject(new Error('Błąd zapisu do Apps Script (status ' + putRes.statusCode + '): ' + pData));
        }
      });
    }).on('error', reject);
    putReq.write(putPayload);
    putReq.end();
  });
}

if (require.main === module) {
  deployGas().catch(err => {
    console.error('[Deploy GAS] Błąd:', err);
    process.exit(1);
  });
}

module.exports = { deployGas };
