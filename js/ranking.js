// =============================================================
    // OBSŁUGA LIGI MINISTRANTÓW I RANKINGU
    // =============================================================
    var aktywnyTabRankingu = 'miesiac';

    function formatujPozycje(poz) {
      if (!poz) return '--';
      if (poz === 1) return '1. miejsce';
      if (poz === 2) return '2. miejsce';
      if (poz === 3) return '3. miejsce';
      return poz + '. miejsce';
    }

    function ustawOdznakeRankingu(elemId, poz) {
      var el = document.getElementById(elemId);
      if (!el) return;
      if (!poz) {
        el.innerText = '--';
        el.className = 'point-badge badge-rank-normal';
        return;
      }
      el.innerText = formatujPozycje(poz);
      if (poz === 1) el.className = 'point-badge badge-rank-gold';
      else if (poz === 2) el.className = 'point-badge badge-rank-silver';
      else if (poz === 3) el.className = 'point-badge badge-rank-bronze';
      else el.className = 'point-badge badge-rank-normal';
    }

    function ustawOdznakeMinusow(elemId, minusy, poz) {
      var el = document.getElementById(elemId);
      if (!el) return;
      if (!minusy || minusy >= 0) {
        el.innerText = 'Czyste konto';
        el.className = 'point-badge badge-clean';
      } else {
        var txt = (poz && poz > 0) ? (poz + '. w minusach') : (minusy + ' pkt');
        el.innerText = '' + txt;
        el.className = 'point-badge badge-minus-warn';
      }
    }

    function otworzRankingModal(tab) {
      var m = document.getElementById('modal-ranking');
      if (m) m.style.display = 'flex';
      przelaczTabRankingu(tab || aktywnyTabRankingu || 'miesiac');
    }

    function zamknijRankingModal() {
      var m = document.getElementById('modal-ranking');
      if (m) m.style.display = 'none';
    }

    function pokazSzczegolyPunktowRoku(nazwisko) {
      var modal = document.getElementById('modal-szczegoly-roku');
      var tytulEl = document.getElementById('modal-szczegoly-roku-tytul');
      var podtytulEl = document.getElementById('modal-szczegoly-roku-podtytul');
      var listaDiv = document.getElementById('modal-szczegoly-roku-lista');
      var sumaEl = document.getElementById('modal-szczegoly-roku-suma');
      if (!modal || !listaDiv) return;

      var stan = globalUser.stan || {};
      var list = (stan.rankingRok && stan.rankingRok.length) ? stan.rankingRok : ((tabelaMiesiacaDane && tabelaMiesiacaDane.rankingRok) || []);

      var target = null;
      var nLow = (nazwisko || "").toLowerCase().trim();
      for (var i = 0; i < list.length; i++) {
        var it = list[i];
        if (!it || !it.nazwisko) continue;
        var itLow = it.nazwisko.toLowerCase().trim();
        if (itLow === nLow || itLow.indexOf(nLow) !== -1 || nLow.indexOf(itLow) !== -1) {
          target = it;
          break;
        }
      }

      var displayName = target ? target.nazwisko : (nazwisko || "Ministrant");
      var currentLogged = (globalUser.nazwisko || "").trim().toLowerCase();
      var isMe = currentLogged && (displayName.toLowerCase().indexOf(currentLogged) !== -1 || currentLogged.indexOf(displayName.toLowerCase()) !== -1);

      if (tytulEl) tytulEl.innerText = displayName + (isMe ? ' (Ty)' : '');
      if (podtytulEl) {
        var pozStr = (target && target.pozycja) ? (target.pozycja + '. miejsce w rankingu roku') : 'Klasyfikacja roczna';
        podtytulEl.innerText = pozStr;
      }

      var miesiace = (target && target.punktyPoMiesiacach) ? target.punktyPoMiesiacach : [];
      if ((!miesiace || miesiace.length === 0) && isMe && globalUser.stan && globalUser.stan.punktyPoMiesiacach) {
        miesiace = globalUser.stan.punktyPoMiesiacach;
      }

      if (!miesiace || miesiace.length === 0) {
        listaDiv.innerHTML = 
          '<div style="text-align:center; padding:28px 12px; color:var(--text-muted);">' +
            '' +
            '<div style="font-weight:600; font-size:14px; color:#fafafa;">Brak szczegółów miesięcy</div>' +
            '<div style="font-size:12px; margin-top:4px; color:#a1a1aa;">Dane punktów za poszczególne miesiące są aktualizowane lub ministrant nie ma jeszcze punktów.</div>' +
          '</div>';
        if (sumaEl) {
          var tot = (target && target.punkty !== undefined) ? target.punkty : 0;
          sumaEl.innerHTML = 'Łącznie: <b>' + (tot > 0 ? '+' : '') + tot + ' pkt</b>';
        }
      } else {
        var posortowane = miesiace.slice().sort(function(a, b) {
          return (a.miesiacIdx !== undefined && b.miesiacIdx !== undefined) ? (a.miesiacIdx - b.miesiacIdx) : 0;
        });

        var sumaPts = 0;
        var html = '<div style="display:flex; flex-direction:column; gap:8px;">';

        posortowane.forEach(function(m) {
          var pts = m.punkty !== undefined ? m.punkty : 0;
          sumaPts += pts;
          var ptsBadge = pts > 0 
            ? '<span style="font-size:12px; font-weight:500; color:#22d3ee; background:rgba(8,51,68,0.4); border:1px solid rgba(6,182,212,0.3); padding:2px 8px; border-radius:4px; white-space:nowrap;">+' + pts + ' pkt</span>'
            : (pts < 0 
                ? '<span style="font-size:12px; font-weight:500; color:#fb7185; background:rgba(76,5,25,0.4); border:1px solid rgba(239,68,68,0.3); padding:2px 8px; border-radius:4px; white-space:nowrap;">' + pts + ' pkt</span>'
                : '<span style="font-size:12px; font-weight:500; color:#a1a1aa; background:#27272a; border:1px solid #3f3f46; padding:2px 8px; border-radius:4px; white-space:nowrap;">0 pkt</span>');

          var curRankM = (stan.rankingMiesiac || (tabelaMiesiacaDane && tabelaMiesiacaDane.rankingMiesiac) || []);
          var isCurMonthEntry = (m.miesiacIdx === (tabelaMiesiacaDane ? tabelaMiesiacaDane.miesiacIdx : (new Date()).getMonth()) || (m.miesiac && tabelaMiesiacaDane && m.miesiac.toLowerCase() === (tabelaMiesiacaDane.nazwaMiesiaca || '').toLowerCase()));
          var actualPoz = m.pozycja;
          if (isCurMonthEntry && curRankM && curRankM.length > 0) {
            var rEntry = curRankM.find(function(r) { return czyToSamoNazwisko(r.nazwisko, displayName); });
            if (rEntry && (rEntry.pozycja || rEntry.miejsce)) {
              actualPoz = rEntry.pozycja || rEntry.miejsce;
            }
          }

          var pozBadge = '';
          if (actualPoz && actualPoz > 0) {
            if (actualPoz === 1) {
              pozBadge = '<span style="font-size:11px; font-weight:600; color:#fcd34d; background:rgba(120,53,15,0.4); border:1px solid rgba(245,158,11,0.4); padding:2px 8px; border-radius:4px; margin-right:6px; white-space:nowrap;">1. miejsce</span>';
            } else {
              pozBadge = '<span style="font-size:11px; font-weight:500; color:#d4d4d8; background:#27272a; border:1px solid #3f3f46; padding:2px 8px; border-radius:4px; margin-right:6px; white-space:nowrap;">' + actualPoz + '. miejsce</span>';
            }
          }

          var rokStr = m.rok ? ' ' + m.rok : '';
          var safeMiesiac = (m.miesiac || '').replace(/'/g, "\\'");
          html += 
            '<div onclick="przeskoczDoMiesiacaRankingu(\'' + safeMiesiac + '\')" class="kafelek-miesiac-historii" title="Kliknij, aby otworzyć ranking z tego miesiąca" style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:#18181b; border:1px solid #27272a; border-radius:10px; cursor:pointer; transition:all 0.15s ease;">' +
              '<div style="display:flex; align-items:center; gap:8px;">' +
                '' +
                '<span style="font-weight:700; font-size:13px; color:#fafafa;">' + (m.miesiac || 'Miesiąc') + rokStr + '</span>' +
                '<span class="link-ranking-subtle">Ranking ›</span>' +
              '</div>' +
              '<div style="display:flex; align-items:center;">' + pozBadge + ptsBadge + '</div>' +
            '</div>';
        });

        html += '</div>';
        listaDiv.innerHTML = html;
        if (sumaEl) {
          var totalPoints = (target && target.punkty !== undefined) ? target.punkty : Math.round(sumaPts * 10) / 10;
          sumaEl.innerHTML = 'Łącznie od początku roku: <span style="color:var(--primary); font-size:14px; font-weight:800;">' + (totalPoints > 0 ? '+' : '') + totalPoints + ' pkt</span>';
        }
      }

      modal.style.display = 'flex';
    }

    function zamknijModalSzczegolyRoku() {
      var modal = document.getElementById('modal-szczegoly-roku');
      if (modal) modal.style.display = 'none';
    }

    function przeskoczDoMiesiacaRankingu(nazwaMiesiaca) {
      if (!nazwaMiesiaca) return;
      zamknijModalSzczegolyRoku();
      var m = document.getElementById('modal-ranking');
      if (m) m.style.display = 'flex';
      zmienWybranyMiesiacRankingu(nazwaMiesiaca);
    }

    function otworzModalMinusy(opcjonalneNazwisko) {
      var modal = document.getElementById('modal-minusy');
      var listaDiv = document.getElementById('modal-minusy-lista');
      if (!modal || !listaDiv) return;

      var profileModal = document.getElementById('modal-profil-ministranta');
      var isProfileOpen = profileModal && profileModal.style.display === 'flex';
      var targetName = opcjonalneNazwisko || (isProfileOpen ? aktualnyProfilNazwisko : null) || (globalUser && globalUser.nazwisko) || '';

      var stan = (globalUser && globalUser.stan) || (typeof tabelaMiesiacaDane !== 'undefined' ? tabelaMiesiacaDane : null) || {};
      var listMinusRok = (stan.rankingMinusyRok && stan.rankingMinusyRok.length) ? stan.rankingMinusyRok : ((tabelaMiesiacaDane && tabelaMiesiacaDane.rankingMinusyRok) || stan.rankingMinusy || []);
      
      var minusy = [];
      if (targetName) {
        var itemUser = listMinusRok.find(function(it) { return it && it.nazwisko && czyToSamoNazwisko(it.nazwisko, targetName); });
        if (itemUser && itemUser.szczegolyMinusow && itemUser.szczegolyMinusow.length) {
          minusy = itemUser.szczegolyMinusow;
        } else if (globalUser && globalUser.stan && globalUser.stan.szczegolyMinusow && czyToSamoNazwisko(globalUser.nazwisko, targetName)) {
          minusy = globalUser.stan.szczegolyMinusow;
        }
      } else {
        minusy = (globalUser && globalUser.stan && globalUser.stan.szczegolyMinusow) ? globalUser.stan.szczegolyMinusow : [];
      }

      var modalTytul = document.querySelector('#modal-minusy h3 span');
      if (modalTytul) {
        modalTytul.innerText = targetName ? ('Punkty ujemne: ' + targetName) : 'Punkty ujemne (cały rok)';
      }

      if (!minusy || minusy.length === 0) {
        listaDiv.innerHTML = 
          '<div style="text-align:center; padding:28px 12px; color:#34d399;">' +
            '<div style="font-weight:700; font-size:15px; color:#34d399;">Czyste konto!</div>' +
            '<div style="font-size:13px; color:#a1a1aa; margin-top:4px;">Brak punktów ujemnych w całym roku.</div>' +
          '</div>';
      } else {
        var html = '<div style="display:flex; flex-direction:column; gap:8px;">';
        // Posortuj od najnowszych
        var posortowane = minusy.slice().reverse();
        posortowane.forEach(function(item) {
          var dataStr = item.dzien + ' ' + (item.miesiacGen || item.miesiac || '') + ' ' + (item.rok || '');
          var ptsVal = (item.punkty !== undefined ? item.punkty : (item.wartosc || -5));
          html += 
            '<div style="display:flex; justify-content:space-between; align-items:center; padding:11px 14px; background:#18181b; border:1px solid #27272a; border-radius:8px; border-left:3px solid #ef4444;">' +
              '<div>' +
                '<div style="font-weight:700; font-size:13px; color:#fafafa;">' + dataStr.trim() + '</div>' +
                '<div style="font-size:12px; color:#a1a1aa; text-transform:capitalize; margin-top:2px;">' + (item.dzienTygodnia || '') + '</div>' +
              '</div>' +
              '<div style="font-size:14px; font-weight:800; color:#f87171;">' + ptsVal + ' pkt</div>' +
            '</div>';
        });
        html += '</div>';
        listaDiv.innerHTML = html;
      }

      modal.style.display = 'flex';
    }

    function zamknijModalMinusy() {
      var modal = document.getElementById('modal-minusy');
      if (modal) modal.style.display = 'none';
    }

    var wybranyMiesiacRankingu = null;
    var okresMinusow = 'rok'; // Domyślnie ranking minusów otwiera się od początku roku

    function zmienWybranyMiesiacRankingu(mName) {
      wybranyMiesiacRankingu = mName;
      przelaczTabRankingu('miesiac');
    }

    function przelaczOkresMinusow(okres) {
      okresMinusow = okres;
      var bRok = document.getElementById('btn-minus-okres-rok');
      var bMies = document.getElementById('btn-minus-okres-miesiac');
      if (bRok) bRok.className = 'tab-btn' + (okres === 'rok' ? ' active' : '');
      if (bMies) bMies.className = 'tab-btn' + (okres === 'miesiac' ? ' active' : '');
      przelaczTabRankingu('minus');
    }

    function przelaczTabRankingu(tab) {
      aktywnyTabRankingu = tab;
      var btnM = document.getElementById('tab-rank-miesiac');
      var btnR = document.getElementById('tab-rank-rok');
      var btnMin = document.getElementById('tab-rank-minus');
      var desc = document.getElementById('ranking-opis');

      if (btnM) btnM.className = 'tab-btn' + (tab === 'miesiac' ? ' active' : '');
      if (btnR) btnR.className = 'tab-btn' + (tab === 'rok' ? ' active' : '');
      if (btnMin) btnMin.className = 'tab-btn' + (tab === 'minus' ? ' active' : '');

      var selBox = document.getElementById('ranking-miesiac-wybor-box');
      if (selBox) selBox.style.display = (tab === 'miesiac' ? 'flex' : 'none');

      var minBox = document.getElementById('ranking-minusy-okres-box');
      if (minBox) minBox.style.display = (tab === 'minus' ? 'flex' : 'none');

      var stan = globalUser.stan || (typeof tabelaMiesiacaDane !== 'undefined' ? tabelaMiesiacaDane : null);
      if (!stan) return;

      var box = document.getElementById('ranking-lista-box');
      if (!box) return;

      var polishMonthsAll = [
        "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
        "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
      ];
      var currentMIdx = (stan.miesiacIdx !== undefined) ? stan.miesiacIdx : (new Date()).getMonth();
      var currentMonthName = stan.nazwaMiesiaca || polishMonthsAll[currentMIdx];
      if (!wybranyMiesiacRankingu) {
        wybranyMiesiacRankingu = currentMonthName;
      }

      // Aktualizacja opcji w select
      var selEl = document.getElementById('select-ranking-miesiac');
      if (selEl) {
        var needsRebuild = (selEl.options.length === 0 || selEl.dataset.curM !== String(currentMIdx));
        if (needsRebuild) {
          selEl.dataset.curM = String(currentMIdx);
          var optHtml = '';
          for (var mi = currentMIdx; mi >= 0; mi--) {
            var mName = polishMonthsAll[mi];
            var isCurrent = (mi === currentMIdx);
            optHtml += '<option value="' + mName + '"' + (mName === wybranyMiesiacRankingu ? ' selected' : '') + '>' + mName + ' ' + (stan.rok || (new Date()).getFullYear()) + (isCurrent ? ' (bieżący)' : '') + '</option>';
          }
          selEl.innerHTML = optHtml;
        } else {
          selEl.value = wybranyMiesiacRankingu;
        }
      }

      var currentLogged = (globalUser.nazwisko || "").trim().toLowerCase();

      var html = '<table class="ranking-table" style="table-layout:fixed; width:100%;"><thead><tr>' +
                 '<th style="width:40px; text-align:center;">#</th>' +
                 '<th style="text-align:left;">Ministrant</th>' +
                 '<th style="text-align:right; width:115px; padding-right:14px; white-space:nowrap;">' + (tab === 'minus' ? 'Minusy' : 'Punkty') + '</th>' +
                 '</tr></thead><tbody>';

      var list = [];
      if (tab === 'miesiac') {
        var isCurrentSelected = (wybranyMiesiacRankingu === currentMonthName);
        if (isCurrentSelected) {
          if (desc) desc.innerText = 'Aktualna klasyfikacja punktowa w bieżącym miesiącu (' + currentMonthName + ' ' + (stan.rok || (new Date()).getFullYear()) + ').';
          var curWiersze = (stan.wiersze && stan.wiersze.length) ? stan.wiersze : ((tabelaMiesiacaDane && tabelaMiesiacaDane.wiersze) || []);
          if (curWiersze && curWiersze.length) {
            list = curWiersze.filter(function(w) {
              if (!w || !w.nazwisko) return false;
              var nw = w.nazwisko.toLowerCase().trim();
              return nw !== 'kościelny' && nw !== 'koscielny';
            }).map(function(w) {
              var p = 0;
              if (w.komorki && Array.isArray(w.komorki)) {
                p = w.komorki.reduce(function(acc, c) {
                  var v = c ? c.wartosc : null;
                  if (typeof v === 'number') return acc + v;
                  if (typeof v === 'string') {
                    var num = parseFloat(v.replace(',', '.'));
                    if (!isNaN(num)) return acc + num;
                  }
                  return acc;
                }, 0);
                p = Math.round(p * 10) / 10;
              } else {
                p = (w.suma !== undefined && w.suma !== null) ? (parseFloat(w.suma) || 0) : 0;
              }
              return {
                nazwisko: w.nazwisko,
                punkty: p,
                suma: p,
                grupa: wyznaczGrupeParafialna(w.nazwisko, w.grupa)
              };
            }).sort(function(a, b) {
              if (b.punkty !== a.punkty) return b.punkty - a.punkty;
              return a.nazwisko.localeCompare(b.nazwisko, 'pl');
            });
            var rPoz = 1;
            list.forEach(function(r, idx) {
              if (idx > 0 && r.punkty < list[idx - 1].punkty) rPoz = idx + 1;
              r.pozycja = rPoz;
              r.miejsce = rPoz;
            });
          } else {
            list = (stan.rankingMiesiac && stan.rankingMiesiac.length) ? stan.rankingMiesiac : ((tabelaMiesiacaDane && tabelaMiesiacaDane.rankingMiesiac) || []);
          }
        } else {
          if (desc) desc.innerText = 'Klasyfikacja punktowa w miesiącu: ' + wybranyMiesiacRankingu + ' ' + (stan.rok || (new Date()).getFullYear()) + '.';
          var rankM = (stan.rankingiMiesiecy && stan.rankingiMiesiecy[wybranyMiesiacRankingu]) || 
                      (tabelaMiesiacaDane && tabelaMiesiacaDane.rankingiMiesiecy && tabelaMiesiacaDane.rankingiMiesiecy[wybranyMiesiacRankingu]) || [];
          list = rankM;
        }
      } else if (tab === 'rok') {
        if (desc) desc.innerText = 'Klasyfikacja generalna od początku roku ' + (stan.rok || (new Date()).getFullYear()) + '.';
        list = (stan.rankingRok && stan.rankingRok.length) ? stan.rankingRok : ((tabelaMiesiacaDane && tabelaMiesiacaDane.rankingRok) || []);
      } else if (tab === 'minus') {
        if (okresMinusow === 'rok') {
          if (desc) desc.innerText = 'Ranking punktów ujemnych od początku roku ' + (stan.rok || (new Date()).getFullYear()) + ' (kto ma czyste konto, a kto zebrał najwięcej minusów).';
          list = (stan.rankingMinusyRok && stan.rankingMinusyRok.length) ? stan.rankingMinusyRok : ((tabelaMiesiacaDane && tabelaMiesiacaDane.rankingMinusyRok) || stan.rankingMinusy || []);
        } else {
          if (desc) desc.innerText = 'Ranking punktów ujemnych w bieżącym miesiącu (' + currentMonthName + ' ' + (stan.rok || (new Date()).getFullYear()) + ').';
          list = (stan.rankingMinusyMiesiac && stan.rankingMinusyMiesiac.length) ? stan.rankingMinusyMiesiac : ((tabelaMiesiacaDane && tabelaMiesiacaDane.rankingMinusyMiesiac) || []);
        }
      }

      // Bez kościelnego w Lidze Ministrantów
      list = (list || []).filter(function(it) {
        if (!it || !it.nazwisko) return false;
        var n = it.nazwisko.toLowerCase().trim();
        return n !== 'kościelny' && n !== 'koscielny';
      });

      if (!list || list.length === 0) {
        html += '<tr><td colspan="3" style="text-align:center; padding:20px; color:var(--text-muted);">Brak danych w tej kategorii.</td></tr>';
      } else {
        for (var i = 0; i < list.length; i++) {
          var item = list[i];
          var nameLower = (item.nazwisko || "").trim().toLowerCase();
          var isUser = !!currentLogged && !!nameLower && (nameLower.indexOf(currentLogged) !== -1 || currentLogged.indexOf(nameLower) !== -1);

          var itemPozycja = (item.pozycja !== undefined && item.pozycja !== null) ? item.pozycja : ((item.miejsce !== undefined && item.miejsce !== null) ? item.miejsce : (i + 1));
          var itemPunkty = (item.punkty !== undefined && item.punkty !== null) ? item.punkty : ((item.suma !== undefined && item.suma !== null) ? item.suma : 0);

          var posIcon = itemPozycja;
          var podiumClass = '';
          if (tab !== 'minus') {
            if (itemPozycja === 1) { posIcon = '1'; podiumClass = 'ranking-podium-1'; }
            else if (itemPozycja === 2) { posIcon = '2'; podiumClass = 'ranking-podium-2'; }
            else if (itemPozycja === 3) { posIcon = '3'; podiumClass = 'ranking-podium-3'; }
          } else {
            if (itemPozycja === 0) {
              posIcon = '';
            } else if (itemPozycja === 1) {
              posIcon = '1';
            } else {
              posIcon = itemPozycja;
            }
          }

          var rowClass = (isUser ? 'ranking-row-user ' : '') + podiumClass;
          var ptsDisplay = '';
          if (tab === 'minus') {
            var minVal = (item.minusy !== undefined && item.minusy !== null) ? item.minusy : ((item.punkty !== undefined) ? item.punkty : 0);
            if (minVal < 0) {
              ptsDisplay = '<span style="color:#f87171; font-weight:700; font-variant-numeric:tabular-nums;">' + minVal + ' pkt</span>';
            } else {
              ptsDisplay = '<span style="color:#34d399; font-weight:700; font-variant-numeric:tabular-nums;">0 pkt</span>';
            }
          } else {
            ptsDisplay = '<span style="font-weight:700; color:var(--primary); font-variant-numeric:tabular-nums;">' + (itemPunkty > 0 ? '+' : '') + itemPunkty + ' pkt</span>';
          }

          var safeName = (item.nazwisko || "").replace(/'/g, "\\'");
          var rowClickAttr = ' onclick="otworzProfilMinistranta(\'' + safeName + '\')" title="Kliknij, aby otworzyć profil ministranta"';
          var rowCursor = 'cursor:pointer; ';
          var arrowCta = '<span style="color:#71717a; font-size:12px; margin-left:6px; display:inline-block; width:8px; text-align:center;">›</span>';

          html += '<tr class="' + rowClass + '" style="' + rowCursor + '"' + rowClickAttr + '>' +
                  '<td style="text-align:center; font-weight:bold;">' + posIcon + '</td>' +
                  '<td style="text-align:left; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + item.nazwisko + (isUser ? ' <span class="tag-you">Ty</span>' : '') + '</td>' +
                  '<td style="text-align:right; padding-right:14px; white-space:nowrap;">' +
                    '<div style="display:inline-flex; align-items:center; justify-content:flex-end; width:100%;">' + ptsDisplay + arrowCta + '</div>' +
                  '</td>' +
                  '</tr>';
        }
      }

      html += '</tbody></table>';
      box.innerHTML = html;
    }