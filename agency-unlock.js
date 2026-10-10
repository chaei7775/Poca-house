// 🎤 기획사 해금 조건을 "플레이어 레벨 5"로 (다른 기능의 해금 조건은 그대로)
// 등록: loader.js NEW_CONTENT_FILES 에 'agency-unlock.js' (pocalevel.js, agency.js 뒤)
(function () {
  'use strict';
  var NEED = (window.PH_LEVELS && window.PH_LEVELS.agency) || 5;
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
  // 잠금 안내 문구도 "플레이어 레벨" 기준으로
  function installPopup() {
    if (typeof window.showPocaHouseLockedPopup !== 'function') return false;
    if (window.showPocaHouseLockedPopup.__agencyLv) return true;
    var orig = window.showPocaHouseLockedPopup;
    var w = function (lv, name) {
      var r = orig.apply(this, arguments);
      try {
        if (name === '기획사') {
          var ov = document.getElementById('pocahouse-locked-overlay');
          var box = ov && ov.querySelector('div > div:nth-child(3)');
          if (box) box.innerHTML = '기획사는 <b>플레이어 레벨 ' + NEED + '</b>부터 이용할 수 있어요.<br>(현재 Lv.' + playerLevel + ') 알바·탐험·퀘스트로 경험치를 모아보세요!';
        }
      } catch (e) {}
      return r;
    };
    w.__agencyLv = true;
    window.showPocaHouseLockedPopup = w;
    return true;
  }
  var n = 0;
  (function t() { var a = install(), b = installPopup(); if (!(a && b) && n++ < 300) setTimeout(t, 200); })();
})();
