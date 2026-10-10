// ════════════════════════════════════════════════════════════
// 🏷️ 퀘스트 목록 레벨 표시 (quest-lv-tags.js)
// 퀘스트 탭에 아직 못 하는 퀘스트(잠긴 곳으로 가야 하는 것)가 처음부터 보이던 문제.
// 설명 맨 앞에 "(Lv.N~)" 를 붙이면 quest-lock.js 가 레벨이 될 때까지 숨겨준다.
// ✏️ 레벨 숫자는 unlock-levels.js 의 quest 표에서 고친다.
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var LV = (window.PH_LEVELS && window.PH_LEVELS.quest) || {};   // 숫자는 unlock-levels.js 에서 고침
  function run() {
    try {
      if (typeof QUESTS === 'undefined') return;
      Object.keys(LV).forEach(function (id) {
        var q = QUESTS[id]; if (!q || q.__lvTag || typeof q.desc !== 'string') return;
        q.__lvTag = 1;
        if (/^\(Lv\.\d+~\)/.test(q.desc)) return;   // 이미 표시가 있으면 그대로
        q.desc = '(Lv.' + LV[id] + '~) ' + q.desc;
      });
    } catch (e) {}
  }
  run();
  var n = 0, iv = setInterval(function () { run(); if (++n > 60) clearInterval(iv); }, 500);   // 늦게 등록되는 퀘스트도 잡기
  window.__questLvTags = { LV: LV, run: run };
})();
