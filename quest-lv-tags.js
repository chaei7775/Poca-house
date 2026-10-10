// ════════════════════════════════════════════════════════════
// 🏷️ 퀘스트 목록 레벨 표시 (quest-lv-tags.js)
// 퀘스트 탭에 아직 못 하는 퀘스트(잠긴 곳으로 가야 하는 것)가 처음부터 보이던 문제.
// 설명 맨 앞에 "(Lv.N~)" 를 붙이면 quest-lock.js 가 레벨이 될 때까지 숨겨준다.
// ✏️ 고치는 법: 아래 LV 표에서 [퀘스트 id: 열리는 레벨] 만 고치면 됨. (레벨표는 unlock-gate.js 와 같은 값)
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var LV = {
    tut_explore: 4, tut_fishing: 4, main_mystery: 6, main_wish: 6, main_crystal: 6,
    main_debut: 5, main_debut_all: 5, main_mgr_actor: 8, main_mgr_top: 8, main_mgr_run10: 12,
    tut_recombine: 12, main_hidden: 12, main_premium: 12, main_premium_up: 12, main_premium_all: 12, main_develop: 12,
    main_enh1: 10, main_enh5: 10, main_enh10: 10,
    sub_sweets: 5, sub_meal: 5, sub_lesson: 5, sub_spa: 5, sub_gift: 4,
    sub_mail_read: 5, sub_mail_idol: 5, sub_mail_friend: 5,
    main_trans: 10, main_hidden_all: 12, main_expedition: 12, main_concert: 5, main_encore: 5, main_center: 12, main_mgr_event: 12, main_mgr_event10: 12,
    n_great: 10, n_skill: 10, n_gear1: 12, n_gear2: 12,
    n_map_rhythm: 25, n_map_papa: 30, n_map_world: 35, n_map_all: 35, chart_first_one: 18
  };
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
