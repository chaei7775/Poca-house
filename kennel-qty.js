// ════════════════════════════════
// 🛒 분양소 먹이 수량 구매 (kennel-qty.js)
// 분양소 안 "먹이 가게"에서 먹이 버튼을 누르면, 잡화점처럼 수량 선택 창(슬라이더 / ± / 직접 입력 / 최대)이 떠서
// 한 번에 여러 개를 살 수 있게 한다. (kennel.js / qty-picker.js / game.js는 건드리지 않음)
//
// - 수량 선택 창은 qty-picker.js의 것을 그대로 쓴다 (그래서 qty-picker.js가 로더에 먼저 있어야 함).
// - 한 번에 살 수 있는 최대 개수는 qty-picker.js의 QP_MAX(100개)를 따른다.
// - 가격은 kennel.js의 먹이 가격(window.__kennel.FOODS)을 그대로 읽는다. 가격을 바꾸려면 kennel.js에서 바꾸면 됨.
// ════════════════════════════════
(function () {
  'use strict';
  if (window.__kennelQtyLoaded) return;
  window.__kennelQtyLoaded = true;

  var tries = 0;
  function ready() {
    return typeof qpOpen === 'function' && typeof addToBag === 'function' && typeof saveAll === 'function' &&
      window.__kennel && window.__kennel.FOODS && document.getElementById('kn-shop') && document.getElementById('kn-b-shop');
  }

  function toast(m) {
    try {
      if (typeof qpToast === 'function') qpToast(m);
      else if (typeof showBagToast === 'function') showBagToast(m);
    } catch (e) {}
  }

  function buy(f, n) {
    var total = f.price * n;
    if (coins < total) { toast('코인이 부족해요!'); return; }
    if (typeof qpCanFit === 'function' && !qpCanFit(f.name)) { toast('가방이 꽉 찼어요! 🎒 슬롯을 확장해주세요'); return; }
    var ok = false;
    try { ok = addToBag(f.emoji, f.name, 'material', n, '분양소 먹이 · ' + f.desc, 1); } catch (e) {}
    if (!ok) return;
    coins -= total;
    try { saveAll(); } catch (e) {}
    try { if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay(); } catch (e) {}
    try { if (typeof spawnCoinFloat === 'function') spawnCoinFloat(-total); } catch (e) {}
    // 가게 화면을 다시 그려서 코인/보유 수량 갱신 (kennel.js의 '먹이 가게' 버튼과 같은 동작)
    var shopBtn = document.getElementById('kn-b-shop');
    if (shopBtn) shopBtn.click();
    toast(f.name + ' ' + n + '개 구매 완료!');
  }

  function attach() {
    if (!ready()) {
      if (++tries > 200) return;            // 약 20초 기다려도 안 붙으면 포기 (원래 1개씩 사기는 그대로 동작)
      setTimeout(attach, 100);
      return;
    }
    if (window.__kennelQtyApplied) return;
    window.__kennelQtyApplied = true;

    // 가게 영역에서 먹이 구매 버튼 클릭을 먼저(capture) 가로채서 수량 선택 창으로 바꾼다.
    document.getElementById('kn-shop').addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-buy]') : null;
      if (!b) return;
      e.stopImmediatePropagation();         // kennel.js의 "1개 바로 구매"는 실행되지 않게 막음
      e.preventDefault();
      if (b.disabled) return;
      var f = window.__kennel.FOODS.find(function (x) { return x.name === b.getAttribute('data-buy'); });
      if (!f) return;
      qpOpen({
        mode: 'buy', emoji: f.emoji, name: f.name, unit: f.price,
        max: Math.floor(coins / f.price),
        onConfirm: function (n) { buy(f, n); }
      });
    }, true);
  }
  attach();

  window.__kennelQty = { attach: attach };
})();
