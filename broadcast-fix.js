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

  // 결과 창이 뜬 직후(0.7초)에는 '계속 탐험하기'가 눌리지 않게 함
  // (팬레터/굿즈는 탭하는 순간 결과 창이 떠서, 손가락 떼는 탭이 바로 닫기 버튼을 눌러버렸음)
  var GUARD_MS = 700;
  var born = new WeakMap();
  function mark(node) {
    if (!node || node.nodeType !== 1) return;
    var b = node.id === 'bc-next' ? node : (node.querySelector && node.querySelector('#bc-next'));
    if (b && !born.has(b)) born.set(b, Date.now());
  }
  try {
    new MutationObserver(function (muts) {
      muts.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, mark); });
    }).observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}
  function guard(e) {
    var t = e.target && e.target.closest && e.target.closest('#bc-next');
    if (!t) return;
    var b = born.get(t);
    if (b && Date.now() - b < GUARD_MS) { e.stopImmediatePropagation(); e.preventDefault(); }
  }
  ['click', 'pointerup', 'touchend', 'mouseup'].forEach(function (n) {
    document.addEventListener(n, guard, true);
  });
})();
