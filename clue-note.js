// ════════════════════════════════
// 💡 단서 노트 (clue-note.js)
// 아이돌에게 선물하면 가끔 얻는 "단서" 대사를 한곳에 모아서 다시 볼 수 있는 화면.
//  · 인연 화면 오른쪽 위 [💡 단서 노트] 버튼 / 아이돌 상세의 [💡 단서 노트] 버튼
//  · 아이돌별로 "얻은 단서 / 전체" 를 보여주고, 아직 못 얻은 건 ??? 로 가려 둠
// 데이터: 게임의 hints(ph_hints) 와 CHAR_MEET[아이돌].hints 를 그대로 읽기만 함 (저장 방식 변경 없음)
// ════════════════════════════════
(function () {
  'use strict';
  var FONT = "font-family:'Noto Sans KR',sans-serif;";
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function found() { try { return Array.isArray(hints) ? hints : []; } catch (e) { return []; } }
  function allChars() { try { return Object.keys(CHARS).filter(function (id) { return CHAR_MEET[id] && CHAR_MEET[id].hints && CHAR_MEET[id].hints.length; }); } catch (e) { return []; } }

  function openClueNote(focusId) {
    var old = document.getElementById('clue-note'); if (old) old.remove();
    var f = found(), ids = allChars();
    if (focusId && ids.indexOf(focusId) > 0) { ids.splice(ids.indexOf(focusId), 1); ids.unshift(focusId); }
    var total = 0, got = 0, known = {};
    var rows = ids.map(function (id) {
      var hs = CHAR_MEET[id].hints, n = 0;
      var lines = hs.map(function (h) {
        total++; known[h] = 1;
        var ok = f.indexOf(h) !== -1; if (ok) { n++; got++; }
        return '<div style="padding:9px 11px;margin-top:6px;border-radius:10px;font-size:13px;line-height:1.55;' + (ok ? 'background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.3);color:#fff;">💡 ' + esc(h) : 'background:rgba(255,255,255,0.05);border:1px dashed rgba(255,255,255,0.15);color:#8d86a8;">🔒 ???') + '</div>';
      }).join('');
      var ch = CHARS[id];
      return '<div style="margin-bottom:16px;' + (id === focusId ? 'outline:1.5px solid #FF6B9D;border-radius:12px;padding:8px;' : '') + '"><div style="display:flex;align-items:center;"><div style="font-size:14px;font-weight:900;color:#FFE27A;">' + esc(ch.name) + '</div><div style="margin-left:auto;font-size:11px;color:#c9b8e8;">' + n + ' / ' + hs.length + '</div></div>' + lines + '</div>';
    }).join('');
    var extra = f.filter(function (h) { return !known[h]; });
    if (extra.length) rows += '<div style="margin-bottom:16px;"><div style="font-size:14px;font-weight:900;color:#FFE27A;">기타</div>' + extra.map(function (h) { got++; total++; return '<div style="padding:9px 11px;margin-top:6px;border-radius:10px;font-size:13px;background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.3);color:#fff;">💡 ' + esc(h) + '</div>'; }).join('') + '</div>';
    var ov = document.createElement('div'); ov.id = 'clue-note';
    ov.style.cssText = 'position:fixed;inset:0;z-index:720;background:rgba(0,0,0,0.82);display:flex;align-items:center;justify-content:center;padding:14px;' + FONT;
    ov.onclick = function (e) { if (e.target === ov) ov.remove(); };
    ov.innerHTML = '<div style="background:#1a1233;border:1.5px solid #C084FC;border-radius:18px;width:100%;max-width:380px;max-height:86vh;display:flex;flex-direction:column;color:#fff;">' +
      '<div style="padding:14px 16px 8px;display:flex;align-items:center;"><div style="font-size:16px;font-weight:900;">💡 단서 노트</div>' +
      '<button id="cn-x" style="margin-left:auto;border:none;border-radius:10px;background:rgba(255,255,255,0.1);color:#fff;padding:6px 12px;font-size:12px;font-weight:900;cursor:pointer;' + FONT + '">닫기</button></div>' +
      '<div style="padding:0 16px 10px;font-size:11.5px;color:#c9b8e8;">아이돌에게 선물하면 가끔 비밀을 흘려요. 모은 단서 ' + got + ' / ' + total + '</div>' +
      '<div style="padding:0 16px 16px;overflow-y:auto;-webkit-overflow-scrolling:touch;">' + (rows || '<div style="color:#8d86a8;text-align:center;padding:24px 0;">아직 모은 단서가 없어요</div>') + '</div></div>';
    document.body.appendChild(ov);
    ov.querySelector('#cn-x').onclick = function () { ov.remove(); };
  }
  window.openClueNote = openClueNote;

  // 인연 화면 위쪽 버튼
  function addHeaderBtn() {
    var h = document.querySelector('#screen-bond .bond-header');
    if (!h) { setTimeout(addHeaderBtn, 300); return; }
    if (h.querySelector('#cn-open')) return;
    h.style.position = 'relative';
    var b = document.createElement('button'); b.id = 'cn-open'; b.textContent = '💡 단서 노트';
    b.style.cssText = 'position:absolute;top:50%;right:14px;transform:translateY(-50%);border:none;border-radius:12px;background:rgba(255,255,255,0.25);color:#fff;padding:7px 11px;font-size:12px;font-weight:900;cursor:pointer;' + FONT;
    b.onclick = function () { openClueNote(); };
    h.appendChild(b);
  }
  addHeaderBtn();

  // 아이돌 상세에도 버튼 (선물하기 버튼 아래)
  (function hookDetail() {
    if (typeof window.openBondDetail !== 'function') { setTimeout(hookDetail, 150); return; }
    if (window.openBondDetail.__cnHooked) return;
    var orig = window.openBondDetail;
    var w = function (charId) {
      var r = orig.apply(this, arguments);
      try {
        var box = document.querySelector('#bond-detail-overlay .bond-affection');
        if (box && !box.querySelector('#cn-detail-btn') && allChars().indexOf(charId) !== -1) {
          var b = document.createElement('button'); b.id = 'cn-detail-btn';
          var n = CHAR_MEET[charId].hints.filter(function (h) { return found().indexOf(h) !== -1; }).length;
          b.textContent = '💡 단서 노트 (' + n + '/' + CHAR_MEET[charId].hints.length + ')';
          b.style.cssText = 'width:100%;margin-top:8px;padding:11px;background:rgba(192,132,252,0.15);border:1px solid rgba(192,132,252,0.45);border-radius:12px;color:#e9d5ff;font-size:13px;font-weight:700;cursor:pointer;' + FONT;
          b.onclick = function () { openClueNote(charId); };
          box.appendChild(b);
        }
      } catch (e) {}
      return r;
    };
    w.__cnHooked = true; window.openBondDetail = w;
  })();

  window.__clueTest = { openClueNote: openClueNote, allChars: allChars };
})();
