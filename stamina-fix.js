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
  setInterval(function () {
    var el = document.getElementById('stamina-floating'); if (!el) return;
    el.classList.toggle('sf-hide', overlayOpen());
  }, 400);
})();
