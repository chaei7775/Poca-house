// ════════════════════════════════════════════════════════════
// 🎤 첫 공연 튜토리얼 연결 (concert-tutorial.js)
// 플레이어 레벨 5가 되면 "선배의 무대" 초대 팝업이 뜨고, 홈에 [첫 공연] 버튼이 생긴다.
// 공연을 끝까지 하면 체험용 히든카드(7일)가 지급된다 (concert-farm.js + trial-card.js).
// 체험 카드를 이미 받은 계정은 아무것도 안 뜬다.
// ✏️ 고치는 법: NEED_LEVEL(몇 레벨에 열리나), COOLDOWN_H(팝업이 다시 뜨는 간격, 시간)
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var NEED_LEVEL = 5, COOLDOWN_H = 6, FREE_DRINKS = 5;
  var SHOWN = 'ph_concert_tut_shown';          // 팝업을 마지막으로 보여준 시각
  var FONT = "font-family:'Noto Sans KR',sans-serif;";

  function plv() { try { return Number(playerLevel) || 1; } catch (e) { return 1; } }
  function hasTrial() { try { return !!localStorage.getItem('ph_trialCard'); } catch (e) { return false; } }
  function eligible() { return plv() >= NEED_LEVEL && !hasTrial() && typeof window.startConcertFarm === 'function'; }
  function homeActive() { var h = document.getElementById('screen-home'); return !!(h && h.classList.contains('active')); }
  function busy() { return !!(document.getElementById('concert-overlay') || document.getElementById('concert-tut-pop') || document.querySelector('[id$="-overlay"][style*="position:fixed"]:not(#place-overlay)')); }

  function go() {
    var p = document.getElementById('concert-tut-pop'); if (p) p.remove();
    try { window.startConcertFarm({ grantCard: true, freeDrinks: FREE_DRINKS }); } catch (e) { console.error('[concert-tut]', e); }
  }
  window.startConcertTutorial = go;

  function popup() {
    if (document.getElementById('concert-tut-pop')) return;
    try { localStorage.setItem(SHOWN, String(Date.now())); } catch (e) {}
    var ov = document.createElement('div');
    ov.id = 'concert-tut-pop';
    ov.style.cssText = 'position:fixed;inset:0;z-index:960;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;padding:20px;' + FONT;
    ov.innerHTML = '<div style="background:linear-gradient(135deg,#1a1a2e,#4a1b6e);border:2px solid #f59e0b;border-radius:22px;padding:26px 22px;text-align:center;width:88%;max-width:310px;">' +
      '<div style="font-size:44px;margin-bottom:6px;">🎤</div>' +
      '<div style="font-size:19px;font-weight:900;color:#fff;margin-bottom:8px;">선배가 무대에 초대했어요!</div>' +
      '<div style="font-size:13px;color:#e9d5ff;line-height:1.7;margin-bottom:6px;">탑스타 <b style="color:#FFD700;">세연</b> 선배의 공연장!<br>팬들의 하트를 가득 채우면<br>🎁 <b style="color:#FFD700;">7일 체험 히든카드</b>를 선물로 줘요.</div>' +
      '<div style="font-size:11px;color:#c4b5fd;margin-bottom:16px;">(피로회복 드링크 ' + FREE_DRINKS + '개도 챙겨 가요)</div>' +
      '<button id="ct-go" style="width:100%;padding:14px;background:linear-gradient(135deg,#f59e0b,#ec4899);border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:900;cursor:pointer;' + FONT + '">✨ 무대 올라가기</button>' +
      '<button id="ct-later" style="width:100%;margin-top:8px;padding:11px;background:rgba(255,255,255,.1);border:none;border-radius:12px;color:#ddd;font-size:13px;cursor:pointer;' + FONT + '">나중에 할래요</button></div>';
    document.body.appendChild(ov);
    document.getElementById('ct-go').onclick = go;
    document.getElementById('ct-later').onclick = function () { ov.remove(); };
  }

  function homeButton() {
    var b = document.getElementById('concert-tut-btn');
    if (!eligible()) { if (b) b.remove(); return; }
    var box = document.querySelector('#screen-home .home-actions');
    if (!box) return;
    if (!b) {
      b = document.createElement('button'); b.id = 'concert-tut-btn';
      b.textContent = '🎤 첫 공연 · 선배의 무대 (체험 카드 증정!)';
      b.style.cssText = 'width:100%;padding:14px;background:linear-gradient(135deg,#f59e0b,#ec4899);border:none;border-radius:14px;color:#fff;font-size:14px;font-weight:900;cursor:pointer;box-shadow:0 4px 16px rgba(245,158,11,.4);' + FONT;
      b.onclick = go;
      box.insertBefore(b, box.firstChild);
    }
  }

  setInterval(function () {
    try {
      homeButton();
      if (!eligible() || !homeActive() || busy()) return;
      var last = parseInt(localStorage.getItem(SHOWN) || '0') || 0;
      if (Date.now() - last > COOLDOWN_H * 3600000) popup();
    } catch (e) {}
  }, 1500);

  window.__concertTutTest = { eligible: eligible, popup: popup, go: go, NEED_LEVEL: NEED_LEVEL };
})();
