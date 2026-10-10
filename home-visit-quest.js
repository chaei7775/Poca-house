// ════════════════════════════════════════════════════════════
// 🏠 내 집 가보기 (home-visit-quest.js)
// '내 방 꾸미기' 튜토리얼/스토리/길잡이를 '내 집에 들어가 보기'로 바꿨다 → 내 집(장소 id 'room')을 열면 기록만 남기면 끝.
// 방 테마를 사는 건 선택 (이미 산 사람도 그대로 완료로 침).
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  function hook() {
    if (typeof window.openPlace !== 'function') { setTimeout(hook, 300); return; }
    if (window.openPlace.__homeVisit) return;
    var orig = window.openPlace;
    var w = function (id) {
      var r = orig.apply(this, arguments);
      try { if (id === 'room') localStorage.setItem('ph_visitedHome', '1'); } catch (e) {}
      return r;
    };
    w.__homeVisit = true;
    window.openPlace = w;
  }
  hook();
})();
