// ════════════════════════════════
// 🌿 서브 퀘스트 (quest-sub.js) — 가이드(다음 할일)와 별개로, 퀘스트 탭 맨 아래 "서브 퀘스트" 칸에 나온다.
// - 새로 만든 5개는 경험치 없음(코인만), 메인에서 옮겨온 것은 원래 경험치 그대로(렙업 속도 유지). 이미 해본 사람은 바로 완료로 뜨고, 보상은 한 번만 받는다 (game.js 의 questProgress 가 막아줌).
// - 조건은 저장된 기록을 1초마다 읽어서 확인. 한 번 달성하면 'ph_questsub' 에 기록해 둠.
// - 서브 퀘스트를 더 만들려면 아래 SUB 에 한 줄 추가 (detect 는 true/false 돌려주면 됨).
// 등록: loader.js NEW_CONTENT_FILES 맨 끝에 'quest-sub.js'
// ════════════════════════════════
(function () {
  'use strict';
  var FKEY = 'ph_questsub';
  function J(key, def) { try { var v = JSON.parse(localStorage.getItem(key) || 'null'); return (v === null || v === undefined) ? def : v; } catch (e) { return def; } }
  var F = J(FKEY, {}) || {};
  function flag(n) { if (!F[n]) { F[n] = 1; try { localStorage.setItem(FKEY, JSON.stringify(F)); } catch (e) {} } return true; }
  function sum(o) { var n = 0; try { Object.keys(o || {}).forEach(function (k) { n += Number(o[k]) || 0; }); } catch (e) {} return n; }

  var SUB = {
    sub_sweets: { title: '첫 디저트 만들기', desc: '📅 기획사 → 스케줄·식사 → 디저트 공방에서 탐험 재료로 간식을 만들어봐. 가방에 담겨서 아이돌에게 먹일 수 있어.',
      condition: 'q3_sweets', rewardCoins: 500,
      detect: function () { return F.sweets || (sum((J('ph_sweets', {}) || {}).cooked) > 0 && flag('sweets')); } },
    sub_meal: { title: '아이돌 식사 챙기기', desc: '📅 기획사 → 스케줄·식사에서 아이돌에게 끼니를 먹여보자. 음식마다 비주얼·체력·기분이 달라져.',
      condition: 'q3_meal', rewardCoins: 500,
      detect: function () {
        if (F.meal) return true;
        var e = (J('ph_meal', {}) || {}).eaten || {};
        return Object.keys(e).some(function (k) { return e[k] && e[k].n > 0; }) && flag('meal');
      } },
    sub_spa: { title: '컨디션 관리 받기', desc: '🏖 뷰티 살롱 → 컨디션 관리 (또는 스케줄·식사 화면)에서 에스테틱·헬스장·요가·필라테스를 받아봐. 데뷔 후에 열려.',
      condition: 'q3_spa', rewardCoins: 1000,
      detect: function () { return F.spa || (sum((J('ph_spa', {}) || {}).total) > 0 && flag('spa')); } },
    sub_gift: { title: '친구에게 선물하기', desc: '👥 더보기 → 친구 → 친구 옆 🎁 선물 버튼으로 재료나 코인을 보내봐. (카드는 못 보내요)',
      condition: 'q3_gift', rewardCoins: 500,
      detect: function () { return F.gift || (!!(J('ph_gift', {}) || {}).sentEver && flag('gift')); } },
    sub_lesson: { title: '아이돌 레슨 받기', desc: '📅 기획사 → 스케줄·식사에서 아이돌에게 레슨을 받게 해보자. 처음 5번은 신입 코치 할인 이벤트!',
      condition: 'q3_lesson', rewardCoins: 500,
      detect: function () { return F.lesson || (sum((J('ph_training', {}) || {}).count) > 0 && flag('lesson')); } },
    // 👥 그룹 (Lv.20 해금) — 메인 퀘스트. 경험치는 quest-boost 가 x2 (합계 약 1.8만, 하루~이틀치). 코인도 퀘스트 코인은 quest-boost.js 가 x5 해서 지급하므로 숫자는 실제의 1/5 (실제 500만/1000만/2000만/3000만)
    sub_group_make: { title: '우리 그룹 결성하기', desc: '(Lv.20~) 더보기 → 🧑‍🎤 그룹에서 데뷔한 아이돌 2~4명을 골라 그룹을 만들어봐. 이름도 지어줘!',
      condition: 'q4_group_make', type: 'main', rewardExp: 1000, rewardCoins: 1000000,
      detect: function () { return F.gmake || (!!(J('ph_group', {}) || {}).group && flag('gmake')); } },
    sub_group_act: { title: '첫 그룹 활동', desc: '(Lv.20~) 더보기 → 그룹에서 합동 무대·그룹 음원 같은 활동을 한 번 해봐. 멤버 능력치가 높을수록 결과가 좋아져.',
      condition: 'q4_group_act', type: 'main', rewardExp: 1500, rewardCoins: 2000000,
      detect: function () { return F.gact || (((J('ph_group', {}) || {}).total || 0) >= 1 && flag('gact')); } },
    sub_group_10: { title: '그룹 활동 10번', desc: '(Lv.20~) 그룹 활동을 모두 합쳐 10번 해봐. 체력 음료를 쓰면 하루에 더 할 수 있어.',
      condition: 'q4_group_10', type: 'main', rewardExp: 2500, rewardCoins: 4000000,
      detect: function () { return F.g10 || (((J('ph_group', {}) || {}).total || 0) >= 10 && flag('g10')); } },
    sub_group_pop: { title: '인기 그룹이 되자', desc: '(Lv.20~) 그룹 인기도를 쌓아서 그룹 레벨 3 "인기 그룹"까지 올려봐. 인기도는 활동할 때마다 올라가.',
      condition: 'q4_group_pop', type: 'main', rewardExp: 4000, rewardCoins: 6000000,
      detect: function () { return F.gpop || (((J('ph_group', {}) || {}).fame || 0) >= 240 && flag('gpop')); } }
  };

  // 메인 퀘스트에 있던 것 중 서브에 어울리는 것들 → 서브로 옮기되 경험치는 원래 그대로 (코인 보상·완료 조건은 그대로, 이미 완료한 기록도 그대로)
  var MOVE = ['main_mgr_actor', 'main_mgr_top', 'main_mgr_event', 'main_mgr_road', 'main_mgr_run', 'main_mgr_event10', 'main_mgr_run10',
              'main_goods_equip', 'main_goods_full', 'main_goods_rare', 'main_drama_ok', 'main_drama_10', 'main_lv20', 'main_lv30', 'main_lv50'];
  function moveToSub() {
    if (typeof QUESTS === 'undefined') return;
    MOVE.forEach(function (id) { var q = QUESTS[id]; if (q && !q.__halfExp) { q.__halfExp = true; q.type = 'sub'; } });   // 위치만 서브로 옮김 — 경험치는 원래 그대로 (렙업 속도에 영향 없음)
  }
  function register() {
    if (typeof QUESTS === 'undefined') return false;
    Object.keys(SUB).forEach(function (id) {
      var q = SUB[id];
      if (!QUESTS[id]) QUESTS[id] = { title: q.title, desc: q.desc, condition: q.condition, rewardCoins: q.rewardCoins, rewardExp: q.rewardExp || 0, type: q.type || 'sub' };
    });
    return true;
  }
  function check() {                       // 한 번에 하나씩 (완료 팝업이 쌓이지 않게)
    try {
      if (typeof questProgress === 'undefined' || typeof checkQuestProgress !== 'function') return;
      var ids = Object.keys(SUB);
      for (var i = 0; i < ids.length; i++) {
        if (questProgress[ids[i]] === 'done') continue;
        var ok = false; try { ok = !!SUB[ids[i]].detect(); } catch (e) {}
        if (ok) { checkQuestProgress(SUB[ids[i]].condition); return; }
      }
    } catch (e) {}
  }

  // 퀘스트 탭 맨 아래에 "서브 퀘스트" 칸 붙이기 (원래 목록 그리기는 그대로 실행)
  function hookList() {
    if (typeof window.renderQuestList !== 'function') { setTimeout(hookList, 150); return; }
    var orig = window.renderQuestList;
    if (orig.__subHooked) return;
    var w = function () {
      moveToSub();
      var r = orig.apply(this, arguments);
      try {
        var el = document.getElementById('quest-list');
        if (el && typeof QUESTS !== 'undefined' && typeof questProgress !== 'undefined') {
          var html = '<div style="font-size:13px;font-weight:700;color:#FFB3CC;margin:16px 0 10px;">🌿 서브 퀘스트 <span style="font-size:10px;color:#9aa0c8;font-weight:400;">새 퀘스트는 경험치 없음</span></div>';
          Object.keys(SUB).concat(MOVE).forEach(function (id) {
            var q = QUESTS[id]; if (!q) return;
            var done = questProgress[id] === 'done';
            html += '<div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,' + (done ? '0.3' : '0.1') + ');border-radius:12px;padding:12px;margin-bottom:8px;opacity:' + (done ? '0.6' : '1') + ';">' +
              '<div style="display:flex;align-items:center;justify-content:space-between;"><div style="font-size:14px;font-weight:700;color:#fff;">' + (done ? '✅ ' : '') + q.title + '</div><div style="font-size:11px;color:#FFD700;">🍔' + q.rewardCoins + (q.rewardExp ? ' ⭐' + q.rewardExp : '') + '</div></div>' +
              '<div style="font-size:12px;color:#aaa;margin-top:4px;">' + q.desc.slice(0, 60) + '...</div></div>';
          });
          el.insertAdjacentHTML('beforeend', html);
        }
      } catch (e) {}
      return r;
    };
    w.__subHooked = true; window.renderQuestList = w;
  }

  (function boot() {
    if (!register()) { setTimeout(boot, 200); return; }
    hookList();
    moveToSub();
    setInterval(function () { moveToSub(); check(); }, 1000);
  })();
  window.__questSubTest = { SUB: SUB, check: check, flag: flag };
})();
