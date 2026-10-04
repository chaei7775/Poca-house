// 🏠 포카 초반 레벨업 필요 경험치 완화 (별도 모듈 — pocalevel.js / game.js 안 건드림)
// 1~9레벨: 필요 경험치 레벨×20 → 레벨×8 (Lv3까지 합계 60 → 24). 10레벨부터는 그대로.
(function () {
  'use strict';
  var tries = 0;
  function patch() {
    if (typeof window.getCardExpRequired !== 'function' || typeof window.addCardExp !== 'function') {
      if (++tries < 120) setTimeout(patch, 500);
      return;
    }
    if (window.__cardExpBoost) return;
    window.__cardExpBoost = true;
    var orig = window.getCardExpRequired;
    window.getCardExpRequired = function (level) {
      if (level < 10) return Math.max(8, level * 8);
      return orig(level);
    };
    try { if (typeof updatePocaHouseLevelBar === 'function') updatePocaHouseLevelBar(); } catch (e) {}
  }
  patch();
})();
