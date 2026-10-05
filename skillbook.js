// ════════════════════════════════
// 📘 스킬북 (skillbook.js)
//  · 드라마 촬영 스킬의 숙련도를 올려주는 아이템. 1권 = 숙련 경험치 +5 (사용은 🎥 드라마 촬영 > 준비 화면 > 스킬 세팅 안의 📘 스킬북 칸)
//  · 일반 탐험(숲·해변·공원·광장·신비의 섬 …)에서 재료를 주울 때 가끔 같이 나온다.
//  · 팬덤 원정 쪽 드랍은 broadcast-expedition.js 안에 들어있다 (같은 이름/설정).
//  · 등록: loader.js NEW_CONTENT_FILES 맨 끝에 'skillbook.js' 한 줄 추가
// ════════════════════════════════
(function () {
  'use strict';

  // ── 설정 ──
  var BOOK_NAME = '스킬북', BOOK_EMOJI = '📘';
  var BOOK_DESC = '드라마 촬영 스킬 숙련도 +5 · 🎥 드라마 촬영 > 준비 화면 > 스킬 세팅에서 사용해요';
  var BOOK_DROP = { normal: 0.02, rare: 0.06 };   // 탐험에서 재료 1개 주울 때 같이 나올 확률 (희귀 재료는 더 높음)
  var EXPLORE_WINDOW_MS = 45000;                   // 스태미나를 쓴 직후 이 시간 안에 늘어난 재료만 "탐험 중 주운 것"으로 침

  function toast(msg) {
    var old = document.getElementById('sb-toast'); if (old) old.remove();
    var el = document.createElement('div');
    el.id = 'sb-toast';
    el.style.cssText = "position:fixed;left:50%;top:22%;transform:translateX(-50%);z-index:1300;background:rgba(20,20,40,.96);border:1.5px solid #60a5fa;border-radius:14px;padding:11px 18px;color:#fff;font-size:13px;font-weight:900;max-width:86%;text-align:center;font-family:'Noto Sans KR',sans-serif;";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.remove(); }, 2400);
  }
  function matPools() {
    var rare = {}, all = {};
    try {
      Object.keys(EXPLORE_MATERIALS).forEach(function (pid) {
        (EXPLORE_MATERIALS[pid].normal || []).forEach(function (n) { all[n] = 1; });
        (EXPLORE_MATERIALS[pid].rare || []).forEach(function (n) { all[n] = 1; rare[n] = 1; });
      });
    } catch (e) {}
    return { all: all, rare: rare };
  }
  // 굿즈 공방의 원석과 같은 방식: 가방 재료 수량을 지켜보다가, 스태미나를 쓴 직후에 재료가 늘면 탐험 중 주운 것으로 보고 판정
  function start() {
    if (window.__sbWatch) return;
    if (typeof bagItems === 'undefined' || typeof EXPLORE_MATERIALS === 'undefined' || typeof stamina === 'undefined' || typeof addToBag !== 'function') { setTimeout(start, 500); return; }
    window.__sbWatch = true;
    var pools = matPools(), prev = {}, lastStam = stamina, lastDrop = 0;
    function snap() {
      var m = {};
      bagItems.forEach(function (i) { if (i && pools.all[i.name] && i.name !== '은빛거미줄') m[i.name] = (m[i.name] || 0) + (Number(i.qty) || 0); });
      return m;
    }
    prev = snap();
    setInterval(function () {
      try {
        var now = Date.now();
        if (stamina < lastStam) lastDrop = now;
        lastStam = stamina;
        var cur = snap(), gain = 0, rareGain = 0;
        Object.keys(cur).forEach(function (n) {
          var d = cur[n] - (prev[n] || 0);
          if (d > 0) { if (pools.rare[n]) rareGain += d; else gain += d; }
        });
        prev = cur;
        if (now - lastDrop > EXPLORE_WINDOW_MS) return;
        var got = 0, i;
        for (i = 0; i < gain; i++) if (Math.random() < BOOK_DROP.normal) got++;
        for (i = 0; i < rareGain; i++) if (Math.random() < BOOK_DROP.rare) got++;
        if (got > 0) {
          if (addToBag(BOOK_EMOJI, BOOK_NAME, 'skillbook', got, BOOK_DESC) !== false) {
            if (typeof exploreCollected !== 'undefined' && exploreCollected.push) exploreCollected.push(BOOK_EMOJI + ' ' + BOOK_NAME);
            toast(BOOK_EMOJI + ' ' + BOOK_NAME + (got > 1 ? ' x' + got : '') + ' 획득!');
            try { if (window.pocaSfx && pocaSfx.play) pocaSfx.play('rarePick'); } catch (e) {}
          }
        }
      } catch (e) {}
    }, 250);
  }
  start();
  window.__skillbook = { BOOK_NAME: BOOK_NAME, BOOK_DROP: BOOK_DROP };
})();
