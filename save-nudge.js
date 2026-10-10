// ════════════════════════════════════════════════════════════
// ☁️ 계정 만들기 안내 (save-nudge.js)
// 게스트(로그인 안 한) 플레이는 진행이 그 폰에만 저장돼서, 폰을 바꾸거나 저장이 사라지면 처음부터 다시 해야 한다.
// → 게스트로 레벨 3 / 6 / 10 을 달성했을 때, 홈 화면이 한가할 때 한 번씩 부드럽게 계정 만들기를 권한다.
//   (로그인했거나, 로그인 상태를 아직 모를 때는 안 띄움. "나중에"를 누르면 그 단계는 다시 안 물음)
// ✏️ 고치는 법: STAGES (안내할 레벨들) 만 고치면 됨.
// ⚠️ 안내문에 '웹사이트 데이터 지우기' 같은 말은 쓰지 않는다 (게스트 진행이 날아갈 수 있음).
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var STAGES = [3, 6, 10];
  var KEY = 'ph_saveNudge';   // 이미 안내한 단계들 (JSON 배열)
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch (e) { return []; } }
  function save(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {} }
  function lvNow() { try { return Number(playerLevel) || 1; } catch (e) { return 1; } }
  function isGuest() { return window.pocaLoggedInUid === null; }   // undefined = 아직 로그인 상태를 모름 → 안 띄움
  function onHome() { var s = document.getElementById('screen-home'); return !!(s && s.classList.contains('active')); }
  function busy() {
    var els = document.querySelectorAll('[id$="overlay"],[id$="-pop"],[id$="popup"]');
    for (var i = 0; i < els.length; i++) { if (getComputedStyle(els[i]).display !== 'none') return true; }
    return false;
  }
  function pending() {
    var done = load(), lv = lvNow();
    for (var i = STAGES.length - 1; i >= 0; i--) if (lv >= STAGES[i] && done.indexOf(STAGES[i]) < 0) return STAGES[i];
    return null;
  }
  function close() { var e = document.getElementById('save-nudge'); if (e) e.remove(); }
  function mark(stage) { var d = load(); STAGES.forEach(function (s) { if (s <= stage && d.indexOf(s) < 0) d.push(s); }); save(d); }
  function show(stage) {
    close();
    var cards = 0; try { cards = owned.length; } catch (e) {}
    var o = document.createElement('div');
    o.id = 'save-nudge';
    o.style.cssText = 'position:fixed;inset:0;z-index:980;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;padding:20px;';
    o.innerHTML = '<div style="width:100%;max-width:320px;background:#fff;border-radius:20px;padding:24px 20px;text-align:center;">' +
      '<div style="font-size:34px;margin-bottom:6px;">☁️</div>' +
      '<div style="font-size:16px;font-weight:900;color:#222;margin-bottom:8px;">진행 상황을 지켜둘까요?</div>' +
      '<div style="font-size:13px;color:#555;line-height:1.7;margin-bottom:16px;">지금은 <b>이 폰에만</b> 저장되고 있어요.<br>지금까지 키운 진행(Lv.' + lvNow() + (cards ? ' · 카드 ' + cards + '장' : '') + ')을<br>계정에 올려두면 폰을 바꾸거나 저장이 사라져도 이어서 할 수 있어요.</div>' +
      '<button id="save-nudge-go" style="width:100%;padding:13px;margin-bottom:8px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:900;cursor:pointer;">계정 만들기 / 로그인</button>' +
      '<button id="save-nudge-later" style="width:100%;padding:11px;background:#f3f3f3;border:none;border-radius:12px;color:#777;font-size:13px;font-weight:700;cursor:pointer;">나중에</button></div>';
    document.body.appendChild(o);
    document.getElementById('save-nudge-go').onclick = function () { mark(stage); close(); try { openAuthOverlay(); } catch (e) {} };
    document.getElementById('save-nudge-later').onclick = function () { mark(stage); close(); };
  }
  var calm = 0;
  setInterval(function () {
    try {
      if (!isGuest() || document.getElementById('save-nudge')) { calm = 0; return; }
      var st = pending();
      if (st === null || !onHome() || busy()) { calm = 0; return; }
      if (++calm >= 3) { calm = 0; show(st); }   // 홈이 방해 없이 3번(약 9초) 연속 한가했을 때만
    } catch (e) {}
  }, 3000);
  window.__saveNudge = { STAGES: STAGES, pending: pending, show: show, KEY: KEY };
})();
