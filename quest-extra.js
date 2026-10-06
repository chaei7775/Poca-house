// ════════════════════════════════
// 📜 퀘스트 추가분 (quest-extra.js) — game.js 는 건드리지 않음
// 퀘스트 탭에 튜토리얼/메인 퀘스트를 더 채워 넣는다. 조건은 2초마다 자동 확인.
// (퀘스트 목록엔 설명 앞 50자만 보이니까, 설명은 '뭘 어디서 하는지'부터 씀)
// 등록: loader.js NEW_CONTENT_FILES 맨 끝에 'quest-extra.js' 한 줄 추가
// ════════════════════════════════
(function () {
  var FKEY = 'ph_quest2';
  function loadF() { try { return JSON.parse(localStorage.getItem(FKEY) || '{}') || {}; } catch (e) { return {}; } }
  var F = loadF();
  function flag(n) { if (!F[n]) { F[n] = 1; try { localStorage.setItem(FKEY, JSON.stringify(F)); } catch (e) {} } }
  function J(key, def) {
    try { var v = JSON.parse(localStorage.getItem(key) || 'null'); return (v === null || v === undefined) ? def : v; } catch (e) { return def; }
  }
  function keys(o) { try { return Object.keys(o || {}); } catch (e) { return []; } }

  // ── 진행 상황 읽기 ──
  function debutCount() {
    var d = (J('ph_agency', {}) || {}).done || {};
    return keys(d).filter(function (k) { return d[k]; }).length;
  }
  function posterCount() { var c = J('ph_cf', {}) || {}; return c.posters ? c.posters.length : 0; }
  function fanCount() {
    var idols = (J('ph_fancafe', {}) || {}).idols || {};
    var n = 0;
    keys(idols).forEach(function (k) { n += keys(idols[k] && idols[k].fans).length; });
    return n;
  }
  function hiddenCount() { try { return typeof ownedHiddenCards !== 'undefined' ? ownedHiddenCards.length : 0; } catch (e) { return 0; } }
  function hiddenTotal() { try { return typeof HIDDEN_CARDS !== 'undefined' ? HIDDEN_CARDS.length : 9999; } catch (e) { return 9999; } }
  function maxEnhLevel() {
    var l = (J('ph_enhance', {}) || {}).level || {};
    var m = 0; keys(l).forEach(function (k) { if (l[k] > m) m = l[k]; });
    return m;
  }
  function anyTrans() {
    var s = (J('ph_enhance', {}) || {}).stage || {};
    return keys(s).some(function (k) { return s[k] > 0; });
  }
  function premiumList() {
    var d = J('ph_premiumCards', {}) || {};
    return keys(d).filter(function (k) { return d[k] && d[k].lv >= 1; }).map(function (k) { return d[k].lv; });
  }
  function goodsFlag(n) { return !!(J('ph_goods_flags', {}) || {})[n]; }   // goods-gear.js 가 기록
  function plv() { try { return typeof playerLevel !== 'undefined' ? playerLevel : 1; } catch (e) { return 1; } }

  // ── 퀘스트 정의 ──  detect(): 달성 여부
  var NEW = {
    // ───── 튜토리얼 (초반 길잡이) ─────
    tut_explore: { title:'스케줄 나가기', desc:'🚐 스케줄 가기 → 촬영 세트장·뷰티 살롱·공원에서 재료를 모아보자. 재료는 재조합과 데뷔에 쓰여.',
      condition:'q2_explore', rewardCoins:300, rewardExp:50, type:'tutorial', detect:function () { return !!F.explore; } },
    tut_fishing: { title:'캠프에서 낚시', desc:'🏕️ 워크숍 캠프 → 낚시하기. 물고기가 다가오면 탭해서 낚싯대를 던져봐.',
      condition:'q2_fishing', rewardCoins:300, rewardExp:50, type:'tutorial', detect:function () { return !!F.fishing; } },
    tut_gift: { title:'선물로 마음 얻기', desc:'💞 인연 → 아이돌 선택 → 선물하기. 가방의 선물을 주면 인연 경험치가 올라.',
      condition:'q2_gift', rewardCoins:300, rewardExp:50, type:'tutorial', detect:function () { return !!F.gift; } },
    tut_recombine: { title:'카드 재조합 해보기', desc:'⋯ 더보기 → 🔮 카드 재조합기. 겹치는 카드 2장 + 재료로 더 높은 등급을 노려봐.',
      condition:'q2_recombine', rewardCoins:300, rewardExp:50, type:'tutorial', detect:function () { return !!F.recombine; } },
    tut_drink: { title:'스태미나 채우기', desc:'🎒 가방 → 드링크 → 사용하기. 스태미나가 바닥나면 탐험을 못 해. 상점 잡화점에서 살 수 있어.',
      condition:'q2_drink', rewardCoins:200, rewardExp:30, type:'tutorial', detect:function () { return !!F.drink; } },
    tut_bag: { title:'가방 넓히기', desc:'🎒 가방 → 슬롯 확장. 재료가 쌓이면 가방이 꽉 차니까 미리 넓혀두자.',
      condition:'q2_bag', rewardCoins:200, rewardExp:30, type:'tutorial', detect:function () { return !!F.bag; } },
    tut_room: { title:'내 방 꾸미기', desc:'🛍️ 상점거리 → 방 테마 구매 → 🏠 내 집에서 적용. 방을 바꾸면 기분이 달라져.',
      condition:'q2_room', rewardCoins:500, rewardExp:80, type:'tutorial',
      detect:function () { try { return typeof ownedRooms !== 'undefined' && ownedRooms.length > 0; } catch (e) { return false; } } },
    tut_goods: { title:'굿즈 만들기', desc:'(Lv.15~) 🛍️ 상점거리 → 🎁 굿즈 공방에서 굿즈를 만들어봐. 재료 + 코인으로 만들면 능력치가 랜덤으로 붙어. (실패할 수도 있어!)',
      condition:'q2_goods_craft', rewardCoins:500, rewardExp:80, type:'tutorial', detect:function () { return goodsFlag('crafted'); } },

    // ───── 메인: 데뷔·활동 ─────
    main_hidden: { title:'첫 히든카드', desc:'⋯ 더보기 → 🔮 카드 재조합기에서 히든카드에 도전! 실패가 쌓이면 확률이 올라가.',
      condition:'q2_hidden', rewardCoins:1000, rewardExp:150, type:'main', detect:function () { return hiddenCount() >= 1; } },
    main_debut: { title:'첫 데뷔', desc:'맵 → 광장 → 🎤 기획사. 촬영 세트장·뷰티 살롱·공원 재료와 코인으로 아이돌을 데뷔시켜!',
      condition:'q2_debut', rewardCoins:1500, rewardExp:200, type:'main', detect:function () { return debutCount() >= 1; } },
    main_cf: { title:'CF 촬영', desc:'(Lv.10~) 맵 → 광장 → 🎬 CF 촬영. 매일 새 의뢰가 올라와. 포스터가 쌓이면 팬들이 반응해.',
      condition:'q2_cf', rewardCoins:1000, rewardExp:150, type:'main', detect:function () { return posterCount() >= 1; } },
    main_fancafe: { title:'팬카페 오픈', desc:'(Lv.12~) 맵 → 🏘️ 연습생 숙소촌 → ☕ 팬카페. 처음엔 회원이 나 혼자뿐이야. 활동하면 팬이 들어와.',
      condition:'q2_fancafe', rewardCoins:1000, rewardExp:150, type:'main',
      detect:function () { return keys((J('ph_fancafe', {}) || {}).idols).length > 0; } },
    main_fan5: { title:'팬 다섯 명', desc:'(Lv.12~) ☕ 팬카페에 팬 5명 모으기. CF를 찍고 팬카페를 자주 들여다보면 늘어나.',
      condition:'q2_fan5', rewardCoins:2000, rewardExp:250, type:'main', detect:function () { return fanCount() >= 5; } },
    main_expedition: { title:'팬덤 원정 출발', desc:'🚐 스케줄 가기 → 🎬 팬덤 원정 → 방송국 앞. 프리미엄 조각과 강화석이 나와.',
      condition:'q2_expedition', rewardCoins:1000, rewardExp:150, type:'main', detect:function () { return !!F.expedition; } },
    main_crystal: { title:'소원의 결정', desc:'🧩 소원의 조각 100개를 모으면 💎 소원의 결정! 신비의 섬 소원의 샘이 제일 빨라.',
      condition:'q2_crystal', rewardCoins:2000, rewardExp:300, type:'main', detect:function () { return !!F.crystal; } },
    main_goods_equip: { title:'굿즈 장착', desc:'(Lv.15~) 🎁 굿즈 공방 → 🎒 장착 탭. 캐릭터 카드 옆 네모 칸을 눌러 굿즈를 달아줘. 그 캐릭터 팬덤 원정이 강해져!',
      condition:'q2_goods_equip', rewardCoins:1000, rewardExp:150, type:'main', detect:function () { return goodsFlag('equipped'); } },
    main_goods_full: { title:'풀세팅', desc:'(Lv.15~) 🎁 한 캐릭터의 머리·손·액세서리 3칸을 굿즈로 전부 채우기!',
      condition:'q2_goods_full', rewardCoins:2000, rewardExp:300, type:'main', detect:function () { return goodsFlag('full'); } },
    main_goods_rare: { title:'레어 굿즈 획득', desc:'(Lv.15~) 🎁 굿즈 공방에서 제작하면 낮은 확률(약 4%)로 ✨ 레어 굿즈가 나와. 능력치가 2개 붙어!',
      condition:'q2_goods_rare', rewardCoins:3000, rewardExp:500, type:'main', detect:function () { return goodsFlag('rare'); } },

    // ───── 메인: 강화 ─────
    main_enh1: { title:'첫 강화', desc:'⋯ 더보기 → 🎤 트레이닝룸. 히든카드 + 강화석 + 코인으로 강화해봐. 수익이 올라가.',
      condition:'q2_enh1', rewardCoins:2000, rewardExp:250, type:'main', detect:function () { return maxEnhLevel() >= 1 || !!F.enh1; } },
    main_enh5: { title:'5강 달성', desc:'트레이닝룸에서 히든카드를 5강까지! 그 위로는 실패하면 카드가 사라질 수 있으니 조심.',
      condition:'q2_enh5', rewardCoins:3000, rewardExp:400, type:'main', detect:function () { return maxEnhLevel() >= 5 || !!F.enh5; } },
    main_enh10: { title:'10강 달성', desc:'트레이닝룸에서 히든카드 10강! 데뷔 수익이 체감될 만큼 확 올라가.',
      condition:'q2_enh10', rewardCoins:6000, rewardExp:800, type:'main', detect:function () { return maxEnhLevel() >= 10 || !!F.enh10; } },
    main_trans: { title:'첫 초월', desc:'10강 히든카드를 초월! 같은 멤버 여분 카드 + 초월석이 필요해. 최종 단계는 3단계.',
      condition:'q2_trans', rewardCoins:8000, rewardExp:1000, type:'main', detect:function () { return anyTrans() || !!F.trans; } },

    // ───── 드라마 촬영 ─────
    tut_drama: { title:'드라마 촬영 첫 촬영', desc:'(Lv.8~) 맵 → 광장 → 🎥 드라마 촬영. 데뷔한 아이돌 카드로 대본을 골라 촬영해봐. 연기 스킬이 드랍돼!',
      condition:'q2_drama', rewardCoins:500, rewardExp:80, type:'tutorial', detect:function () { return (J('ph_drama', {}) || {}).shoots > 0; } },
    main_drama_ok: { title:'퍼펙트 OK 컷', desc:'(Lv.8~) 🎥 드라마 촬영에서 감독 OK(조기 퍼펙트)를 받아봐. 스킬을 장착하고 타이밍을 노려!',
      condition:'q2_drama_ok', rewardCoins:3000, rewardExp:400, type:'main', detect:function () { return (J('ph_drama', {}) || {}).oks > 0; } },
    main_drama_10: { title:'드라마 촬영 10회', desc:'(Lv.8~) 🎥 드라마 촬영을 10번 해보자. 시청률이 쌓이면 탑스타가 될 수 있어.',
      condition:'q2_drama_10', rewardCoins:3000, rewardExp:400, type:'main', detect:function () { return (J('ph_drama', {}) || {}).shoots >= 10; } },

    // ───── 메인: 프리미엄·수집 ─────
    main_premium: { title:'첫 프리미엄 카드', desc:'팬덤 원정에서 🖼️ 프리미엄 조각 100개 → 더보기 → 💎 프리미엄 카드에서 교환!',
      condition:'q2_premium', rewardCoins:3000, rewardExp:500, type:'main', detect:function () { return premiumList().length >= 1; } },
    main_premium_up: { title:'프리미엄 카드 강화', desc:'💎 프리미엄 카드를 강화석으로 2레벨 이상! 원정 조각 획득량이 늘어나.',
      condition:'q2_premium_up', rewardCoins:3000, rewardExp:500, type:'main',
      detect:function () { return premiumList().some(function (l) { return l >= 2; }); } },
    main_premium_all: { title:'프리미엄 카드 컬렉터', desc:'💎 프리미엄 카드 6종 전부 모으기. 모을수록 원정이 쉬워져.',
      condition:'q2_premium_all', rewardCoins:10000, rewardExp:1500, type:'main', detect:function () { return premiumList().length >= 6; } },
    main_debut_all: { title:'전원 데뷔', desc:'🎤 기획사에서 멤버 6명 모두 데뷔! 멤버가 늘수록 정산 수익도 늘어.',
      condition:'q2_debut_all', rewardCoins:8000, rewardExp:1200, type:'main', detect:function () { return debutCount() >= 6; } },
    main_hidden_all: { title:'히든카드 완전 정복', desc:'🌟 히든카드를 전부 모으기. 재조합기에서 계속 도전!',
      condition:'q2_hidden_all', rewardCoins:10000, rewardExp:1500, type:'main',
      detect:function () { return hiddenCount() >= hiddenTotal() && hiddenTotal() > 0; } },

    // ───── 메인: 포카하우스 레벨 ─────
    main_lv20: { title:'레벨 20', desc:'⭐ 포카하우스 레벨 20 달성! 알바·탐험·원정을 꾸준히 하면 올라가.',
      condition:'q2_lv20', rewardCoins:3000, rewardExp:0, type:'main', detect:function () { return plv() >= 20; } },
    main_lv30: { title:'레벨 30', desc:'⭐ 포카하우스 레벨 30 달성! 슬슬 중반을 넘겼어.',
      condition:'q2_lv30', rewardCoins:5000, rewardExp:0, type:'main', detect:function () { return plv() >= 30; } },
    main_lv50: { title:'레벨 50', desc:'⭐ 포카하우스 레벨 50 달성! 진짜 베테랑이야.',
      condition:'q2_lv50', rewardCoins:10000, rewardExp:0, type:'main', detect:function () { return plv() >= 50; } },
  };

  // ── 퀘스트 탭에 등록 (QUESTS 는 game.js 의 const 객체 — 안에 항목만 추가) ──
  var DETECT = {};
  function register() {
    if (typeof QUESTS === 'undefined') return false;
    Object.keys(NEW).forEach(function (id) {
      var q = NEW[id];
      DETECT[id] = q.detect;
      if (!QUESTS[id]) {
        QUESTS[id] = { title: q.title, desc: q.desc, condition: q.condition, rewardCoins: q.rewardCoins, rewardExp: q.rewardExp, type: q.type };
      }
    });
    return true;
  }

  // ── 한 번에 하나씩 확인 (한꺼번에 완료 팝업이 쌓이지 않게) ──
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
  // 강화 단계는 카드가 깨져도 '달성 기록'은 남기기
  function recordMilestones() {
    var m = maxEnhLevel();
    if (m >= 1) flag('enh1'); if (m >= 5) flag('enh5'); if (m >= 10) flag('enh10');
    if (anyTrans()) flag('trans');
  }

  // ── 첫 사용 감지 후킹 (원래 함수는 그대로 실행) ──
  function hookLater(name, mark) {
    (function tryHook() {
      if (typeof window[name] !== 'function') { setTimeout(tryHook, 100); return; }
      var orig = window[name];
      if (orig.__q2Hooked) return;
      var wrapped = function () {
        var r = orig.apply(this, arguments);
        try { mark.apply(null, arguments); } catch (e) {}
        return r;
      };
      wrapped.__q2Hooked = true;
      window[name] = wrapped;
    })();
  }
  hookLater('startExplore', function () { flag('explore'); });
  hookLater('startFishing', function () { flag('fishing'); flag('explore'); });
  hookLater('giveGift', function () { flag('gift'); });
  hookLater('doRecombine', function () { flag('recombine'); });
  hookLater('useDrinkFromBag', function () { flag('drink'); });
  hookLater('expandBag', function () { flag('bag'); });
  hookLater('startSpecialExplore', function () { flag('expedition'); });
  hookLater('showWishCrystalEarned', function () { flag('crystal'); });

  (function boot() {
    if (!register()) { setTimeout(boot, 200); return; }
    setInterval(function () { recordMilestones(); check(); }, 2500);
    // 퀘스트 탭을 열 때 목록이 새 항목을 바로 보여주도록 한 번 더 그림
    var tries = 0;
    (function hookList() {
      if (typeof window.renderQuestList !== 'function') { if (tries++ < 50) setTimeout(hookList, 100); return; }
      var cur = document.getElementById('screen-quest');
      if (cur && cur.classList.contains('active')) { try { window.renderQuestList(); } catch (e) {} }
    })();
  })();
})();
