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
  var EXTRA_IDS = ['shop-coin-display', 'coin-map', 'coin-quest', 'coin-alba-burger', 'coin-alba-cafe',
                   'coin-display', 'coin-alba', 'coin-gacha', 'coin-gacha2', 'coin-bag', 'coin-alba-flower'];

  // 💰 코인이 1억 이상이면 숫자가 칸 밖으로 튀어나가서, 줄여서 보여줌 (예: 147,044,625 → 1.47억 / 12억 3,000만 → 12.3억 / 1조 이상은 조)
  //    1억 미만은 예전처럼 그대로. 실제 코인 값은 그대로이고 화면 글씨만 줄임
  function fmt(n) {
    n = Math.floor(Number(n) || 0);
    if (n < 100000000) return String(n);
    var v, u;
    if (n >= 1000000000000) { v = n / 1000000000000; u = '조'; } else { v = n / 100000000; u = '억'; }
    var t = (Math.floor(v * 100) / 100).toFixed(2).replace(/\.?0+$/, '');
    return t + u;
  }
  window.__coinFmt = fmt;

  function syncShopCoin() {
    try {
      if (typeof coins === 'undefined') return;
      var want = fmt(coins);
      for (var i = 0; i < EXTRA_IDS.length; i++) {
        var el = document.getElementById(EXTRA_IDS[i]);
        if (el && el.textContent !== want) el.textContent = want;
      }
    } catch (e) {}
  }

  // 판매 직후 즉시 갱신
  var origSell = window.sellMaterial;
  window.sellMaterial = function () {
    var r = origSell.apply(this, arguments);
    syncShopCoin();
    return r;
  };

  // game.js 의 updateCoinsDisplay 도 같은 표시를 쓰게 감싼다 (원래 함수가 숫자를 쓴 직후 줄여서 다시 쓴다)
  var origUpd = window.updateCoinsDisplay;
  if (typeof origUpd === 'function' && !origUpd.__fit) {
    var w = function () { var r = origUpd.apply(this, arguments); syncShopCoin(); return r; };
    w.__fit = true; window.updateCoinsDisplay = w;
  }

  setInterval(syncShopCoin, 400);
  syncShopCoin();
})();
