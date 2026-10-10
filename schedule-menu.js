// ════════════════════════════════
// 📅 더보기 → [스케줄 관리] 타일 (schedule-menu.js)
// 기획사 화면 안에 있던 '스케줄 · 식사' 화면(meal.js 의 openMealSchedule)을 더보기에서 바로 연다.
// 잠금 레벨은 unlock-gate.js 규칙(Lv.12)을 그대로 따른다.
// ════════════════════════════════
(function () {
  'use strict';
  function whenReady(cond, fn) { if (cond()) fn(); else setTimeout(function () { whenReady(cond, fn); }, 150); }
  whenReady(function () { return typeof window.openMoreMenu === 'function' && typeof window.moreMenuTileHtml === 'function'; }, function () {
    var orig = window.openMoreMenu;
    if (orig.__schedWrapped) return;
    var w = function () {
      var res = orig.apply(this, arguments);
      try {
        var grid = document.getElementById('more-menu-grid');
        if (grid && !document.getElementById('more-sched-tile')) {
          grid.insertAdjacentHTML('beforeend', window.moreMenuTileHtml('📅', '스케줄 관리', '#ffcf4a', "window.openMealSchedule && openMealSchedule()"));
          if (grid.lastElementChild) grid.lastElementChild.id = 'more-sched-tile';
        }
      } catch (e) {}
      return res;
    };
    w.__schedWrapped = true; window.openMoreMenu = w;
  });
})();
