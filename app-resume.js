// ════════════════════════════════════════════════════════════
// 🔄 앱 복귀 시 자동 새로고침 (app-resume.js)
// 설치형 앱(PWA)은 껐다 켜도 예전 화면이 메모리에 그대로 남아 있어서, 새로고침해야 고쳐지는 문제가 생김.
// → 앱을 5분 넘게 떠나 있다가 돌아오면 자동으로 새로고침해서 "새로 켠 것"과 똑같게 만든다.
//   (떠나는 순간 saveAll() 로 저장해 두므로 진행 상황은 안 날아감)
// ✏️ 고치는 법: AWAY_MIN 숫자만 바꾸면 됨 (분 단위)
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var AWAY_MIN = 5;
  var hiddenAt = 0;
  function save() { try { if (typeof saveAll === 'function') saveAll(); } catch (e) {} }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); save(); return; }
    if (hiddenAt && Date.now() - hiddenAt > AWAY_MIN * 60000) { hiddenAt = 0; location.reload(); }
  });
  window.addEventListener('pageshow', function (e) { if (e.persisted) location.reload(); });
})();
