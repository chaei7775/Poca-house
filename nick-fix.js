// ════════════════════════════════
// 🪪 닉네임이 '플레이어'로 굳는 문제 보정 (nick-fix.js)
//  원인: 서버 저장 때 이 폰에 닉네임이 없으면 '플레이어'라는 임시 이름을 서버에 덮어써 버림 →
//        비번을 바꿔 다시 로그인하면 서버의 '플레이어'가 그대로 복원돼서 계속 '플레이어'로 뜸
//  ① 닉네임이 없거나 '플레이어'이면 서버에 닉네임을 아예 보내지 않는다 (서버에 있던 진짜 닉네임을 안 덮음)
//  ② 이미 '플레이어'로 굳은 계정은: 접속할 때 닉네임 정하는 창을 다시 띄워서 새로 정하게 한다 (중복 확인은 기존 그대로)
// ════════════════════════════════
(function () {
  'use strict';
  var PLACEHOLDER = '플레이어';
  function curNick() { try { return localStorage.getItem('ph_nickname') || ''; } catch (e) { return ''; } }

  function wrapPayload() {
    if (typeof window.getPocaServerPayload !== 'function') return false;
    if (window.getPocaServerPayload.__nickFix) return true;
    var orig = window.getPocaServerPayload;
    var w = function () {
      var p = orig.apply(this, arguments);
      try { var n = curNick(); if (!n || n === PLACEHOLDER) delete p.nickname; } catch (e) {}
      return p;
    };
    w.__nickFix = true; window.getPocaServerPayload = w;
    try { getPocaServerPayload = w; } catch (e) {}
    return true;
  }

  function reask() {
    if (curNick() !== PLACEHOLDER) return;
    try { localStorage.removeItem('ph_nickname'); } catch (e) {}
    var popup = document.getElementById('nickname-popup'); if (!popup) return;
    var sub = popup.querySelector('.nickname-sub'); if (sub) sub.textContent = '닉네임이 초기화됐어요. 새 닉네임을 정해주세요!';
    var tn = document.getElementById('topbar-nick'); if (tn) tn.textContent = '';
    popup.style.display = 'flex';
  }

  var tries = 0, t = setInterval(function () { if (wrapPayload() || ++tries > 60) clearInterval(t); }, 200);
  // 접속 직후에 한 번 (서버 복원 → 새로고침 뒤에도 같은 방식으로 뜸)
  setTimeout(reask, 2500);
})();
