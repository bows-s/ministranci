const fs = require('fs');

const files = ['public/js/ranking.js', 'js/ranking.js'];

const target = `          var rankM = (stan.rankingiMiesiecy && stan.rankingiMiesiecy[wybranyMiesiacRankingu]) || 
                      (tabelaMiesiacaDane && tabelaMiesiacaDane.rankingiMiesiecy && tabelaMiesiacaDane.rankingiMiesiecy[wybranyMiesiacRankingu]) || [];
          list = rankM;`;

const replace = `          var rankM = (stan.rankingiMiesiecy && stan.rankingiMiesiecy[wybranyMiesiacRankingu]) || 
                      (tabelaMiesiacaDane && tabelaMiesiacaDane.rankingiMiesiecy && tabelaMiesiacaDane.rankingiMiesiecy[wybranyMiesiacRankingu]) || [];
          
          var rRok = (stan.rankingRok && stan.rankingRok.length) ? stan.rankingRok : ((tabelaMiesiacaDane && tabelaMiesiacaDane.rankingRok) || []);
          if (rRok && rRok.length > 0) {
            var hasPm = rRok.some(function(r) {
              return r.punktyPoMiesiacach && r.punktyPoMiesiacach.some(function(pm) { return pm.miesiac === wybranyMiesiacRankingu; });
            });
            if (hasPm) {
              var listFromPm = rRok.map(function(r) {
                var pm = (r.punktyPoMiesiacach || []).find(function(p) { return p.miesiac === wybranyMiesiacRankingu; });
                var pts = pm ? (pm.punkty !== undefined ? pm.punkty : 0) : 0;
                return {
                  nazwisko: r.nazwisko,
                  normName: (r.nazwisko || '').toLowerCase().trim(),
                  punkty: pts,
                  suma: pts,
                  grupa: r.grupa || wyznaczGrupeParafialna(r.nazwisko, '')
                };
              }).sort(function(a, b) {
                if (b.punkty !== a.punkty) return b.punkty - a.punkty;
                return a.nazwisko.localeCompare(b.nazwisko, 'pl');
              });
              var pz = 1;
              listFromPm.forEach(function(r, idx) {
                if (idx > 0 && r.punkty < listFromPm[idx - 1].punkty) pz = idx + 1;
                r.pozycja = pz;
                r.miejsce = pz;
              });
              var maxPm = Math.max.apply(null, listFromPm.map(function(x){ return x.punkty; }));
              var maxRankM = rankM.length ? Math.max.apply(null, rankM.map(function(x){ return x.punkty || 0; })) : -999;
              if (maxPm > maxRankM || rankM.length === 0) {
                rankM = listFromPm;
              }
            }
          }
          list = rankM;`;

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  let normC = c.replace(/\r\n/g, '\n');
  let normT = target.replace(/\r\n/g, '\n');
  let normR = replace.replace(/\r\n/g, '\n');
  if (normC.includes(normT)) {
    normC = normC.replace(normT, normR);
    if (c.includes('\r\n')) normC = normC.replace(/\n/g, '\r\n');
    fs.writeFileSync(f, normC, 'utf8');
    console.log('Successfully patched', f);
  } else {
    console.warn('Target not found in', f);
  }
});
