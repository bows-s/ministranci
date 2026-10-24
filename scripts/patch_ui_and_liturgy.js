const fs = require('fs');

function patchFile(filePath, transforms) {
  let content = fs.readFileSync(filePath, 'utf8');
  transforms.forEach(({ name, search, replace }) => {
    const normContent = content.replace(/\r\n/g, '\n');
    const normSearch = search.replace(/\r\n/g, '\n');
    const normReplace = replace.replace(/\r\n/g, '\n');

    if (normContent.includes(normSearch)) {
      const isCRLF = content.includes('\r\n');
      const patchedNorm = normContent.replace(normSearch, normReplace);
      content = isCRLF ? patchedNorm.replace(/\n/g, '\r\n') : patchedNorm;
      console.log(`[PASS] ${filePath}: ${name}`);
    } else {
      console.warn(`[WARN] ${filePath}: pattern for '${name}' not found!`);
    }
  });
  fs.writeFileSync(filePath, content, 'utf8');
}

// Patch public/js/liturgia.js
patchFile('public/js/liturgia.js', [
  {
    name: 'Update renderujKarteLiturgii for Saturday (Sunday vigil vestments)',
    search: `    function renderujKarteLiturgii(dataObj) {
      if (!dataObj) dataObj = new Date();
      var y = dataObj.getFullYear();
      var m = String(dataObj.getMonth() + 1).padStart(2, '0');
      var dStrPad = String(dataObj.getDate()).padStart(2, '0');
      var dataYMD = y + '-' + m + '-' + dStrPad;

      var lit;
      if (liturgiaOverrideFirestore && liturgiaOverrideFirestore.kolor && liturgiaOverrideFirestore.data === dataYMD) {
        lit = {
          nazwa: liturgiaOverrideFirestore.nazwa || 'Wspomnienie liturgiczne',
          okres: liturgiaOverrideFirestore.okres || 'Okres Zwykły',
          kolor: liturgiaOverrideFirestore.kolor,
          ranga: liturgiaOverrideFirestore.ranga || 'Wspomnienie',
          wskazowka: liturgiaOverrideFirestore.wskazowka || 'Szaty liturgiczne według wskazania kościelnego.'
        };
      } else {
        lit = wyznaczDaneLiturgiczne(dataObj);
      }

      var paleta = KOLORY_LITURGICZNE[lit.kolor] || KOLORY_LITURGICZNE.zielony;

      var karta = document.getElementById('karta-liturgia-dzis');
      var elKolor = document.getElementById('liturgia-kolor-nazwa');
      var elTytul = document.getElementById('liturgia-tytul');
      var elOkres = document.getElementById('liturgia-okres');
      var elRanga = document.getElementById('liturgia-ranga-badge');
      var elOrb = document.getElementById('liturgia-orb');
      var elWsk = document.getElementById('liturgia-wskazowka-tekst');

      if (karta) {
        karta.style.borderLeft = '3px solid ' + paleta.border;
        karta.style.boxShadow = '0 0 20px -3px ' + paleta.glow;
      }

      if (elKolor) {
        elKolor.innerText = paleta.nazwa;
        elKolor.style.color = paleta.tekstKolor;
      }

      if (elTytul) {
        elTytul.innerText = lit.nazwa;
      }

      if (elOkres) {
        elOkres.innerText = lit.okres;
      }

      if (elRanga) {
        elRanga.innerText = lit.ranga;
      }

      if (elOrb) {
        elOrb.style.background = paleta.bg;
        elOrb.style.boxShadow = '0 0 16px ' + paleta.glow;
      }

      if (elWsk) {
        elWsk.innerText = lit.wskazowka;
      }
    }`,
    replace: `    function renderujKarteLiturgii(dataObj) {
      if (!dataObj) dataObj = new Date();

      // W sobotę 99% ministrantów sprawdzających szaty idzie na mszę o 17:00 (niedzielna wigilia),
      // dlatego w sobotę prezentujemy szaty i formularz niedzielny (następny dzień)
      var dow = dataObj.getDay();
      var czySobota = (dow === 6);
      var dataLiturgiczna = new Date(dataObj.getTime());
      if (czySobota) {
        dataLiturgiczna.setDate(dataLiturgiczna.getDate() + 1);
      }

      var y = dataLiturgiczna.getFullYear();
      var m = String(dataLiturgiczna.getMonth() + 1).padStart(2, '0');
      var dStrPad = String(dataLiturgiczna.getDate()).padStart(2, '0');
      var dataYMD = y + '-' + m + '-' + dStrPad;

      var lit;
      if (liturgiaOverrideFirestore && liturgiaOverrideFirestore.kolor && liturgiaOverrideFirestore.data === dataYMD) {
        lit = {
          nazwa: liturgiaOverrideFirestore.nazwa || 'Wspomnienie liturgiczne',
          okres: liturgiaOverrideFirestore.okres || 'Okres Zwykły',
          kolor: liturgiaOverrideFirestore.kolor,
          ranga: liturgiaOverrideFirestore.ranga || 'Wspomnienie'
        };
      } else {
        lit = wyznaczDaneLiturgiczne(dataLiturgiczna);
      }

      var paleta = KOLORY_LITURGICZNE[lit.kolor] || KOLORY_LITURGICZNE.zielony;

      var karta = document.getElementById('karta-liturgia-dzis');
      var elNaglowek = document.getElementById('liturgia-naglowek-tekst');
      var elKolor = document.getElementById('liturgia-kolor-nazwa');
      var elTytul = document.getElementById('liturgia-tytul');
      var elOkres = document.getElementById('liturgia-okres');
      var elRanga = document.getElementById('liturgia-ranga-badge');
      var elOrb = document.getElementById('liturgia-orb');
      var elWsk = document.getElementById('liturgia-wskazowka-tekst');

      if (karta) {
        karta.style.borderLeft = '3px solid ' + paleta.border;
        karta.style.boxShadow = '0 0 20px -3px ' + paleta.glow;
      }

      if (elNaglowek) {
        elNaglowek.innerText = czySobota ? 'KOLOR SZAT LITURGICZNYCH (SOBOTA 17:00 / NIEDZIELA)' : 'KOLOR SZAT LITURGICZNYCH NA DZIŚ';
      }

      if (elKolor) {
        elKolor.innerText = paleta.nazwa;
        elKolor.style.color = paleta.tekstKolor;
      }

      if (elTytul) {
        elTytul.innerText = lit.nazwa;
      }

      if (elOkres) {
        elOkres.innerText = lit.okres;
      }

      if (elRanga) {
        elRanga.innerText = czySobota ? (lit.ranga + ' (Niedziela)') : lit.ranga;
      }

      if (elOrb) {
        elOrb.style.background = paleta.bg;
        elOrb.style.boxShadow = '0 0 16px ' + paleta.glow;
      }

      if (elWsk) {
        elWsk.innerText = lit.wskazowka || '';
      }
    }`
  }
]);
