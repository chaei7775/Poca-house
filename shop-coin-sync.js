// shop-coin-sync.js
// 코인 숫자가 바로 안 바뀌는 문제 보정
// - 상점 위 '🍔 보유: N코인' 숫자 (재료를 팔거나 살 때)
// - 포카마을(지도) 화면 맨 위 오른쪽 🍔 코인 숫자 (탐험 갔다 와서 잡화점에서 팔 때 안 바뀌던 것)
// - 알바/퀘스트 화면 위쪽 코인 숫자
// 코인이 바뀌면 0.4초 안에 모든 숫자를 맞춘다 (어떤 경로로 코인이 바뀌어도 동일)
(function applyShopCoinSync() {
  if (typeof window.sellMaterial !== 'function') { setTimeout(applyShopCoinSync, 100); return; }
  if (window.__shopCoinSyncApplied) return;
  window.__shopCoinSyncApplied = true;

  // game.js의 updateCoinsDisplay가 챙기지 않는 숫자 칸들
  var EXTRA_IDS = ['shop-coin-display', 'coin-map', 'coin-quest', 'coin-alba-burger', 'coin-alba-cafe'];

  function syncShopCoin() {
    try {
      if (typeof coins === 'undefined') return;
      var want = String(coins);
      for (var i = 0; i < EXTRA_IDS.length; i++) {
        var el = document.getElementById(EXTRA_IDS[i]);
        if (el && el.textContent !== want) el.textContent = want;
      }
      if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay();
    } catch (e) {}
  }

  // 판매 직후 즉시 갱신
  var origSell = window.sellMaterial;
  window.sellMaterial = function () {
    var r = origSell.apply(this, arguments);
    syncShopCoin();
    return r;
  };

  setInterval(syncShopCoin, 400);
  syncShopCoin();
})();
