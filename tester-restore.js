// ════════════════════════════════════════════════════════════
// 🎴 테스터 카드 복구 (tester-restore.js) — 테스트용
// ☁️ 계정 창 맨 아래에 "UR/SSR 카드 전체 받기" 버튼을 붙인다.
//  · 아직 없는 UR/SSR 카드만 채워 줌 (이미 가진 카드·코인·진행은 건드리지 않음, 코인은 안 줌)
//  · 서버에서 데이터를 불러오다 카드가 빠졌을 때 되돌리는 용도
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  function grant() {
    var msg = document.getElementById('tc-msg');
    try {
      var n = 0;
      CARDS.filter(function (c) { return c.grade === 'UR' || c.grade === 'SSR'; }).forEach(function (c) {
        if (!owned.includes(c.id)) { owned.push(c.id); n++; }
        if (!cardCounts[c.id]) cardCounts[c.id] = 1;
      });
      localStorage.setItem('ph_cardCounts', JSON.stringify(cardCounts));
      localStorage.setItem('ph_owned', JSON.stringify(owned));
      try { if (typeof saveAll === 'function') saveAll(); } catch (e) {}
      try { if (typeof renderHomeIdols === 'function') renderHomeIdols(); if (typeof renderCollection === 'function') renderCollection(); } catch (e) {}
      if (msg) { msg.textContent = n ? ('UR/SSR 카드 ' + n + '장을 채웠어요!') : '이미 UR/SSR 카드를 모두 갖고 있어요'; msg.style.color = '#16a34a'; }
    } catch (e) { if (msg) { msg.textContent = '실패했어요: ' + e.message; msg.style.color = '#ef4444'; } }
  }
  function decorate() {
    var ov = document.getElementById('auth-overlay');
    if (!ov || ov.querySelector('#tc-box')) return;
    var card = ov.firstElementChild; if (!card) return;
    var box = document.createElement('div'); box.id = 'tc-box'; box.style.cssText = 'margin-top:10px;';
    box.innerHTML = '<button id="tc-btn" style="width:100%;padding:11px;background:#eef2ff;border:1.5px solid #a5b4fc;border-radius:10px;color:#4338ca;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit;">🎴 UR/SSR 카드 전체 받기 (테스트용)</button>' +
      '<div style="font-size:10px;color:#999;margin-top:5px;line-height:1.5;text-align:center;">없는 UR/SSR 카드만 채워요. 코인·진행은 그대로예요.</div><div id="tc-msg" style="font-size:12px;text-align:center;min-height:16px;margin-top:3px;"></div>';
    var tr = card.querySelector('#tr-box'); if (tr) card.insertBefore(box, tr); else card.appendChild(box);
    box.querySelector('#tc-btn').onclick = grant;
  }
  (function hook() {
    if (typeof window.openAuthOverlay !== 'function') { setTimeout(hook, 150); return; }
    if (window.openAuthOverlay.__tcHooked) return;
    var orig = window.openAuthOverlay;
    window.openAuthOverlay = function () { var r = orig.apply(this, arguments); try { decorate(); } catch (e) {} return r; };
    window.openAuthOverlay.__tcHooked = true;
  })();
  window.__testerRestore = { grant: grant };
})();
