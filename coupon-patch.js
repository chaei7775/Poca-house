// ════════════════════════════════
// 🎟️ 추가 쿠폰 (coupon-patch.js)
// game.js의 useCoupon()을 감싸서, 새 쿠폰만 여기서 처리하고 나머지는 기존 쿠폰 코드로 넘긴다.
// 새 쿠폰을 더 만들고 싶으면 아래 EXTRA_COUPONS에 한 덩어리만 추가하면 됨.
//   gold    : 코인
//   crystal : 소원의 결정 개수
//   items   : 가방에 넣을 아이템 목록 [{ emoji, name, type, qty, desc }]  (가방 자리가 부족하면 쿠폰이 소모되지 않음)
// (game.js / index.html은 건드리지 않음)
// ════════════════════════════════
(function () {
  'use strict';

  var EXTRA_COUPONS = {
    // 쿠폰코드는 대문자로 적기
    'SORRY1003': {
      gold: 5000000,
      crystal: 2,
      message: '🎁 데이터 소실 보상 쿠폰!\n\n💰 코인 5,000,000\n💎 소원의 결정 2개\n\n불편을 드려 죄송해요 🙏'
    },
    'RECOMBO100': {
      items: [
        { emoji: '🔹', name: '재조합석', type: 'material', qty: 100, desc: '카드 재조합에 필요한 재료' }
      ],
      message: '🎁 재조합석 쿠폰!\n\n🔹 재조합석 100개'
    },
    'EPIC100': {
      items: [
        { emoji: '💠', name: '에픽 재조합석', type: 'material', qty: 100, desc: 'SSR/UR 카드 재조합에 필요한 재료' }
      ],
      message: '🎁 에픽 재조합석 쿠폰!\n\n💠 에픽 재조합석 100개'
    },
    'WELCOME': {
      gold: 300000,
      items: [
        { emoji: '🔹', name: '재조합석', type: 'material', qty: 100, desc: '카드 재조합에 필요한 재료' }
      ],
      message: '🎁 신규 유저 환영 쿠폰!\n\n🔹 재조합석 100개\n💰 코인 300,000\n\n포카하우스에 온 걸 환영해요 💖'
    }
  };

  // 쿠폰 아이템이 가방에 다 들어갈 자리가 있는지 (이미 같은 아이템이 있으면 자리를 더 안 씀)
  function hasRoom(def) {
    if (!def.items || !def.items.length) return true;
    try {
      var free = bagSlots - bagItems.length, need = 0;
      def.items.forEach(function (it) {
        if (!bagItems.some(function (b) { return b.name === it.name; })) need++;
      });
      return need <= free;
    } catch (e) { return false; }
  }

  function giveReward(def) {
    if (def.gold) coins += def.gold;
    if (def.crystal) addToBag('💎', '소원의 결정', 'crystal', def.crystal, '소원의 결정 — 특별한 소원을 이룰 수 있어!');
    if (def.items) def.items.forEach(function (it) { addToBag(it.emoji, it.name, it.type, it.qty, it.desc); });
    if (typeof saveBag === 'function') saveBag();
    if (typeof saveAll === 'function') saveAll();
    if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay();
    if (typeof renderBag === 'function') renderBag();
  }

  function install() {
    if (typeof window.useCoupon !== 'function' || window.useCoupon.__extra) return false;
    var original = window.useCoupon;

    var wrapped = function () {
      var raw = window.prompt('쿠폰 코드를 입력하세요');
      if (!raw) return;
      var code = raw.trim().toUpperCase();
      var def = EXTRA_COUPONS[code];

      if (!def) {
        // 새 쿠폰이 아니면 기존 쿠폰 처리로 그대로 넘김 (입력창을 또 띄우지 않도록 같은 코드를 돌려줌)
        var realPrompt = window.prompt;
        window.prompt = function () { window.prompt = realPrompt; return raw; };
        try { original(); } finally { window.prompt = realPrompt; }
        return;
      }

      if (usedCoupons.includes(code)) { alert('이미 사용한 쿠폰입니다!'); return; }
      if (!hasRoom(def)) { alert('🎒 가방 자리가 부족해요!\n자리를 비우고 다시 입력해주세요.\n(쿠폰은 아직 사용되지 않았어요)'); return; }
      giveReward(def);
      usedCoupons.push(code);
      localStorage.setItem('ph_usedCoupons', JSON.stringify(usedCoupons));
      alert(def.message);
    };
    wrapped.__extra = true;
    window.useCoupon = wrapped;
    return true;
  }

  // game.js가 먼저 로드된 뒤에 감싸기 (로더가 늦게 붙으므로 안전하게 몇 번 시도)
  var tries = 0;
  var timer = setInterval(function () {
    if (install() || ++tries > 40) clearInterval(timer);
  }, 250);
})();
