// ════════════════════════════════
// 🔹💠 재조합석 / 에픽 재조합석 획득 알림 (stone-toast.js)
// 굿즈 공방의 "🔶 공방의 원석 획득!" 알림(goods-gear.js)과 같은 방식:
//  · 지도마다 파일이 달라서 addToBag 를 잡지 않고, 가방(bagItems) 수량을 지켜본다.
//  · 스태미나를 쓴 직후(탐험·낚시 시작) WINDOW_MS 안에 재조합석/에픽 재조합석이 늘면 "획득!" 알림을 띄움.
//    (탐험 밖에서 늘어난 경우 — 구매·쿠폰·클라우드 불러오기 등 — 는 알림 없음)
// 되돌리려면 loader.js 에서 이 파일 줄만 지우면 됨.
// ════════════════════════════════
(function () {
  'use strict';
  if (window.__stoneToast) return; window.__stoneToast = true;
  var WINDOW_MS = 180000;      // 스태미나 사용 후 이 시간 안에 늘어난 것만 탐험 보상으로 봄
  var POLL_MS = 250;
  var SHOW_MS = 2600;
  var STONES = [
    { name: '재조합석', emoji: '🔹' },
    { name: '에픽 재조합석', emoji: '💠' }
  ];

  function qtyOf(name) {
    var n = 0;
    try { bagItems.forEach(function (i) { if (i && i.name === name) n += Number(i.qty) || 0; }); } catch (e) {}
    return n;
  }

  function toast(msg) {
    var old = document.getElementById('st-toast'); if (old) old.remove();
    var el = document.createElement('div');
    el.id = 'st-toast';
    var top = document.getElementById('gg-toast') ? '112px' : '62px';   // 공방의 원석 알림과 겹치면 아래로 비킴
    el.style.cssText = 'position:fixed;left:50%;top:' + top + ';transform:translateX(-50%);z-index:1300;background:rgba(20,20,40,.96);border:1.5px solid #FFD700;border-radius:14px;padding:9px 16px;color:#fff;font-size:13px;font-weight:900;max-width:86%;text-align:center;font-family:\'Noto Sans KR\',sans-serif;pointer-events:none;';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.remove(); }, SHOW_MS);
  }

  function start() {
    if (typeof bagItems === 'undefined' || typeof stamina === 'undefined') { setTimeout(start, 500); return; }
    var prev = {}, lastStam = stamina, lastUse = 0;
    STONES.forEach(function (s) { prev[s.name] = qtyOf(s.name); });
    setInterval(function () {
      try {
        var now = Date.now();
        if (stamina < lastStam) lastUse = now;
        lastStam = stamina;
        STONES.forEach(function (s) {
          var cur = qtyOf(s.name), d = cur - prev[s.name];
          prev[s.name] = cur;
          if (d > 0 && now - lastUse <= WINDOW_MS) toast(s.emoji + ' ' + s.name + (d > 1 ? ' x' + d : '') + ' 획득!');
        });
      } catch (e) {}
    }, POLL_MS);
  }
  start();

  window.__stoneToastTest = { qtyOf: qtyOf, toast: toast };
})();
