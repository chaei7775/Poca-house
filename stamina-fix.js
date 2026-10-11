// ⚡ 스태미나 박스가 오른쪽 아래 글씨를 가리는 문제 보정
//  · 한 줄짜리 작은 박스로 줄이고, 눌림은 통과시킴(뒤 버튼 클릭 가능)
//  · 팝업/전체화면(오버레이)이 열려 있으면 숨김
(function () {
  'use strict';
  var st = document.createElement('style');
  st.textContent = '#stamina-floating{pointer-events:none!important;padding:3px 8px!important;font-size:10px!important;border-radius:12px!important;opacity:.88;line-height:1.2!important;white-space:nowrap;bottom:96px!important;}' +
    '#stamina-floating br,#stamina-floating span{display:none!important;}' +
    '#stamina-floating.sf-hide{display:none!important;}';
  document.head.appendChild(st);
  function overlayOpen() {
    var kids = document.body.children;
    for (var i = 0; i < kids.length; i++) {
      var k = kids[i];
      if (k.id === 'stamina-floating' || !k.getBoundingClientRect) continue;
      var cs = getComputedStyle(k);
      if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden') continue;
      var z = parseInt(cs.zIndex, 10) || 0;
      var r = k.getBoundingClientRect();
      if (z > 120 && r.width > innerWidth * 0.6 && r.height > innerHeight * 0.5) return true;
    }
    return false;
  }
  // 홈 화면에서는 배너 왼쪽 위에 작은 칩으로 보여준다 (아래 퀘스트 카드를 가리지 않게)
  function homeChip() {
    var banner = document.querySelector('#screen-home .home-banner'); if (!banner) return;
    var chip = document.getElementById('stamina-home-chip');
    if (!chip) {
      chip = document.createElement('div'); chip.id = 'stamina-home-chip';
      chip.style.cssText = 'position:absolute;top:10px;left:10px;z-index:3;padding:7px 11px;border-radius:14px;background:rgba(40,20,70,.72);box-shadow:0 2px 8px #0003;backdrop-filter:blur(4px);color:#fff;font-size:11px;font-weight:900;white-space:nowrap;pointer-events:none;font-family:"Noto Sans KR",sans-serif;';
      banner.appendChild(chip);
    }
    var cur = null, max = 3000;
    try { if (typeof stamina === 'number') cur = Math.floor(stamina); } catch (e) {}
    try { if (typeof STAMINA_MAX === 'number') max = STAMINA_MAX; } catch (e) {}
    if (cur == null) { var v = parseFloat(localStorage.getItem('ph_stamina')); cur = isNaN(v) ? 0 : Math.floor(v); }
    var t = '⚡ ' + cur + '/' + max;
    if (chip.textContent !== t) chip.textContent = t;
  }
  setInterval(function () {
    var el = document.getElementById('stamina-floating'); if (!el) return;
    var home = document.getElementById('screen-home'), onHome = !!(home && home.classList.contains('active'));   // 홈 화면은 아래 퀘스트 카드(모두 받기 등)를 가려서 숨김
    el.classList.toggle('sf-hide', onHome || overlayOpen());
    if (onHome) homeChip();
  }, 400);
})();
