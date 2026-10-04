// 🛡️ 팬덤 원정(촬영) 화면에서 연타/꾹 누를 때 검색·복사·확대 메뉴가 뜨지 않게 막기
(function () {
  'use strict';
  if (window.__bcFix) return; window.__bcFix = true;

  var st = document.createElement('style');
  st.id = 'bc-fix-style';
  st.textContent =
    '#special-overlay, #special-overlay *{' +
      '-webkit-user-select:none!important;user-select:none!important;' +
      '-webkit-touch-callout:none!important;-webkit-tap-highlight-color:transparent!important;' +
      'touch-action:manipulation!important;}' +
    '#special-overlay img{-webkit-user-drag:none;user-drag:none;}';
  document.head.appendChild(st);

  function inside(e) {
    var t = e.target;
    return t && t.closest && t.closest('#special-overlay');
  }
  // 꾹 누르기 메뉴 / 글자 선택 / 더블탭 확대 차단 (촬영 화면 안에서만)
  ['contextmenu', 'selectstart', 'dragstart', 'gesturestart'].forEach(function (n) {
    document.addEventListener(n, function (e) { if (inside(e)) e.preventDefault(); }, true);
  });
  var lastEnd = 0;
  document.addEventListener('touchend', function (e) {
    if (!inside(e)) return;
    var now = Date.now();
    if (now - lastEnd < 350) e.preventDefault();   // 빠른 연타 때 더블탭 확대/검색 방지
    lastEnd = now;
  }, { capture: true, passive: false });
})();
