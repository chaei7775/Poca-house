// 🥤 가방에서 드링크 여러 개 한번에 사용 (1개 / 5개 / 10개 / 가득 채우기)
(function () {
  'use strict';
  // stamina-balance.js 의 회복량(기본 ×3)과 똑같이 맞춤
  var MULT = 3;
  var UP = { '사과주스': 10 * MULT, '딸기스무디': 20 * MULT, '에너지드링크': 30 * MULT };
  function useDrinks(name, n) {
    var item = bagItems.find(function (i) { return i.name === name; });
    if (!item) return;
    var up = UP[name] || 10 * MULT;
    var room = STAMINA_MAX - stamina;
    if (room <= 0) { showBagToast('⚡ 스태미나가 이미 가득 찼어요!'); return; }
    var need = Math.ceil(room / up);               // 가득 채우는 데 필요한 개수
    var cnt = Math.max(1, Math.min(n === 'max' ? need : n, item.qty, need));
    var emoji = item.emoji;
    useFromBag(name, cnt);
    stamina = Math.min(STAMINA_MAX, stamina + up * cnt);
    saveStamina(); saveAll(); renderBag();
    showBagToast(emoji + ' ' + name + ' ' + cnt + '개 사용! ⚡ 스태미나 +' + (up * cnt));
  }
  window.__useDrinks = function (name, n) {
    useDrinks(name, n);
    var o = document.getElementById('bag-detail-overlay'); if (o) o.remove();
  };
  function install() {
    if (typeof showBagItemDetail !== 'function' || !window.__staminaBalancePatched) return false;
    if (window.__drinkBulk) return true;
    window.__drinkBulk = true;
    var orig = showBagItemDetail;
    window.showBagItemDetail = function (idx) {
      orig.apply(this, arguments);
      try {
        var item = bagItems[idx];
        var ov = document.getElementById('bag-detail-overlay');
        if (!item || item.type !== 'drink' || !ov) return;
        var btn = Array.prototype.find.call(ov.querySelectorAll('button'), function (b) { return b.textContent.indexOf('사용하기') >= 0; });
        if (!btn) return;
        var nm = JSON.stringify(item.name).replace(/"/g, '&quot;');
        var st = 'flex:1;padding:11px 0;border:none;border-radius:10px;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;background:linear-gradient(135deg,#60a5fa,#C084FC);';
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;';
        row.innerHTML = [[1, '1개'], [5, '5개'], [10, '10개'], ['max', '가득']].map(function (a) {
          var v = a[0] === 'max' ? "'max'" : a[0];
          return '<button onclick="__useDrinks(' + nm + ',' + v + ')" style="' + st + '">' + a[1] + '</button>';
        }).join('');
        btn.parentNode.replaceChild(row, btn);
      } catch (e) { /* 실패하면 기존 버튼 그대로 */ }
    };
    return true;
  }
  var n = 0;
  (function t() { if (!install() && n++ < 300) setTimeout(t, 200); })();
})();
