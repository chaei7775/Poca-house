// ════════════════════════════════
// ⚖️ 스태미나 밸런스 패치 (stamina-balance.js)
//
// 1) 에너지 드링크 전 종류 회복량 ×3 (가격은 그대로)
//      사과주스 10→30 / 딸기스무디 20→60 / 에너지드링크 30→90
//      + 거기에 전부 DRINK_BONUS(+70) 추가 → 사과주스 100 / 딸기스무디 130 / 에너지드링크 160
// 2) 일반 맵(숲·해변·공원·호수·광장) 탐험의 소원의 조각 드랍률 ÷3
//      (원래 아이템 1개당 0.5% → 약 0.17%)
//
// game.js는 건드리지 않고, 로더에 이 파일만 game.js / mystery-explore.js 뒤에 등록하면 된다.
// 신비의 섬 소원의 샘 확률은 mystery-explore.js 안의 SPRING_COST 값으로 조절한다.
// ════════════════════════════════
(function () {
  'use strict';

  var DRINK_MULT = 3;   // 드링크 회복량 배수
  var DRINK_BONUS = 70; // ×배수 한 다음 전 종류에 더하는 회복량 (스태미나 최대치 3000 기준)
  var WISH_DIV = 3;     // 일반 맵 소원의 조각 드랍률을 나누는 값

  var DRINK_BASE = { '사과주스': 10, '딸기스무디': 20, '에너지드링크': 30 };
  function drinkUp(name) { return (DRINK_BASE[name] || 10) * DRINK_MULT + DRINK_BONUS; }
  window.__drinkUp = drinkUp;   // drink-bulk.js 가 같은 값을 쓰도록

  // 가방에 이미 있는 드링크 설명 글씨를 바뀐 회복량으로 맞춤 (여러 번 실행해도 값이 안 변함)
  function fixDrinkDescs() {
    var changed = false;
    bagItems.forEach(function (it) {
      if (it.type !== 'drink' || !(it.name in DRINK_BASE)) return;
      var d = '스태미나 +' + drinkUp(it.name) + ' 회복 음료';
      if (it.desc !== d) { it.desc = d; changed = true; }
    });
    if (changed) saveBag();
  }

  // 일반 맵 탐험이 시작된 직후, 소원의 조각 칸 중 2/3를 일반 재료로 되돌림 → 드랍률 ÷3
  function thinWish(placeId) {
    if (placeId === 'mystery') return;                         // 신비의 섬은 mystery-explore.js가 담당
    if (!document.getElementById('explore-overlay')) return;   // 스태미나 부족 등으로 탐험이 안 열렸으면 무시
    var mats = EXPLORE_MATERIALS[placeId];
    if (!mats) return;
    var luck = typeof getEquippedStat === 'function' ? getEquippedStat('luck') : 0;
    var rareChance = Math.min(0.80, 0.30 + luck / 100);
    exploreItems.forEach(function (item, idx) {
      if (!item || !item.isWish) return;
      if (Math.random() < 1 / WISH_DIV) return;                // 1/3은 그대로 소원의 조각
      var isRare = Math.random() < rareChance;
      var pool = isRare ? mats.rare : mats.normal;
      item.name = pool[Math.floor(Math.random() * pool.length)];
      item.isWish = false;
      item.isRare = isRare;
      var el = document.getElementById('explore-item-' + idx);
      if (el) el.textContent = '✨';
    });
  }

  function ready() {
    try {
      return typeof window.useDrinkFromBag === 'function' &&
        typeof window.buyDrink === 'function' &&
        typeof window.showBagItemDetail === 'function' &&
        typeof window.startExplore === 'function' &&
        typeof bagItems !== 'undefined' &&
        typeof exploreItems !== 'undefined' &&
        typeof EXPLORE_MATERIALS !== 'undefined';
    } catch (e) { return false; }
  }

  function init() {
    if (!ready()) { setTimeout(init, 50); return; }
    if (window.__staminaBalancePatched) return;   // 두 번 로드돼도 배수가 겹치지 않게
    window.__staminaBalancePatched = true;

    // ── 1) 드링크 사용: 회복량 ×3 ──
    window.useDrinkFromBag = function (idx) {
      var item = bagItems[idx];
      if (!item) return;
      var up = drinkUp(item.name);
      useFromBag(item.name, 1);
      stamina = Math.min(STAMINA_MAX, stamina + up);
      saveStamina();
      saveAll();
      renderBag();
      showBagToast(item.emoji + ' ' + item.name + ' 사용! ⚡ 스태미나 +' + up);
    };

    // 드링크 구매 시 가방 설명 글씨도 ×3 값으로
    var origBuy = window.buyDrink;
    window.buyDrink = function (itemName, price, staminaUp) {
      var r = origBuy.call(this, itemName, price, (staminaUp || 0) * DRINK_MULT);
      fixDrinkDescs();
      return r;
    };

    // 아이템 상세를 열 때마다 설명 글씨 보정 (출석 보상 등으로 들어온 옛 설명 포함)
    var origDetail = window.showBagItemDetail;
    window.showBagItemDetail = function () {
      fixDrinkDescs();
      return origDetail.apply(this, arguments);
    };

    fixDrinkDescs();

    // ── 2) 일반 맵 소원의 조각 ÷3 ──
    var origExplore = window.startExplore;
    window.startExplore = function (placeId) {
      var r = origExplore.apply(this, arguments);
      try { thinWish(placeId); } catch (e) {}
      return r;
    };
  }

  init();
})();
