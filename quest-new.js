// ════════════════════════════════
// 📜 신규 기능 퀘스트 (quest-new.js) — 설렘 이벤트 / 옷장 / 소품 / 스킬 / 획득처
// - quest-extra.js 와 같은 방식: 2초마다 조건 확인, 한 번에 하나씩 완료
// - 설렘 퀘스트 보상은 '호감도 경험치'(모든 멤버에게 AFF 만큼). 나머지는 코인+경험치
// ════════════════════════════════
(function () {
  'use strict';
  var FK = 'ph_quest3';
  function J(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function flags() { return J(FK, {}) || {}; }
  function setFlag(n) { var f = flags(); if (!f[n]) { f[n] = 1; try { localStorage.setItem(FK, JSON.stringify(f)); } catch (e) {} } }
  function K(o) { try { return Object.keys(o || {}); } catch (e) { return []; } }

  function rom() { return J('ph_romance', {}) || {}; }
  function romMax() { var m = 0; K(rom()).forEach(function (c) { m = Math.max(m, (rom()[c].done || []).length); }); return m; }
  function romFull() { var n = 0; K(rom()).forEach(function (c) { n += rom()[c].full || 0; }); return n; }
  function romMembers() { return K(rom()).filter(function (c) { return (rom()[c].done || []).length >= 1; }).length; }
  function wardrobe() { return J('ph_clothesEquip', {}) || {}; }
  function worn() { var out = []; var w = wardrobe(); K(w).forEach(function (c) { ['top', 'bottom', 'dress'].forEach(function (s) { if (w[c] && w[c][s]) out.push(w[c][s]); }); }); return out; }
  function greatCloth() {
    if (worn().some(function (p) { return p && p.great; })) return true;
    try { return bagItems.some(function (i) { return i.type === 'cloth' && (i.isGreat || /^✨/.test(i.name)); }); } catch (e) { return false; }
  }
  function anyCloth() { if (worn().length) return true; try { return bagItems.some(function (i) { return i.type === 'cloth'; }); } catch (e) { return false; } }
  function gear() { return J('ph_fangear', {}) || {}; }
  function gearAny() { var g = gear(); return K(g).some(function (c) { return (g[c] || []).some(function (x) { return !!x; }); }); }
  function gearFull() { var g = gear(); return K(g).some(function (c) { return (g[c] || []).filter(function (x) { return !!x; }).length >= 2; }); }
  function skillAny() {
    var s = J('ph_skillLoadout', null);
    if (Array.isArray(s)) return s.some(function (x) { return !!x; });
    return s && typeof s === 'object' && K(s).some(function (c) { return (s[c] || []).some(function (x) { return !!x; }); });
  }

  function clears(id) { var c = J('ph_xk_clears', {}) || {}; return c[id] || 0; }

  // type:'main' 은 퀘스트 탭의 일반 퀘스트 / aff = 모든 멤버 호감도 경험치 보상
  var NEW = {
    n_rom1: { title: '💓 첫 설렘', desc: '💞 인연 → 멤버 선택 → 💓 설렘 이벤트. 호감도 30이면 첫 이벤트가 열려. 선택지에 따라 두근이 달라져!', condition: 'q3_rom1', rewardCoins: 0, rewardExp: 20, aff: 10, detect: function () { return romMax() >= 1; } },
    n_rom_heart: { title: '💗 두근 3/3', desc: '💓 설렘 이벤트에서 두근 💗💗💗 을 받아봐. 멤버 성격에 맞는 선택지를 골라야 해!', condition: 'q3_romheart', rewardCoins: 0, rewardExp: 30, aff: 15, detect: function () { return romFull() >= 1; } },
    n_rom3: { title: '💓 한 사람의 마음', desc: '한 멤버의 설렘 이벤트 3개를 전부 봐. 호감도 30 · 120 · 550 이 되면 차례로 열려.', condition: 'q3_rom3', rewardCoins: 0, rewardExp: 60, aff: 30, detect: function () { return romMax() >= 3; } },
    n_rom6: { title: '💓 여섯 개의 두근', desc: '6명 모두의 첫 번째 설렘 이벤트를 봐. 멤버마다 대사도 선택지도 달라!', condition: 'q3_rom6', rewardCoins: 0, rewardExp: 80, aff: 20, detect: function () { return romMembers() >= 6; } },
    n_wear: { title: '👗 옷장 열기', desc: '🏠 내 집 → 👗 옷장 (또는 ⋯ 더보기 → 의상실)에서 멤버에게 옷을 입혀봐. 옷은 여기서만 효과가 나!', condition: 'q3_wear', rewardCoins: 1000, rewardExp: 40, detect: function () { return worn().length >= 1; } },
    n_fav: { title: '👗 취향 저격', desc: '멤버가 좋아하는 옷을 입히고 💓 설렘 이벤트를 봐. 반응 대사가 나오고 두근이 +1 돼! (취향은 의상실에서 확인)', condition: 'q3_fav', rewardCoins: 1500, rewardExp: 60, detect: function () { return !!flags().fav; } },
    n_great: { title: '✨ 대성공 옷', desc: '🧵 재봉 작업대에서 옷을 만들어 대성공(3%)을 노려봐. 대성공 옷은 효과가 +1%p 더 커!', condition: 'q3_great', rewardCoins: 2000, rewardExp: 80, detect: function () { return greatCloth(); } },
    n_gear1: { title: '🎀 소품 장착', desc: '팬덤 원정(방송국·팬미팅 등)의 인트로 🎀 소품 장착 → 멤버에게 소품을 끼워 봐. 원정 효과가 올라가!', condition: 'q3_gear1', rewardCoins: 800, rewardExp: 40, detect: function () { return gearAny(); } },
    n_gear2: { title: '🎀 소품 2칸 채우기', desc: '한 멤버의 소품 장착칸 2개를 모두 채워봐. 효과가 겹쳐서 원정이 훨씬 편해져!', condition: 'q3_gear2', rewardCoins: 1500, rewardExp: 60, detect: function () { return gearFull(); } },
    n_skill: { title: '🎯 스킬 장착', desc: '팬덤 원정 인트로 → 스킬 장착. 그 멤버가 배운 스킬만 장착할 수 있어.', condition: 'q3_skill', rewardCoins: 800, rewardExp: 40, detect: function () { return skillAny(); } },
    n_map_rhythm: { title: '🎧 음악방송 리허설장', desc: '🗺️ 맵 → 팬덤 원정 → 🎧 음악방송 리허설장(Lv.25). 패턴을 외워서 따라 치고 퍼펙트 게이지를 채워봐!', condition: 'q3_map_rhythm', rewardCoins: 2000, rewardExp: 100, detect: function () { return clears('rhythm_stage') >= 1; } },
    n_map_papa: { title: '🕵️ 파파라치 탈출', desc: '🗺️ 맵 → 팬덤 원정 → 🕵️ 파파라치 탈출(Lv.30). 파파라치를 피해 멤버를 무사히 탈출시켜!', condition: 'q3_map_papa', rewardCoins: 3000, rewardExp: 150, detect: function () { return clears('paparazzi_run') >= 1; } },
    n_map_world: { title: '🏟️ 월드투어 스타디움', desc: '🗺️ 맵 → 팬덤 원정 → 🏟️ 월드투어 스타디움(Lv.35). 팬서비스로 한 줄씩 성공시켜 스타디움을 달궈봐!', condition: 'q3_map_world', rewardCoins: 4000, rewardExp: 200, detect: function () { return clears('world_tour') >= 1; } },
    n_map_all: { title: '🌏 새 원정 맵 정복', desc: '리허설장 · 파파라치 탈출 · 월드투어 스타디움 3곳을 모두 한 번씩 클리어해봐. 맵마다 상자가 나와!', condition: 'q3_map_all', rewardCoins: 8000, rewardExp: 300, detect: function () { return clears('rhythm_stage') >= 1 && clears('paparazzi_run') >= 1 && clears('world_tour') >= 1; } },
    n_src: { title: '🔎 획득처 확인', desc: '🎒 가방 → 아이템을 눌러 상세 화면에서 획득처를 확인해봐. 어디서 구하는지 한눈에 알려줘.', condition: 'q3_src', rewardCoins: 300, rewardExp: 10, detect: function () { return !!flags().src; } }
  };
  var DETECT = {}, AFF = {};

  function register() {
    if (typeof QUESTS === 'undefined') return false;
    K(NEW).forEach(function (id) {
      var q = NEW[id]; DETECT[id] = q.detect; if (q.aff) AFF[q.condition] = q.aff;
      if (!QUESTS[id]) QUESTS[id] = { title: q.title, desc: q.desc + (q.aff ? ' 🎁 보상: 모든 멤버 호감도 +' + q.aff : ''), condition: q.condition, rewardCoins: q.rewardCoins, rewardExp: q.rewardExp, type: 'main' };
    });
    return true;
  }
  function check() {
    try {
      // 레벨 10 이상인데 '학원 문을 열어라'가 안 눌려 있으면 완료 처리 (레벨업 순간을 놓친 경우 보정)
      if (typeof questProgress !== 'undefined' && QUESTS.main_level && questProgress.main_level !== 'done' && typeof playerLevel !== 'undefined' && playerLevel >= 10 && typeof checkQuestProgress === 'function') { checkQuestProgress('player_level_10'); return; }
      if (typeof questProgress === 'undefined' || typeof checkQuestProgress !== 'function') return;
      var ids = K(DETECT);
      for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        if (questProgress[id] === 'done') continue;
        var ok = false; try { ok = !!DETECT[id](); } catch (e) {}
        if (ok) { checkQuestProgress(NEW[id].condition); return; }
      }
    } catch (e) {}
  }
  // 설렘 퀘스트 완료 시 호감도 지급
  function hookComplete() {
    if (typeof window.completeQuest !== 'function') { setTimeout(hookComplete, 150); return; }
    if (window.completeQuest.__q3) return;
    var orig = window.completeQuest;
    var w = function (id, quest) {
      var was = (typeof questProgress !== 'undefined') && questProgress[id] === 'done';
      var r = orig.apply(this, arguments);
      try {
        var amt = quest && AFF[quest.condition];
        if (amt && !was && typeof CHARS !== 'undefined' && typeof addAffectionExp === 'function') K(CHARS).forEach(function (c) { addAffectionExp(c, amt); });
      } catch (e) {}
      return r;
    };
    w.__q3 = true; window.completeQuest = w;
  }
  function hookSrc() {
    if (typeof window.showBagItemDetail !== 'function') { setTimeout(hookSrc, 200); return; }
    if (window.showBagItemDetail.__q3) return;
    var orig = window.showBagItemDetail;
    var w = function () { setFlag('src'); return orig.apply(this, arguments); };
    w.__q3 = true; window.showBagItemDetail = w;
  }
  (function boot() {
    if (!register()) { setTimeout(boot, 200); return; }
    hookComplete(); hookSrc();
    setInterval(check, 2000);
    var t = 0;
    (function again() { if (typeof window.renderQuestList !== 'function') { if (t++ < 50) setTimeout(again, 100); return; }
      var cur = document.getElementById('screen-quest'); if (cur && cur.classList.contains('active')) { try { window.renderQuestList(); } catch (e) {} } })();
  })();
})();
