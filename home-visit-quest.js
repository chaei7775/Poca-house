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

  // 보상 경험치는 완료하는 순간의 레벨에 맞춰 달라짐:
  //  Lv3 이하 → 400 (다음 레벨업 + 다음 칸 절반쯤 이월) / Lv4 → 120 (5레벨까지 안 가게) / Lv5 이상 → 80
  function tuneReward() {
    if (typeof QUESTS === 'undefined' || !QUESTS.tut_room) { setTimeout(tuneReward, 300); return; }
    var q = QUESTS.tut_room;
    if (q.__tuned) return;
    q.__tuned = true;
    Object.defineProperty(q, 'rewardExp', {
      configurable: true, enumerable: true,
      get: function () {
        var lv = (typeof playerLevel !== 'undefined') ? playerLevel : 1;
        return lv <= 3 ? 400 : lv === 4 ? 120 : 80;
      },
      set: function () {}
    });
  }
  tuneReward();
})();
