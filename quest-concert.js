// ════════════════════════════════
// 📜 공연장·포토랩 퀘스트 (quest-concert.js) — game.js / quest-extra.js 는 건드리지 않음
// 퀘스트 탭에 공연장 → 앵콜 스테이지 → 시크릿 포토랩 흐름 퀘스트를 넣는다. 조건은 3초마다 자동 확인.
// 또 '내 방 꾸미기' 튜토리얼 설명을 지금 방식(내 집 → 방 꾸미기)으로 고친다.
// 등록: loader.js NEW_CONTENT_FILES 에서 'quest-extra.js' 보다 뒤에 'quest-concert.js' 한 줄 추가
// 보상 코인을 바꾸고 싶으면 아래 rewardCoins 숫자만 고치면 된다.
// ════════════════════════════════
(function () {
  'use strict';
  var FKEY = 'ph_quest3';
  function loadF() { try { return JSON.parse(localStorage.getItem(FKEY) || '{}') || {}; } catch (e) { return {}; } }
  var F = loadF();
  function flag(n) { if (!F[n]) { F[n] = 1; try { localStorage.setItem(FKEY, JSON.stringify(F)); } catch (e) {} } }
  function J(key, def) {
    try { var v = JSON.parse(localStorage.getItem(key) || 'null'); return (v === null || v === undefined) ? def : v; } catch (e) { return def; }
  }
  function keys(o) { try { return Object.keys(o || {}); } catch (e) { return []; } }
  var ENCORE_N = 20;

  // 진행 기록 남기기 (공연장은 나가면 진행 저장이 지워지므로 '달성 기록'을 따로 남김)
  function record() {
    var run = J('ph_concertRun', null);
    if (run && typeof run.done === 'number') {
      flag('concert');
      if (run.done >= ENCORE_N) flag('encore');
    }
    var eng = J('ph_engrave', {}) || {};
    keys(eng).forEach(function (id) {
      var c = eng[id];
      if (!c) return;
      if ((c.rolls || 0) >= 1) flag('develop');
      (c.slots || []).forEach(function (s) { if (s && s.grade === 'center') flag('center'); });
    });
  }

  var NEW = {
    main_concert: { title: '공연장 입장', desc: '🎤 맵 → 팬덤 원정 → 공연장. 등교시키기로 모은 🌟우등생별 1개로 들어갈 수 있어.',
      condition: 'q3_concert', rewardCoins: 10000, rewardExp: 300, type: 'main', detect: function () { return !!F.concert; } },
    main_encore: { title: '앵콜 스테이지', desc: '🎤 공연장에서 이벤트를 20번 채우면 앵콜 스테이지가 열려. 필름🎞️도 같이 모아봐.',
      condition: 'q3_encore', rewardCoins: 15000, rewardExp: 400, type: 'main', detect: function () { return !!F.encore; } },
    main_develop: { title: '첫 프리미엄 현상', desc: '📷 앵콜 스테이지 → 시크릿 포토랩에서 프리미엄 카드를 현상해봐. 필름1개+코인이 들어가.',
      condition: 'q3_develop', rewardCoins: 15000, rewardExp: 400, type: 'main', detect: function () { return !!F.develop; } },
    main_center: { title: '센터 효과 현상', desc: '👑 포토랩 현상에서 슬롯에 [센터] 등급 효과가 뜨게 해봐. 마음에 드는 칸은 🔒로 잠가두면 지켜져.',
      condition: 'q3_center', rewardCoins: 25000, rewardExp: 600, type: 'main', detect: function () { return !!F.center; } }
  };

  var DETECT = {};
  function register() {
    if (typeof QUESTS === 'undefined') return false;
    Object.keys(NEW).forEach(function (id) {
      var q = NEW[id];
      DETECT[id] = q.detect;
      if (!QUESTS[id]) QUESTS[id] = { title: q.title, desc: q.desc, condition: q.condition, rewardCoins: q.rewardCoins, rewardExp: q.rewardExp, type: q.type };
    });
    // 방 꾸미기 튜토리얼: 이제 내 집의 방 꾸미기 버튼으로 산다 (포카 레벨 3부터)
    if (QUESTS.tut_room) QUESTS.tut_room.desc = '🏠 내 집 → 🛋️ 방 꾸미기(플레이어 Lv.3부터) → 방 테마를 사서 적용! 방을 바꾸면 기분이 달라져.';
    return true;
  }

  function check() {
    try {
      if (typeof questProgress === 'undefined' || typeof checkQuestProgress !== 'function') return;
      var ids = Object.keys(DETECT);
      for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        if (questProgress[id] === 'done') continue;
        var ok = false;
        try { ok = !!DETECT[id](); } catch (e) {}
        if (ok) { checkQuestProgress(NEW[id].condition); return; }
      }
    } catch (e) {}
  }

  (function boot() {
    if (!register()) { setTimeout(boot, 200); return; }
    // quest-extra.js 와 완료 팝업이 겹치지 않게 주기를 살짝 다르게
    setInterval(function () { record(); check(); }, 3100);
    var tries = 0;
    (function hookList() {
      if (typeof window.renderQuestList !== 'function') { if (tries++ < 50) setTimeout(hookList, 100); return; }
      var cur = document.getElementById('screen-quest');
      if (cur && cur.classList.contains('active')) { try { window.renderQuestList(); } catch (e) {} }
    })();
  })();
})();
