// 🎤 기획사 해금 조건을 "플레이어 레벨 10"으로 (다른 기능의 해금 조건은 그대로)
// 등록: loader.js NEW_CONTENT_FILES 에 'agency-unlock.js' (pocalevel.js, agency.js 뒤)
(function () {
  'use strict';
  var NEED = 10;
  function install() {
    if (typeof window.isPocaHouseFeatureUnlocked !== 'function') return false;
    if (window.isPocaHouseFeatureUnlocked.__agencyLv) return true;
    var orig = window.isPocaHouseFeatureUnlocked;
    var w = function (key) {
      if (key === 'agency') {
        try { return Number(playerLevel) >= NEED; } catch (e) { return false; }
      }
      return orig.apply(this, arguments);
    };
    w.__agencyLv = true;
    window.isPocaHouseFeatureUnlocked = w;
    return true;
  }
  var n = 0;
  (function t() { if (!install() && n++ < 300) setTimeout(t, 200); })();
})();
