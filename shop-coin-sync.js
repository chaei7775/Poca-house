// shop-coin-sync.js
// 상점 위 '🍔 보유: N코인' 숫자가 재료를 팔거나 살 때 바로 안 바뀌는 문제 보정
// - 재료 판매 직후 숫자를 강제로 갱신
// - 상점이 열려 있는 동안 코인이 바뀌면 0.4초 안에 숫자를 맞춤 (어떤 경로로 코인이 바뀌어도 동일)
(function applyShopCoinSync() {
  if (typeof window.sellMaterial !== 'function') { setTimeout(applyShopCoinSync, 100); return; }
  if (window.__shopCoinSyncApplied) return;
  window.__shopCoinSyncApplied = true;

  function syncShopCoin() {
    try {
      var el = document.getElementById('shop-coin-display');
      if (el && typeof coins !== 'undefined' && el.textContent !== String(coins)) el.textContent = coins;
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

  // 코인이 바뀌었는데 숫자가 그대로면 0.4초 안에 맞춤 (가벼운 비교만 함)
  setInterval(syncShopCoin, 400);
})();
